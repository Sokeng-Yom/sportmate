import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, or_
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.core.clock import utc_now_naive
from app.core.deps import require_profile_role
from app.db.session import get_db
from app.models.booking import Booking
from app.models.match import Match
from app.models.profile import Profile
from app.models.venue import Court, Venue
from app.models.venue_direct_chat import (
    VenueDirectConversation,
    VenueDirectMessage,
    VenueDirectReadState,
)
from app.schemas.chat import MessageCreate, MessagePage, MessageRead
from app.schemas.venue_owner_chat import VenueOwnerConversationPage
from app.services.rate_limit import count_recent
from app.services.security_log import log_security_event

owner_router = APIRouter(prefix="/api/v1/venue-owner/messages", tags=["venue owner messages"])
player_router = APIRouter(prefix="/api/v1/player/venue-messages", tags=["venue messages"])

MESSAGE_RATE_LIMIT = 20
MESSAGE_RATE_WINDOW_SECONDS = 60


def _message_read(message: VenueDirectMessage, sender_name: str) -> dict:
    data = MessageRead.model_validate(message).model_dump()
    data["sender_name"] = sender_name
    return data


def _get_participant_conversation(
    db: Session, conversation_id: UUID, profile: Profile, request: Request
) -> VenueDirectConversation:
    conversation = (
        db.query(VenueDirectConversation)
        .filter(VenueDirectConversation.id == conversation_id)
        .first()
    )
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if profile.id not in (conversation.owner_id, conversation.host_id):
        log_security_event(
            db,
            "VENUE_DIRECT_CHAT_ACCESS_DENIED",
            user_id=profile.id,
            request=request,
            details=f"conversation_id={conversation_id}",
        )
        db.commit()
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


def _list_conversations(db: Session, profile: Profile, *, is_owner: bool) -> dict:
    conversations = (
        db.query(VenueDirectConversation)
        .filter(
            VenueDirectConversation.owner_id == profile.id
            if is_owner
            else VenueDirectConversation.host_id == profile.id
        )
        .all()
    )

    items = []
    for conversation in conversations:
        owner = db.query(Profile).filter(Profile.id == conversation.owner_id).first()
        host = db.query(Profile).filter(Profile.id == conversation.host_id).first()
        booking_context = (
            db.query(Venue.name, Court.name)
            .join(Court, Court.venue_id == Venue.id)
            .join(Booking, Booking.court_id == Court.id)
            .join(Match, Match.id == Booking.match_id)
            .filter(
                Venue.owner_id == conversation.owner_id,
                or_(
                    Match.created_by == conversation.host_id,
                    Booking.booked_by == conversation.host_id,
                ),
            )
            .distinct()
            .order_by(Venue.name, Court.name)
            .all()
        )
        last_row = (
            db.query(VenueDirectMessage, Profile.name)
            .join(Profile, Profile.id == VenueDirectMessage.sender_id)
            .filter(VenueDirectMessage.conversation_id == conversation.id)
            .order_by(VenueDirectMessage.created_at.desc(), VenueDirectMessage.id.desc())
            .first()
        )
        read_state = (
            db.query(VenueDirectReadState)
            .filter(
                VenueDirectReadState.conversation_id == conversation.id,
                VenueDirectReadState.user_id == profile.id,
            )
            .first()
        )
        unread_query = db.query(func.count(VenueDirectMessage.id)).filter(
            VenueDirectMessage.conversation_id == conversation.id,
            VenueDirectMessage.sender_id != profile.id,
        )
        if read_state is not None:
            unread_query = unread_query.filter(
                VenueDirectMessage.created_at > read_state.last_read_at
            )

        items.append(
            (
                last_row[0].created_at if last_row is not None else conversation.created_at,
                {
                    "conversation_id": conversation.id,
                    "created_at": conversation.created_at,
                    "owner_id": conversation.owner_id,
                    "owner_name": owner.name if owner else "Venue",
                    "owner_avatar": owner.avatar if owner else None,
                    "host_id": conversation.host_id,
                    "host_name": host.name if host else "Match host",
                    "host_avatar": host.avatar if host else None,
                    "venue_names": sorted({venue_name for venue_name, _ in booking_context}),
                    "court_names": sorted({court_name for _, court_name in booking_context}),
                    "last_message": (
                        _message_read(*last_row) if last_row is not None else None
                    ),
                    "unread_count": unread_query.scalar() or 0,
                },
            )
        )
    items.sort(key=lambda item: item[0], reverse=True)
    return {"items": [item for _, item in items]}


def _list_messages(
    db: Session, conversation: VenueDirectConversation, profile: Profile
) -> dict:
    rows = (
        db.query(VenueDirectMessage, Profile.name)
        .join(Profile, Profile.id == VenueDirectMessage.sender_id)
        .filter(VenueDirectMessage.conversation_id == conversation.id)
        .order_by(VenueDirectMessage.created_at.desc(), VenueDirectMessage.id.desc())
        .limit(101)
        .all()
    )
    has_more = len(rows) > 100
    return {
        "conversation_id": conversation.id,
        "items": [_message_read(message, name) for message, name in reversed(rows[:100])],
        "has_more": has_more,
    }


