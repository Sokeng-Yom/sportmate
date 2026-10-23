"""Support venue review for court booking requests.

Revision ID: d38_venue_booking_approval
Revises: d37_match_court_set_null
"""

import sqlalchemy as sa

from alembic import op

revision = "d38_venue_booking_approval"
down_revision = "d37_match_court_set_null"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index("uq_bookings_one_confirmed_per_match", table_name="bookings")
    op.create_index(
        "uq_bookings_one_active_per_match",
        "bookings",
        ["match_id"],
        unique=True,
        postgresql_where=sa.text("status IN ('PENDING', 'CONFIRMED') AND match_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_bookings_one_active_per_match", table_name="bookings")
    op.create_index(
        "uq_bookings_one_confirmed_per_match",
        "bookings",
        ["match_id"],
        unique=True,
        postgresql_where=sa.text("status = 'CONFIRMED' AND match_id IS NOT NULL"),
    )
