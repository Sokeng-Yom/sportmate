import uuid

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    func,
    text,
)
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
        Index("ix_bookings_court_start", "court_id", "start_time"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    court_id = Column(
        UUID(as_uuid=True), ForeignKey("courts.id", ondelete="CASCADE"), nullable=False
    )
    match_id = Column(UUID(as_uuid=True), ForeignKey("matches.id"), nullable=True)
    booked_by = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)
    start_time = Column(DateTime, nullable=False)  # Cambodia wall-clock time, no time zone
    end_time = Column(DateTime, nullable=False)
    status = Column(String, nullable=False, default="PENDING")
    transaction_id = Column(
        UUID(as_uuid=True), ForeignKey("booking_transactions.id"), nullable=True, index=True
    )
    price_per_hour = Column(Numeric(10, 2), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    match = relationship("Match", back_populates="bookings")
    transaction = relationship("BookingTransaction", back_populates="bookings")


class BookingTransaction(Base):
    __tablename__ = "booking_transactions"
    __table_args__ = (
        CheckConstraint("end_time > start_time", name="ck_booking_transactions_end_after_start"),
        Index(
            "uq_booking_transactions_one_active_per_match",
            "match_id",
            unique=True,
            postgresql_where=text("status IN ('PENDING', 'CONFIRMED') AND match_id IS NOT NULL"),
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id = Column(
        UUID(as_uuid=True), ForeignKey("matches.id", ondelete="CASCADE"), nullable=False
    )
    booked_by = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)
    promo_discount_id = Column(
        UUID(as_uuid=True), ForeignKey("venue_discounts.id", ondelete="SET NULL"), nullable=True
    )
    promo_code = Column(String(50), nullable=True)
    duration_minutes = Column(Integer, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    original_total = Column(Numeric(10, 2), nullable=False)
    discount_amount = Column(Numeric(10, 2), nullable=False, default=0)
    final_total = Column(Numeric(10, 2), nullable=False)
    status = Column(String, nullable=False, default="PENDING")
    created_at = Column(DateTime, server_default=func.now())
    bookings = relationship(
        "Booking", back_populates="transaction", order_by="Booking.created_at, Booking.id"
    )
