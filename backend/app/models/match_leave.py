import uuid
from sqlalchemy import Column, String, Float, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID

from app.db.session import Base


class MatchLeave(Base):
    __tablename__ = "match_leaves"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id = Column(UUID(as_uuid=True), ForeignKey("matches.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)
    left_at = Column(DateTime, server_default=func.now())
    hours_before_match = Column(Float, nullable=False)
    risk_level = Column(String, nullable=False)  # NORMAL, WARNING, HIGH_RISK, CRITICAL
    reason = Column(String, nullable=True)