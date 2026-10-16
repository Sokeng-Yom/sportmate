from sqlalchemy import text


def test_every_public_table_has_row_level_security(db_session):
    """New tables must enable RLS (alter table ... enable row level security), or this fails."""
    rows = db_session.execute(text(
        "select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace "
        "where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity"
    )).scalars().all()
    assert not rows, f"Tables without Row Level Security (exposed to the public Data API): {rows}"
