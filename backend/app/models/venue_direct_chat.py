import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Index, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID

from app.db.session import Base


class VenueDirectConversation(Base):
    __tablename__ = "venue_direct_conversations"
    __table_args__ = (
        UniqueConstraint("owner_id", "host_id", name="uq_venue_direct_conversations_pair"),
        Index("ix_venue_direct_conversations_host", "host_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    host_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class VenueDirectMessage(Base):
    __tablename__ = "venue_direct_messages"
    __table_args__ = (
        Index("ix_venue_direct_messages_conversation_created", "conversation_id", "created_at"),
        Index("ix_venue_direct_messages_sender_created", "sender_id", "created_at"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("venue_direct_conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    sender_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    content = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class VenueDirectReadState(Base):
    __tablename__ = "venue_direct_read_states"

    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("venue_direct_conversations.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        primary_key=True,
    )
    last_read_at = Column(DateTime, nullable=False)
