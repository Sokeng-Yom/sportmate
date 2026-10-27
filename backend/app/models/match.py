import uuid

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class Match(Base):
    __tablename__ = "matches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sport = Column(String, nullable=False)
    location = Column(String, nullable=False)
    date = Column(Date, nullable=False)
    time = Column(Time, nullable=False)
    players_needed = Column(Integer, nullable=False)
    skill_level = Column(String, nullable=False)
    status = Column(String, nullable=False, default="OPEN")
    court_id = Column(UUID(as_uuid=True), ForeignKey("courts.id", ondelete="SET NULL"), nullable=True)
    court_duration_minutes = Column(Integer, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    players = relationship("MatchPlayer", back_populates="match", cascade="all, delete-orphan")
    creator = relationship("Profile", foreign_keys=[created_by])
    court = relationship("Court", foreign_keys=[court_id])
    bookings = relationship(
        "Booking",
        back_populates="match",
        order_by="(Booking.created_at.desc(), Booking.id.desc())",
    )

    @property
    def court_name(self):
        return self.court.name if self.court else None

    @property
    def venue_id(self):
        return self.court.venue_id if self.court else None

    @property
    def venue_name(self):
        return self.court.venue.name if self.court and self.court.venue else None

    @property
    def court_booking_status(self):
        if self.court_id is None:
            return None
        return self.bookings[0].status if self.bookings else "AVAILABLE"

    @property
    def host_name(self):
        return self.creator.name if self.creator else None


class MatchPlayer(Base):
    __tablename__ = "match_players"
    __table_args__ = (
        UniqueConstraint("match_id", "user_id", name="uq_match_players_match_user"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id = Column(UUID(as_uuid=True), ForeignKey("matches.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)
    joined_at = Column(DateTime, server_default=func.now())

    match = relationship("Match", back_populates="players")
