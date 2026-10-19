"""booking constraints: no overlaps, one confirmed booking per match"""
import sqlalchemy as sa
from alembic import op

revision = "d33_booking_constraints"
down_revision = "d32_court_availability"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")
    op.create_check_constraint("ck_bookings_end_after_start", "bookings", "end_time > start_time")
    op.execute(
        "ALTER TABLE bookings ADD CONSTRAINT ex_bookings_no_overlap "
        "EXCLUDE USING gist (court_id WITH =, tsrange(start_time, end_time, '[)') WITH &&) "
        "WHERE (status = 'CONFIRMED')"
    )
    op.create_index(
        "uq_bookings_one_confirmed_per_match",
        "bookings",
        ["match_id"],
        unique=True,
        postgresql_where=sa.text("status = 'CONFIRMED' AND match_id IS NOT NULL"),
    )
    op.create_index("ix_bookings_court_start", "bookings", ["court_id", "start_time"])


def downgrade() -> None:
    op.drop_index("ix_bookings_court_start", table_name="bookings")
    op.drop_index("uq_bookings_one_confirmed_per_match", table_name="bookings")
    op.execute("ALTER TABLE bookings DROP CONSTRAINT ex_bookings_no_overlap")
    op.drop_constraint("ck_bookings_end_after_start", "bookings", type_="check")
