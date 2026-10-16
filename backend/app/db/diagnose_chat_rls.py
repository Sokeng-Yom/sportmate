"""
Explains why Supabase's Data API returns no chat rows for a match participant.
Run from backend/:   python -m app.db.diagnose_chat_rls
Inserts a throwaway match + conversation + message, simulates what PostgREST does for a
signed-in user (role `authenticated` + JWT claims), and ROLLS EVERYTHING BACK.
"""
import json
import uuid
from urllib.parse import urlparse

from sqlalchemy import text

from app.core.config import settings
from app.db.session import SessionLocal


def as_user(db, user_id: str, sql: str, params: dict):
    """Runs one query as the given signed-in user. Returns the value or 'ERROR: ...'."""
    try:
        with db.begin_nested():
            db.execute(
                text("select set_config('request.jwt.claims', :c, true)"),
                {"c": json.dumps({"sub": user_id, "role": "authenticated"})},
            )
            db.execute(text("set local role authenticated"))
            value = db.execute(text(sql), params).scalar()
            db.execute(text("reset role"))
        return value
    except Exception as exc:
        return "ERROR: " + str(exc).strip().splitlines()[0]


def main() -> None:
    db = SessionLocal()
    try:
        print("SUPABASE_URL project :", urlparse(settings.supabase_url).hostname.split(".")[0])
        print("DATABASE_URL user    :", urlparse(settings.database_url).username, "(should be postgres.<same project>)")

        rls = db.execute(
            text("select relrowsecurity, relforcerowsecurity from pg_class where oid = 'public.messages'::regclass")
        ).one()
        print("\nRLS on messages (enabled, forced):", tuple(rls))

        print("Policies on messages:")
        policies = db.execute(
            text(
                "select policyname, cmd, roles::text, qual from pg_policies "
                "where schemaname = 'public' and tablename = 'messages'"
            )
        ).all()
        for row in policies:
            print("  ", tuple(row))
        if not policies:
            print("   NONE")

        functions = db.execute(
            text(
                "select proname, prosecdef, pg_get_userbyid(proowner) from pg_proc p "
                "join pg_namespace n on n.oid = p.pronamespace "
                "where n.nspname = 'public' and proname = 'is_match_chat_participant'"
            )
        ).all()
        print("\nFunction (name, security definer, owner):", [tuple(f) for f in functions] or "MISSING")

        grants = db.execute(
            text(
                "select privilege_type from information_schema.role_table_grants "
                "where table_schema = 'public' and table_name = 'messages' and grantee = 'authenticated'"
            )
        ).scalars().all()
        print("Grants for 'authenticated' on messages:", grants or "NONE")

        published = db.execute(
            text("select tablename from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public'")
        ).scalars().all()
        print("Tables in the Realtime publication:", published or "NONE")

        creator_id = db.execute(text("select cast(id as text) from profiles limit 1")).scalar()
        if creator_id is None:
            print("\nNo profiles exist, so the simulation is skipped. Register one account and run this again.")
            return

        match_id, conv_id = str(uuid.uuid4()), str(uuid.uuid4())
        db.execute(
            text(
                "insert into matches (id, sport, location, date, time, players_needed, skill_level, status, created_by) "
                "values (cast(:m as uuid), 'Diag', 'Diag', current_date, '19:00', 2, 'BEGINNER', 'OPEN', cast(:u as uuid))"
            ),
            {"m": match_id, "u": creator_id},
        )
        db.execute(
            text("insert into conversations (id, match_id) values (cast(:c as uuid), cast(:m as uuid))"),
            {"c": conv_id, "m": match_id},
        )
        db.execute(
            text(
                "insert into messages (id, conversation_id, sender_id, content) "
                "values (cast(:i as uuid), cast(:c as uuid), cast(:u as uuid), 'diagnostic')"
            ),
            {"i": str(uuid.uuid4()), "c": conv_id, "u": creator_id},
        )

        for label, user_id in (("the match creator", creator_id), ("a stranger", str(uuid.uuid4()))):
            print(f"\nAs {label}:")
            params = {"c": conv_id}
            print("  auth.uid()                :", as_user(db, user_id, "select cast(auth.uid() as text)", {}))
            print("  function says participant :", as_user(db, user_id, "select public.is_match_chat_participant(cast(:c as uuid))", params))
            print("  message rows visible      :", as_user(db, user_id, "select count(*) from public.messages where conversation_id = cast(:c as uuid)", params))
    finally:
        db.rollback()  # the throwaway rows never persist
        db.close()


if __name__ == "__main__":
    main()
