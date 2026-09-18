from sqlalchemy.orm import Session

from app.models.profile import Profile  # see note below
from app.repositories.base import BaseRepository


class ProfileRepository(BaseRepository[Profile]):
    def __init__(self, db: Session):
        super().__init__(Profile, db)