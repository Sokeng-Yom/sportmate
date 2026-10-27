import uuid
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import and_, func, or_
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.core.clock import utc_now_naive
from app.core.deps import get_current_profile
from app.core.enums import MatchStatus
from app.db.session import get_db
from app.models.chat import Conversation, ConversationReadState, Message
from app.models.match import Match, MatchPlayer
from app.models.profile import Profile
from app.schemas.chat import ChatInfo, MessageCreate, MessagePage, MessageRead
from app.services.chat import get_or_create_conversation
from app.services.match_participants import is_match_participant, participant_ids
from app.services.rate_limit import count_recent
from app.services.security_log import log_security_event

router = APIRouter(prefix="/api/v1/matches", tags=["chat"])

MESSAGE_RATE_LIMIT = 20  # messages ...
MESSAGE_RATE_WINDOW_SECONDS = 60  # ... per user per minute
CLOSED_STATUSES = (MatchStatus.CANCELLED, MatchStatus.COMPLETED)


def _participant_match(db: Session, match_id: UUID, profile: Profile, request: Request) -> Match:
    match = db.query(Match).filter(Match.id == match_id).first()
    if match is None:
        raise HTTPException(status_code=404, detail="Match not found")
    if not is_match_participant(db, match, profile.id):
        log_security_event(
            db, "CHAT_ACCESS_DENIED", user_id=profile.id, request=request, details=f"match_id={match_id}"
        )
        db.commit()
        raise HTTPException(status_code=403, detail="Only participants of this match can use its chat")
    return match


def _message_read(message: Message, sender_name: str) -> dict:
    data = MessageRead.model_validate(message).model_dump()
    data["sender_name"] = sender_name
    return data


@router.get("/chat/unread-count", summary="Count unread incoming messages for the current user")
def unread_message_count(
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    is_participant = or_(
        Match.created_by == profile.id,
        db.query(MatchPlayer.id)
        .filter(MatchPlayer.match_id == Match.id, MatchPlayer.user_id == profile.id)
        .exists(),
    )
    count = (
        db.query(func.count(Message.id))
        .join(Conversation, Conversation.id == Message.conversation_id)
        .join(Match, Match.id == Conversation.match_id)
        .outerjoin(
            ConversationReadState,
            and_(
                ConversationReadState.conversation_id == Conversation.id,
                ConversationReadState.user_id == profile.id,
            ),
        )
        .filter(
            Message.sender_id != profile.id,
            is_participant,
            or_(
                ConversationReadState.last_read_at.is_(None),
                Message.created_at > ConversationReadState.last_read_at,
            ),
        )
        .scalar()
    )
    return {"unread_count": count or 0}


@router.post("/{match_id}/chat/read", summary="Mark incoming messages in a match chat as read")
def mark_chat_read(
    match_id: UUID,
    request: Request,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    _participant_match(db, match_id, profile, request)
    conversation = get_or_create_conversation(db, match_id)
    now = utc_now_naive()
    db.execute(
        pg_insert(ConversationReadState)
        .values(conversation_id=conversation.id, user_id=profile.id, last_read_at=now)
        .on_conflict_do_update(
            index_elements=["conversation_id", "user_id"],
            set_={"last_read_at": func.greatest(ConversationReadState.last_read_at, now)},
        )
    )
    db.commit()
    return {"marked": True}


@router.get(
    "/{match_id}/chat",
    response_model=ChatInfo,
    summary="Open a match's chat: conversation id (for Realtime) and member names",
)
def open_chat(
    match_id: UUID,
    request: Request,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    match = _participant_match(db, match_id, profile, request)
    created_by = match.created_by
    conversation = get_or_create_conversation(db, match_id)

    people = (
        db.query(Profile)
        .filter(Profile.id.in_(participant_ids(db, match)))
        .order_by(Profile.name, Profile.id)
        .all()
    )
    members = [
        {"user_id": p.id, "name": p.name, "avatar": p.avatar, "is_creator": p.id == created_by}
        for p in people
    ]
    return {"conversation_id": conversation.id, "match_id": match_id, "members": members}


@router.get(
    "/{match_id}/messages",
    response_model=MessagePage,
    summary="Read a match's chat history, newest page first (participants only)",
)
def list_messages(
    match_id: UUID,
    request: Request,
    before: datetime | None = None,
    limit: int = Query(50, ge=1, le=100),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    _participant_match(db, match_id, profile, request)
    conversation = get_or_create_conversation(db, match_id)

    query = (
        db.query(Message, Profile.name)
        .join(Profile, Profile.id == Message.sender_id)
        .filter(Message.conversation_id == conversation.id)
    )
    if before is not None:
        query = query.filter(Message.created_at < before)
    rows = query.order_by(Message.created_at.desc(), Message.id.desc()).limit(limit + 1).all()

    has_more = len(rows) > limit
    page = list(reversed(rows[:limit]))  # oldest first
    return {
        "conversation_id": conversation.id,
        "items": [_message_read(message, name) for message, name in page],
        "has_more": has_more,
    }


@router.post(
    "/{match_id}/messages",
    response_model=MessageRead,
    status_code=201,
    summary="Send a message (participants only). Delivery to others happens via Supabase Realtime.",
)
def send_message(
    match_id: UUID,
    payload: MessageCreate,
    request: Request,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    match = _participant_match(db, match_id, profile, request)
    if match.status in CLOSED_STATUSES:
        raise HTTPException(status_code=400, detail="This chat is closed because the match was cancelled or completed")

    recent = count_recent(db, Message.sender_id, Message.created_at, profile.id, MESSAGE_RATE_WINDOW_SECONDS)
    if recent >= MESSAGE_RATE_LIMIT:
        log_security_event(
            db, "CHAT_RATE_LIMITED", user_id=profile.id, request=request, details=f"match_id={match_id}"
        )
        db.commit()
        raise HTTPException(status_code=429, detail="You are sending messages too quickly. Please wait a moment.")

    conversation = get_or_create_conversation(db, match_id)
    message = Message(
        id=uuid.uuid4(),
        conversation_id=conversation.id,
        sender_id=profile.id,
        content=payload.content,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return _message_read(message, profile.name)