def _mark_read(db: Session, conversation: VenueDirectConversation, profile: Profile) -> None:
    now = utc_now_naive()
    db.execute(
        pg_insert(VenueDirectReadState)
        .values(conversation_id=conversation.id, user_id=profile.id, last_read_at=now)
        .on_conflict_do_update(
            index_elements=["conversation_id", "user_id"],
            set_={"last_read_at": func.greatest(VenueDirectReadState.last_read_at, now)},
        )
    )
    db.commit()


def _send_message(
    db: Session,
    conversation: VenueDirectConversation,
    profile: Profile,
    payload: MessageCreate,
    request: Request,
) -> dict:
    recent = count_recent(
        db,
        VenueDirectMessage.sender_id,
        VenueDirectMessage.created_at,
        profile.id,
        MESSAGE_RATE_WINDOW_SECONDS,
    )
    if recent >= MESSAGE_RATE_LIMIT:
        log_security_event(
            db,
            "CHAT_RATE_LIMITED",
            user_id=profile.id,
            request=request,
            details=f"conversation_id={conversation.id}",
        )
        db.commit()
        raise HTTPException(
            status_code=429,
            detail="You are sending messages too quickly. Please wait a moment.",
        )

    message = VenueDirectMessage(
        id=uuid.uuid4(),
        conversation_id=conversation.id,
        sender_id=profile.id,
        content=payload.content,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return _message_read(message, profile.name)


@owner_router.get("", response_model=VenueOwnerConversationPage)
def list_owner_conversations(
    profile: Profile = Depends(require_profile_role("VENUE_OWNER", "ADMIN")),
    db: Session = Depends(get_db),
):
    return _list_conversations(db, profile, is_owner=True)


@player_router.get("", response_model=VenueOwnerConversationPage)
def list_player_venue_conversations(
    profile: Profile = Depends(require_profile_role("PLAYER", "ADMIN")),
    db: Session = Depends(get_db),
):
    return _list_conversations(db, profile, is_owner=False)


@owner_router.get("/{conversation_id}/messages", response_model=MessagePage)
def list_owner_messages(
    conversation_id: UUID,
    request: Request,
    profile: Profile = Depends(require_profile_role("VENUE_OWNER", "ADMIN")),
    db: Session = Depends(get_db),
):
    conversation = _get_participant_conversation(db, conversation_id, profile, request)
    if conversation.owner_id != profile.id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return _list_messages(db, conversation, profile)


@player_router.get("/{conversation_id}/messages", response_model=MessagePage)
def list_player_venue_messages(
    conversation_id: UUID,
    request: Request,
    profile: Profile = Depends(require_profile_role("PLAYER", "ADMIN")),
    db: Session = Depends(get_db),
):
    conversation = _get_participant_conversation(db, conversation_id, profile, request)
    if conversation.host_id != profile.id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return _list_messages(db, conversation, profile)


@owner_router.post(
    "/{conversation_id}/messages",
    response_model=MessageRead,
    status_code=status.HTTP_201_CREATED,
)
def send_owner_message(
    conversation_id: UUID,
    payload: MessageCreate,
    request: Request,
    profile: Profile = Depends(require_profile_role("VENUE_OWNER", "ADMIN")),
    db: Session = Depends(get_db),
):
    conversation = _get_participant_conversation(db, conversation_id, profile, request)
    if conversation.owner_id != profile.id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return _send_message(db, conversation, profile, payload, request)


@player_router.post(
    "/{conversation_id}/messages",
    response_model=MessageRead,
    status_code=status.HTTP_201_CREATED,
)
def send_player_venue_message(
    conversation_id: UUID,
    payload: MessageCreate,
    request: Request,
    profile: Profile = Depends(require_profile_role("PLAYER", "ADMIN")),
    db: Session = Depends(get_db),
):
    conversation = _get_participant_conversation(db, conversation_id, profile, request)
    if conversation.host_id != profile.id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return _send_message(db, conversation, profile, payload, request)


@owner_router.post("/{conversation_id}/read")
def mark_owner_messages_read(
    conversation_id: UUID,
    request: Request,
    profile: Profile = Depends(require_profile_role("VENUE_OWNER", "ADMIN")),
    db: Session = Depends(get_db),
):
    conversation = _get_participant_conversation(db, conversation_id, profile, request)
    if conversation.owner_id != profile.id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    _mark_read(db, conversation, profile)
    return {"marked": True}


@player_router.post("/{conversation_id}/read")
def mark_player_venue_messages_read(
    conversation_id: UUID,
    request: Request,
    profile: Profile = Depends(require_profile_role("PLAYER", "ADMIN")),
    db: Session = Depends(get_db),
):
    conversation = _get_participant_conversation(db, conversation_id, profile, request)
    if conversation.host_id != profile.id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    _mark_read(db, conversation, profile)
    return {"marked": True}
