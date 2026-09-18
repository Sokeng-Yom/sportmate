import uuid
from sqlalchemy import Column, String, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID

from app.db.session import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)
    type = Column(String, nullable=False)
    payload = Column(String, nullable=True)  # JSON-as-text for now; can move to JSONB later
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class SecurityLog(Base):
    __tablename__ = "security_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=True)
    action = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())