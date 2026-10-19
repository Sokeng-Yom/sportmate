import uuid
from uuid import UUID

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models.chat import Conversation


def get_or_create_conversation(db: Session, match_id: UUID) -> Conversation:
    """
    Safe when two people open a brand-new chat at the same moment: the unique constraint on
    conversations.match_id plus ON CONFLICT DO NOTHING means exactly one row is ever created.
    """
    conversation = db.query(Conversation).filter(Conversation.match_id == match_id).first()
    if conversation is None:
        db.execute(
            pg_insert(Conversation)
            .values(id=uuid.uuid4(), match_id=match_id)
            .on_conflict_do_nothing(index_elements=["match_id"])
        )
        db.commit()
        conversation = db.query(Conversation).filter(Conversation.match_id == match_id).one()
    return conversation
