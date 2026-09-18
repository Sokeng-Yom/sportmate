import uuid
from sqlalchemy import Column, String, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID

from app.db.session import Base


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    court_id = Column(UUID(as_uuid=True), ForeignKey("courts.id", ondelete="CASCADE"), nullable=False)
    match_id = Column(UUID(as_uuid=True), ForeignKey("matches.id"), nullable=True)
    booked_by = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    status = Column(String, nullable=False, default="CONFIRMED")
    created_at = Column(DateTime, server_default=func.now())