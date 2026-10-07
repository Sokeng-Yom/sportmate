from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user_sport import UserSport
from app.schemas.user_sport import UserSportCreate, UserSportRead, UserSportUpdate

router = APIRouter(prefix="/api/v1/profiles/me/sports", tags=["sports"])


@router.get(
    "",
    response_model=list[UserSportRead],
    summary="List the current user's sports",
)
def list_my_sports(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(UserSport).filter(UserSport.user_id == user["sub"]).all()


@router.post(
    "",
    response_model=UserSportRead,
    status_code=201,
    summary="Add a sport for the current user",
)
def add_my_sport(
    payload: UserSportCreate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = UserSport(user_id=user["sub"], sport=payload.sport, skill_level=payload.skill_level)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.patch(
    "/{sport_id}",
    response_model=UserSportRead,
    summary="Update one of the current user's sports",
)
def update_my_sport(
    sport_id: UUID,
    payload: UserSportUpdate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = db.query(UserSport).filter(
        UserSport.id == sport_id, UserSport.user_id == user["sub"]
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Sport entry not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(entry, key, value)

    db.commit()
    db.refresh(entry)
    return entry


@router.delete(
    "/{sport_id}",
    status_code=204,
    summary="Remove one of the current user's sports",
)
def delete_my_sport(
    sport_id: UUID,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = db.query(UserSport).filter(
        UserSport.id == sport_id, UserSport.user_id == user["sub"]
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Sport entry not found")

    db.delete(entry)
    db.commit()
    return None
