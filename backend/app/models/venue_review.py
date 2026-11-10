import uuid

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID

from app.db.session import Base


class VenueReview(Base):
    __tablename__ = "venue_reviews"
    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_venue_reviews_rating_range"),
        UniqueConstraint("booking_transaction_id", name="uq_venue_reviews_booking_transaction"),
        Index("ix_venue_reviews_venue_created", "venue_id", "created_at"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_transaction_id = Column(
        UUID(as_uuid=True),
        ForeignKey("booking_transactions.id", ondelete="CASCADE"),
        nullable=False,
    )
    venue_id = Column(
        UUID(as_uuid=True), ForeignKey("venues.id", ondelete="CASCADE"), nullable=False
    )
    player_id = Column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False
    )
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
