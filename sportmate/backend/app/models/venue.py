import uuid
from sqlalchemy import Column, String, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID

from app.db.session import Base


class Venue(Base):
    __tablename__ = "venues"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)
    name = Column(String, nullable=False)
    address = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, nullable=False, default="PAYMENT_PENDING")
    # PAYMENT_PENDING, PENDING_REVIEW, APPROVED, REJECTED
    created_at = Column(DateTime, server_default=func.now())


class Court(Base):
    __tablename__ = "courts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    venue_id = Column(UUID(as_uuid=True), ForeignKey("venues.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    sport = Column(String, nullable=False)
    availability = Column(String, nullable=True)  # simple text/JSON for now, refine later
    created_at = Column(DateTime, server_default=func.now())