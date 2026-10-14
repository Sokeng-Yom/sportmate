import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.db.session import Base


class Venue(Base):
    __tablename__ = "venues"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)
    name = Column(String, nullable=False)
    address = Column(String, nullable=False)
    description = Column(String, nullable=True)
    photo_url = Column(String, nullable=True)
    status = Column(String, nullable=False, default="PAYMENT_PENDING")
    # PAYMENT_PENDING -> PENDING_REVIEW -> APPROVED | REJECTED
    rejection_reason = Column(String, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class Court(Base):
    __tablename__ = "courts"
    __table_args__ = (UniqueConstraint("venue_id", "name", name="uq_courts_venue_name"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    venue_id = Column(UUID(as_uuid=True), ForeignKey("venues.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    sport = Column(String, nullable=False)
    availability = Column(JSONB, nullable=True)  # weekly schedule, see schemas/court.py
    created_at = Column(DateTime, server_default=func.now())
