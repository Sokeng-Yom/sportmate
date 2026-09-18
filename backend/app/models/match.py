import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Date, Time, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID

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
    status = Column(String, nullable=False, default="OPEN")  # OPEN, FULL, READY, CONFIRMED, COMPLETED, CANCELLED
    created_by = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class MatchPlayer(Base):
    __tablename__ = "match_players"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id = Column(UUID(as_uuid=True), ForeignKey("matches.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)
    joined_at = Column(DateTime, server_default=func.now())