r"""
Deletes users AND everything that references them, then removes the Supabase auth accounts.

Supabase answers HTTP 500 when an auth user is deleted while rows still point at its profile,
so dependent rows go first, in foreign-key order. Tables that do not exist yet are skipped.

CLI, from backend/ with the venv active:
    python -m app.db.user_purge --email-regex '^test-[0-9a-f]{10}@example\.com$'
    python -m app.db.user_purge --email-regex '^seed-user-[0-9]+@example\.com$'
"""
import argparse
from concurrent.futures import ThreadPoolExecutor

import httpx
from sqlalchemy import text

from app.core.config import settings
from app.db.session import SessionLocal

_IDS = "any(cast(:ids as uuid[]))"
_OWNED_MATCHES = f"select id from matches where created_by = {_IDS}"
_OWNED_COURTS = f"select c.id from courts c join venues v on v.id = c.venue_id where v.owner_id = {_IDS}"
_OWNED_POSTS = f"select id from posts where author_id = {_IDS}"

# (table, statement) in deletion order. Courts, conversations and match children are removed
# by ON DELETE CASCADE when their venue / match is deleted.
_STEPS = [
    ("notifications", f"delete from notifications where user_id = {_IDS}"),
    ("security_logs", f"delete from security_logs where user_id = {_IDS}"),
    ("post_reports", f"delete from post_reports where reporter_id = {_IDS} or post_id in ({_OWNED_POSTS})"),
    ("post_likes", f"delete from post_likes where user_id = {_IDS} or post_id in ({_OWNED_POSTS})"),
    ("comments", f"delete from comments where author_id = {_IDS} or post_id in ({_OWNED_POSTS})"),
    ("posts", f"delete from posts where author_id = {_IDS}"),
    ("messages", f"delete from messages where sender_id = {_IDS}"),
    ("conversation_members", f"delete from conversation_members where user_id = {_IDS}"),
    (
        "bookings",
        f"delete from bookings where booked_by = {_IDS} "
        f"or match_id in ({_OWNED_MATCHES}) or court_id in ({_OWNED_COURTS})",
    ),
    ("venues", f"delete from venues where owner_id = {_IDS}"),
    ("waiting_list", f"delete from waiting_list where user_id = {_IDS} or match_id in ({_OWNED_MATCHES})"),
    ("match_leaves", f"delete from match_leaves where user_id = {_IDS} or match_id in ({_OWNED_MATCHES})"),
    ("match_players", f"delete from match_players where user_id = {_IDS} or match_id in ({_OWNED_MATCHES})"),
    ("matches", f"delete from matches where created_by = {_IDS}"),
    ("user_sports", f"delete from user_sports where user_id = {_IDS}"),
]

_TABLE_CACHE: set[str] | None = None


def _existing_tables(db) -> set[str]:
    """Which of our tables exist: one query per process, not one per table per test."""
    global _TABLE_CACHE
    if _TABLE_CACHE is None:
        rows = db.execute(
            text("select tablename from pg_tables where schemaname = 'public' and tablename = any(:names)"),
            {"names": [table for table, _ in _STEPS]},
        ).scalars().all()
        _TABLE_CACHE = set(rows)
    return _TABLE_CACHE


def _delete_auth_users(user_ids: list[str]) -> None:
    key = settings.supabase_service_role_key
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    with httpx.Client(
        base_url=f"{settings.supabase_url}/auth/v1/admin", headers=headers, timeout=15
    ) as client:

        def delete(user_id):
            response = client.delete(f"/users/{user_id}")
            if response.status_code not in (200, 204, 404):
                print(f"  could not delete auth user {user_id}: HTTP {response.status_code}")

        with ThreadPoolExecutor(max_workers=6) as pool:
            list(pool.map(delete, user_ids))


def purge_users(user_ids) -> None:
    ids = [str(user_id) for user_id in user_ids]
    if not ids:
        return
    db = SessionLocal()
    try:
        existing = _existing_tables(db)
        for table, statement in _STEPS:
            if table in existing:
                db.execute(text(statement), {"ids": ids})
        db.commit()
    finally:
        db.close()
    _delete_auth_users(ids)


def find_user_ids_by_email_regex(regex: str) -> list[str]:
    db = SessionLocal()
    try:
        rows = db.execute(
            text("select cast(id as text) from auth.users where email ~ :regex"),
            {"regex": regex},
        ).all()
    finally:
        db.close()
    return [row[0] for row in rows]


def main() -> None:
    parser = argparse.ArgumentParser(description="Delete users matching an email regex, with their data.")
    parser.add_argument("--email-regex", required=True)
    args = parser.parse_args()

    ids = find_user_ids_by_email_regex(args.email_regex)
    print(f"Purging {len(ids)} user(s)...")
    purge_users(ids)
    print("Done.")


if __name__ == "__main__":
    main()
