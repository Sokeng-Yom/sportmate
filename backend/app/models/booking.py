import uuid

from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Index, String, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class Booking(Base):
    """
    Besides the constraints below, the database enforces NO OVERLAPPING CONFIRMED BOOKINGS per
    court with an exclusion constraint (ex_bookings_no_overlap), created in migration
    d33_booking_constraints. It is not declared here because SQLAlchemy cannot express it simply.
    """

    __tablename__ = "bookings"
    __table_args__ = (
        CheckConstraint("end_time > start_time", name="ck_bookings_end_after_start"),
        Index(
            "uq_bookings_one_active_per_match",
            "match_id",
            unique=True,
            postgresql_where=text("status IN ('PENDING', 'CONFIRMED') AND match_id IS NOT NULL"),
        ),
        Index("ix_bookings_court_start", "court_id", "start_time"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    court_id = Column(UUID(as_uuid=True), ForeignKey("courts.id", ondelete="CASCADE"), nullable=False)
    match_id = Column(UUID(as_uuid=True), ForeignKey("matches.id"), nullable=True)
    booked_by = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)
    start_time = Column(DateTime, nullable=False)  # Cambodia wall-clock time, no time zone
    end_time = Column(DateTime, nullable=False)
    status = Column(String, nullable=False, default="PENDING")
    created_at = Column(DateTime, server_default=func.now())
    match = relationship("Match", back_populates="bookings")
