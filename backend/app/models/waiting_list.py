import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID

from app.db.session import Base


class WaitingList(Base):
    __tablename__ = "waiting_list"
    __table_args__ = (
        UniqueConstraint("match_id", "user_id", name="uq_waiting_list_match_user"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id = Column(UUID(as_uuid=True), ForeignKey("matches.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)
    position = Column(Integer, nullable=False)
    status = Column(String, nullable=False, default="WAITING")  # WAITING, NOTIFIED, ACCEPTED, EXPIRED
    notified_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
