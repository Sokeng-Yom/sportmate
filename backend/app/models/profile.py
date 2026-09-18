from sqlalchemy import Column, String, DateTime, CheckConstraint, func
from sqlalchemy.dialects.postgresql import UUID

from app.db.session import Base


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
    )
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    avatar = Column(String, nullable=True)
    restricted_until = Column(DateTime(timezone=True), nullable=True)
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "role IN ('PLAYER', 'VENUE_OWNER', 'ADMIN')",
            name="profiles_role_check",
        ),
    )