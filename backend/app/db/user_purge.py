r"""
Deletes users AND everything that references them, then removes the Supabase
auth accounts.

Supabase answers HTTP 500 when an auth user is deleted while rows still point
at its profile (matches, match_players, ...), so dependent rows go first, in
foreign-key order. Extend _DELETES when later weeks add tables that reference
profiles (bookings, messages, posts, notifications, ...).

CLI, from backend/ with the venv active:
    python -m app.db.user_purge --email-regex '^test-[0-9a-f]{10}@example\.com$'
    python -m app.db.user_purge --email-regex '^seed-user-[0-9]+@example\.com$'
"""
import argparse

import httpx
from sqlalchemy import text

from app.core.config import settings
from app.db.session import SessionLocal

_IDS = "any(cast(:ids as uuid[]))"
_OWNED_MATCHES = f"select id from matches where created_by = {_IDS}"

_DELETES = [
    f"delete from waiting_list where user_id = {_IDS} or match_id in ({_OWNED_MATCHES})",
    f"delete from match_leaves where user_id = {_IDS} or match_id in ({_OWNED_MATCHES})",
    f"delete from match_players where user_id = {_IDS} or match_id in ({_OWNED_MATCHES})",
    f"delete from matches where created_by = {_IDS}",
    f"delete from user_sports where user_id = {_IDS}",
]


def _delete_auth_users(user_ids: list[str]) -> None:
    key = settings.supabase_service_role_key
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    with httpx.Client(
        base_url=f"{settings.supabase_url}/auth/v1/admin", headers=headers, timeout=15
    ) as client:
        for user_id in user_ids:
            response = client.delete(f"/users/{user_id}")
            if response.status_code not in (200, 204, 404):
                print(f"  could not delete auth user {user_id}: HTTP {response.status_code}")


def purge_users(user_ids) -> None:
    ids = [str(user_id) for user_id in user_ids]
    if not ids:
        return
    db = SessionLocal()
    try:
        for statement in _DELETES:
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
