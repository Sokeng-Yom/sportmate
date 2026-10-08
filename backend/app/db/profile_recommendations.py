"""
Times build_recommendations() and counts the SQL statements it runs.
From backend/:  python -m app.db.profile_recommendations
Requires seed data:  python -m app.db.seed_large
"""
import statistics
import time

from sqlalchemy import event, text

from app.db.session import SessionLocal, engine
from app.services.recommendations import build_recommendations

RUNS = 5
SCENARIOS = {
    "no filters": {},
    "sport=Badminton": {"sport": "Badminton"},
    "sport + location": {"sport": "Badminton", "location": "Phnom Penh"},
}


def main() -> None:
    lookup = SessionLocal()
    try:
        user_id = lookup.execute(text("select id from profiles where name = 'Seed User 1'")).scalar()
    finally:
        lookup.close()
    if user_id is None:
        raise SystemExit("No seed users found. Run: python -m app.db.seed_large")
    user_id = str(user_id)

    counter = {"queries": 0}

    @event.listens_for(engine, "before_cursor_execute")
    def _count(conn, cursor, statement, parameters, context, executemany):
        counter["queries"] += 1

    for label, filters in SCENARIOS.items():
        timings = []
        result = {}
        for _ in range(RUNS):
            counter["queries"] = 0
            db = SessionLocal()
            try:
                start = time.perf_counter()
                result = build_recommendations(db, user_id, page=1, page_size=20, **filters)
                timings.append((time.perf_counter() - start) * 1000)
            finally:
                db.close()
        print(
            f"{label:<18} total={result['total']:<4} queries={counter['queries']}  "
            f"median={statistics.median(timings):7.1f} ms  best={min(timings):7.1f} ms"
        )


if __name__ == "__main__":
    main()
