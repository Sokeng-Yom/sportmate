"""Add venue discounts and events.

Revision ID: d39_venue_marketing
Revises: d38_venue_booking_approval
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "d39_venue_marketing"
down_revision = "d38_venue_booking_approval"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "venue_discounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("venue_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("percent_off", sa.Integer(), nullable=True),
        sa.Column("code", sa.String(length=50), nullable=True),
        sa.Column("valid_until", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["venue_id"], ["venues.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_venue_discounts_venue_id", "venue_discounts", ["venue_id"])
    op.create_table(
        "venue_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("venue_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("event_date", sa.Date(), nullable=False),
        sa.Column("event_time", sa.Time(), nullable=False),
        sa.Column("sport", sa.String(length=80), nullable=False),
        sa.Column("price_label", sa.String(length=80), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["venue_id"], ["venues.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_venue_events_venue_id", "venue_events", ["venue_id"])


def downgrade() -> None:
    op.drop_index("ix_venue_events_venue_id", table_name="venue_events")
    op.drop_table("venue_events")
    op.drop_index("ix_venue_discounts_venue_id", table_name="venue_discounts")
    op.drop_table("venue_discounts")
