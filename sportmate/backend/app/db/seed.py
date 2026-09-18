import uuid
from datetime import date, time, datetime, timedelta

from app.db.session import SessionLocal
from app.models.user_sport import UserSport
from app.models.match import Match, MatchPlayer
from app.models.venue import Venue, Court

# Replace these with real profiles.id values from your Supabase Table Editor
PLAYER_1_ID = "REPLACE-ME"
PLAYER_2_ID = "REPLACE-ME"
VENUE_OWNER_ID = "REPLACE-ME"


def run():
    db = SessionLocal()

    # Sports
    db.add(UserSport(id=uuid.uuid4(), user_id=PLAYER_1_ID, sport="Badminton", skill_level="INTERMEDIATE"))
    db.add(UserSport(id=uuid.uuid4(), user_id=PLAYER_2_ID, sport="Badminton", skill_level="ADVANCED"))

    # Match
    match = Match(
        id=uuid.uuid4(),
        sport="Badminton",
        location="Phnom Penh",
        date=date.today() + timedelta(days=2),
        time=time(19, 0),
        players_needed=4,
        skill_level="INTERMEDIATE",
        status="OPEN",
        created_by=PLAYER_1_ID,
    )
    db.add(match)
    db.flush()  # get match.id before committing
    db.add(MatchPlayer(id=uuid.uuid4(), match_id=match.id, user_id=PLAYER_1_ID))

    # Venue + Court
    venue = Venue(
        id=uuid.uuid4(),
        owner_id=VENUE_OWNER_ID,
        name="Central Sports Hall",
        address="123 Main St, Phnom Penh",
        status="APPROVED",
    )
    db.add(venue)
    db.flush()
    db.add(Court(id=uuid.uuid4(), venue_id=venue.id, name="Court 1", sport="Badminton"))

    db.commit()
    print("Seed data inserted successfully.")


if __name__ == "__main__":
    run()