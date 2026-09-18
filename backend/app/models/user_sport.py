import uuid
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.db.session import Base


class UserSport(Base):
    __tablename__ = "user_sports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    sport = Column(String, nullable=False)
    skill_level = Column(String, nullable=False)  # BEGINNER, INTERMEDIATE, ADVANCED