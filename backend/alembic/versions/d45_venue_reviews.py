"""Persist player reviews for completed venue bookings."""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "d45_venue_reviews"
down_revision = "d44_venue_payment_proof"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "venue_reviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("booking_transaction_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("venue_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("player_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("rating >= 1 AND rating <= 5", name="ck_venue_reviews_rating_range"),
        sa.ForeignKeyConstraint(
            ["booking_transaction_id"],
            ["booking_transactions.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["venue_id"], ["venues.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["player_id"], ["profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "booking_transaction_id",
            name="uq_venue_reviews_booking_transaction",
        ),
    )
    op.create_index(
        "ix_venue_reviews_venue_created",
        "venue_reviews",
        ["venue_id", "created_at"],
    )
    op.execute("ALTER TABLE public.venue_reviews ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    op.drop_index("ix_venue_reviews_venue_created", table_name="venue_reviews")
    op.drop_table("venue_reviews")
