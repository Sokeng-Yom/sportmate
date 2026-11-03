import uuid

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Time,
    func,
)
from sqlalchemy.dialects.postgresql import UUID

from app.db.session import Base


class VenueDiscount(Base):
    __tablename__ = "venue_discounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    venue_id = Column(
        UUID(as_uuid=True), ForeignKey("venues.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title = Column(String(120), nullable=False)
    description = Column(Text, nullable=False)
    percent_off = Column(Integer, nullable=True)
    amount_off = Column(Numeric(10, 2), nullable=True)
    code = Column(String(50), nullable=True)
    valid_until = Column(Date, nullable=False)
    active = Column(Boolean, nullable=False, default=True, server_default="true")
    usage_limit = Column(Integer, nullable=True)
    usage_count = Column(Integer, nullable=False, default=0, server_default="0")
    created_at = Column(DateTime, server_default=func.now())


class VenueEvent(Base):
    __tablename__ = "venue_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    venue_id = Column(
        UUID(as_uuid=True), ForeignKey("venues.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title = Column(String(120), nullable=False)
    description = Column(Text, nullable=False)
    event_date = Column(Date, nullable=False)
    event_time = Column(Time, nullable=False)
    sport = Column(String(80), nullable=False)
    price_label = Column(String(80), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
