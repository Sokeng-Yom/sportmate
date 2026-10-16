"""
Applies a .sql file to the database that DATABASE_URL points at: the SAME database the tests and
the API use. Runs in one transaction and prints the real error if anything fails.

From backend/:   python -m app.db.apply_sql supabase/005_chat_rls_realtime.sql
"""
import sys
from pathlib import Path
from urllib.parse import urlparse

from app.core.config import settings
from app.db.session import engine


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: python -m app.db.apply_sql <file.sql>")

    path = Path(sys.argv[1])
    sql = path.read_text(encoding="utf-8")

    api_ref = urlparse(settings.supabase_url).hostname.split(".")[0]
    db_user = urlparse(settings.database_url).username or ""
    db_ref = db_user.split(".", 1)[1] if "." in db_user else "(unknown)"
    print(f"SUPABASE_URL project : {api_ref}")
    print(f"DATABASE_URL project : {db_ref}")
    if api_ref != db_ref:
        print("WARNING: these differ. The REST API and the database are different projects. Fix .env first.")

    print(f"Applying {path} ...")
    conn = engine.raw_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql)  # no parameters, so psycopg2 does no %-processing and DO blocks are safe
        conn.commit()
        print("Applied and committed.")
    except Exception as exc:
        conn.rollback()
        print("FAILED, nothing was applied:\n", exc)
        raise SystemExit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
