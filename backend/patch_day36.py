from pathlib import Path

PATCHES = {
    "app/api/v1/matches.py": [
        ('''from app.services.recommendations import build_recommendations
''', '''from app.services.booking_cleanup import cancel_booking_for_match
from app.services.recommendations import build_recommendations
'''),
        ('''    if not entry:
        raise HTTPException(status_code=400, detail="You are not part of this match")
''', '''    if not entry:
        raise HTTPException(status_code=400, detail="You are not part of this match")
    if match.status in (MatchStatus.CANCELLED, MatchStatus.COMPLETED):
        raise HTTPException(status_code=400, detail="This match is closed, so there is nothing to leave")
'''),
        ('''    if not is_participant:
        raise HTTPException(status_code=400, detail="You are not part of this match")
''', '''    if not is_participant:
        raise HTTPException(status_code=400, detail="You are not part of this match")
    if match.status in (MatchStatus.CANCELLED, MatchStatus.COMPLETED):
        raise HTTPException(status_code=400, detail="This match is closed")
'''),
        ('''    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if str(match.created_by) != user["sub"]:
''', '''    match = db.query(Match).filter(Match.id == match_id).with_for_update().first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if str(match.created_by) != user["sub"]:
'''),
        ('''    match.status = MatchStatus.CANCELLED
    db.commit()
    db.refresh(match)
    return match
''', '''    if match.status in (MatchStatus.CANCELLED, MatchStatus.COMPLETED):
        raise HTTPException(status_code=400, detail=f"A {match.status} match cannot be cancelled")

    match.status = MatchStatus.CANCELLED
    cancel_booking_for_match(db, match)  # frees the booked court and tells the players
    db.commit()
    db.refresh(match)
    return match
'''),
    ],
    "app/api/v1/waiting_list.py": [
        ('''    match = db.query(Match).filter(Match.id == entry.match_id).with_for_update().first()
    joined = count_joined(db, entry.match_id)
''', '''    match = db.query(Match).filter(Match.id == entry.match_id).with_for_update().first()
    if match.status not in (MatchStatus.OPEN, MatchStatus.FULL, MatchStatus.CONFIRMED):
        raise HTTPException(status_code=400, detail="This match is closed")
    joined = count_joined(db, entry.match_id)
'''),
    ],
    "app/core/deps.py": [
        ('''        raise HTTPException(status_code=404, detail="Profile not found")
''', '''        raise HTTPException(status_code=401, detail="Account not found")
'''),
    ],
    "app/schemas/match.py": [
        ('''        if v < 1:
            raise ValueError("players_needed must be at least 1")
        return v
''', '''        if v < 1:
            raise ValueError("players_needed must be at least 1")
        if v > 50:
            raise ValueError("players_needed cannot be more than 50")
        return v
'''),
    ],
    "app/schemas/profile.py": [
        ('''from pydantic import BaseModel, ConfigDict
''', '''from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints

ProfileName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]
AvatarUrl = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]
'''),
        ('''class ProfileUpdate(BaseModel):
    name: str | None = None
    avatar: str | None = None
''', '''class ProfileUpdate(BaseModel):
    name: ProfileName | None = None
    avatar: AvatarUrl | None = None
'''),
    ],
    "app/api/v1/profiles.py": [
        ('''    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
''', '''    update_data = payload.model_dump(exclude_unset=True)
    if update_data.get("name") is None:
        update_data.pop("name", None)  # name is required: null means "leave unchanged"
    for key, value in update_data.items():
'''),
    ],
}

failed = []
for filename, pairs in PATCHES.items():
    path = Path(filename)
    if not path.exists():
        failed.append(f"{filename}: file not found")
        continue
    text = path.read_text(encoding="utf-8")
    bad = [old for old, _ in pairs if text.count(old) != 1]
    if bad:
        failed.append(f"{filename}: a replacement did not match exactly once. The first one was:\n{bad[0]}")
        continue
    for old, new in pairs:
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")
    print("patched", filename)

if failed:
    print("\nSKIPPED (paste this to me):\n" + "\n\n".join(failed))
    raise SystemExit(1)
