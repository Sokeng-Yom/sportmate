from pathlib import Path

path = Path("app/db/user_purge.py")
text = path.read_text(encoding="utf-8")
PAIRS = [
    ("import argparse\n", "import argparse\nfrom concurrent.futures import ThreadPoolExecutor\n"),
    (
        "def purge_users(user_ids) -> None:\n",
        '_TABLE_CACHE: set[str] | None = None\n\n\n'
        "def _existing_tables(db) -> set[str]:\n"
        '    """Which of our tables exist: one query per process, not one per table per test."""\n'
        "    global _TABLE_CACHE\n"
        "    if _TABLE_CACHE is None:\n"
        "        rows = db.execute(\n"
        '            text("select tablename from pg_tables where schemaname = \'public\' and tablename = any(:names)"),\n'
        '            {"names": [table for table, _ in _STEPS]},\n'
        "        ).scalars().all()\n"
        "        _TABLE_CACHE = set(rows)\n"
        "    return _TABLE_CACHE\n\n\n"
        "def purge_users(user_ids) -> None:\n",
    ),
    (
        '        for table, statement in _STEPS:\n'
        '            exists = db.execute(text("select to_regclass(:name)"), {"name": f"public.{table}"}).scalar()\n'
        '            if exists is not None:\n'
        '                db.execute(text(statement), {"ids": ids})\n',
        '        existing = _existing_tables(db)\n'
        '        for table, statement in _STEPS:\n'
        '            if table in existing:\n'
        '                db.execute(text(statement), {"ids": ids})\n',
    ),
    (
        '        for user_id in user_ids:\n'
        '            response = client.delete(f"/users/{user_id}")\n'
        '            if response.status_code not in (200, 204, 404):\n'
        '                print(f"  could not delete auth user {user_id}: HTTP {response.status_code}")\n',
        '        def delete(user_id):\n'
        '            response = client.delete(f"/users/{user_id}")\n'
        '            if response.status_code not in (200, 204, 404):\n'
        '                print(f"  could not delete auth user {user_id}: HTTP {response.status_code}")\n\n'
        '        with ThreadPoolExecutor(max_workers=6) as pool:\n'
        '            list(pool.map(delete, user_ids))\n',
    ),
]
bad = [old for old, _ in PAIRS if text.count(old) != 1]
if bad:
    raise SystemExit("NOTHING CHANGED. This did not match exactly once:\n" + bad[0])
for old, new in PAIRS:
    text = text.replace(old, new)
path.write_text(text, encoding="utf-8")
print("patched", path)
