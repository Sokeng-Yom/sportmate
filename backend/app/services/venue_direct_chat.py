import uuid
from uuid import UUID

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models.venue_direct_chat import VenueDirectConversation


def get_or_create_venue_direct_conversation(
    db: Session, owner_id: UUID, host_id: UUID
) -> VenueDirectConversation:
    db.execute(
        pg_insert(VenueDirectConversation)
        .values(id=uuid.uuid4(), owner_id=owner_id, host_id=host_id)
        .on_conflict_do_nothing(index_elements=["owner_id", "host_id"])
    )
    return (
        db.query(VenueDirectConversation)
        .filter(
            VenueDirectConversation.owner_id == owner_id,
            VenueDirectConversation.host_id == host_id,
        )
        .one()
    )
