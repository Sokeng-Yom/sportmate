r"""
Realistic data for matchmaking / pagination testing.

From backend/ with the venv active:
    python -m app.db.seed_large           # wipe old seed data, then create fresh data
    python -m app.db.seed_large --reset   # only wipe

Seed users: seed-user-1@example.com ... (password: SeedPassword123!)
"""
import argparse
import random
import time
import uuid
from datetime import time as dtime
from datetime import timedelta

import httpx

from app.core.clock import utc_now_naive
from app.core.config import settings
from app.db.session import SessionLocal
from app.db.user_purge import find_user_ids_by_email_regex, purge_users
from app.models.match import Match, MatchPlayer
from app.models.match_leave import MatchLeave
from app.models.profile import Profile
from app.models.user_sport import UserSport

SEED_EMAIL_REGEX = r"^seed-user-[0-9]+@example\.com$"
SEED_PASSWORD = "SeedPassword123!"
NUM_USERS = 20
NUM_UPCOMING_MATCHES = 300
NUM_PAST_MATCHES = 15
NUM_CANCELLED_MATCHES = 10
NUM_LEAVES = 40

SPORTS = ["Badminton", "Tennis", "Football", "Basketball", "Volleyball", "Table Tennis"]
LOCATIONS = [
    "Phnom Penh, Riverside",
    "Phnom Penh, BKK1",
    "Phnom Penh, Toul Kork",
    "Siem Reap",
    "Sihanoukville",
]
LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"]
LEAVE_TIERS = [("NORMAL", 30.0), ("NORMAL", 48.0), ("WARNING", 10.0), ("HIGH_RISK", 3.0), ("CRITICAL", 1.0)]


def create_seed_users() -> list[str]:
    key = settings.supabase_service_role_key
    headers = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    ids = []
    with httpx.Client(
        base_url=f"{settings.supabase_url}/auth/v1/admin", headers=headers, timeout=15
    ) as client:
        for i in range(1, NUM_USERS + 1):
            response = client.post(
                "/users",
                json={
                    "email": f"seed-user-{i}@example.com",
                    "password": SEED_PASSWORD,
                    "email_confirm": True,
                    "user_metadata": {"name": f"Seed User {i}", "role": "PLAYER"},
                },
            )
            response.raise_for_status()
            ids.append(response.json()["id"])
    return ids


def wait_for_profiles(user_ids: list[str]) -> None:
    for _ in range(30):
        db = SessionLocal()
        try:
            found = db.query(Profile).filter(Profile.id.in_(user_ids)).count()
        finally:
            db.close()
        if found == len(user_ids):
            return
        time.sleep(0.3)
    raise RuntimeError("The signup trigger did not create all profiles in time")


def seed_data(user_ids: list[str]) -> None:
    rng = random.Random(42)  # same data every run
    today = utc_now_naive().date()
    db = SessionLocal()
    try:
        for user_id in user_ids:
            for sport in rng.sample(SPORTS, rng.randint(1, 3)):
                db.add(UserSport(id=uuid.uuid4(), user_id=user_id, sport=sport, skill_level=rng.choice(LEVELS)))

        matches = []

        def make_match(day_offset: int, status: str) -> Match:
            match = Match(
                id=uuid.uuid4(),
                sport=rng.choice(SPORTS),
                location=rng.choice(LOCATIONS),
                date=today + timedelta(days=day_offset),
                time=dtime(rng.randint(6, 21), rng.choice([0, 30])),
                players_needed=rng.choice([2, 2, 4, 4, 6, 8]),
                skill_level=rng.choice(LEVELS),
                status=status,
                created_by=rng.choice(user_ids),
            )
            db.add(match)
            matches.append(match)
            return match

        for _ in range(NUM_UPCOMING_MATCHES):
            match = make_match(rng.randint(0, 30), "OPEN")
            others = [u for u in user_ids if u != str(match.created_by)]
            joined = min(rng.choice([0, 0, 1, 1, 2, match.players_needed]), match.players_needed, len(others))
            for user_id in rng.sample(others, joined):
                db.add(MatchPlayer(id=uuid.uuid4(), match_id=match.id, user_id=user_id))
            if joined >= match.players_needed:
                match.status = "FULL"

        for _ in range(NUM_PAST_MATCHES):  # stale OPEN matches that must never be recommended
            make_match(-rng.randint(1, 10), "OPEN")
        for _ in range(NUM_CANCELLED_MATCHES):
            make_match(rng.randint(0, 30), "CANCELLED")

        for _ in range(NUM_LEAVES):
            risk, hours = rng.choice(LEAVE_TIERS)
            db.add(
                MatchLeave(
                    id=uuid.uuid4(),
                    match_id=rng.choice(matches).id,
                    user_id=rng.choice(user_ids),
                    hours_before_match=hours,
                    risk_level=risk,
                )
            )
        db.commit()
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed realistic matchmaking data.")
    parser.add_argument("--reset", action="store_true", help="only remove seed data")
    args = parser.parse_args()

    existing = find_user_ids_by_email_regex(SEED_EMAIL_REGEX)
    if existing:
        print(f"Removing {len(existing)} existing seed user(s) and their data...")
        purge_users(existing)
    if args.reset:
        print("Seed data removed.")
        return

    print(f"Creating {NUM_USERS} seed users...")
    user_ids = create_seed_users()
    wait_for_profiles(user_ids)
    print("Creating matches, sports and leave history...")
    seed_data(user_ids)
    print(
        f"Done: {NUM_UPCOMING_MATCHES} upcoming + {NUM_PAST_MATCHES} past + "
        f"{NUM_CANCELLED_MATCHES} cancelled matches."
    )


if __name__ == "__main__":
    main()
