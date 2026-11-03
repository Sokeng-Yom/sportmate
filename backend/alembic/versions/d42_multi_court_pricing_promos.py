"""Add multi-court booking transactions, court pricing, and redeemable promos.

Revision ID: d42_multi_court_pricing_promos
Revises: d41_host_excluded_from_match_capacity
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "d42_multi_court_pricing_promos"
down_revision = "d41_host_capacity"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("courts", sa.Column("price_per_hour", sa.Numeric(10, 2), nullable=True))
    op.add_column("venue_discounts", sa.Column("amount_off", sa.Numeric(10, 2), nullable=True))
    op.add_column(
        "venue_discounts",
        sa.Column("active", sa.Boolean(), server_default=sa.true(), nullable=False),
    )
    op.add_column("venue_discounts", sa.Column("usage_limit", sa.Integer(), nullable=True))
    op.add_column(
        "venue_discounts",
        sa.Column("usage_count", sa.Integer(), server_default="0", nullable=False),
    )
    op.create_check_constraint(
        "ck_venue_discounts_usage_limit_positive",
        "venue_discounts",
        "usage_limit IS NULL OR usage_limit > 0",
    )
    op.create_check_constraint(
        "ck_venue_discounts_usage_count_nonnegative",
        "venue_discounts",
        "usage_count >= 0",
    )

    op.create_table(
        "booking_transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("match_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("booked_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("promo_discount_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("promo_code", sa.String(length=50), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.DateTime(), nullable=False),
        sa.Column("end_time", sa.DateTime(), nullable=False),
        sa.Column("original_total", sa.Numeric(10, 2), nullable=False),
        sa.Column("discount_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("final_total", sa.Numeric(10, 2), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.CheckConstraint("end_time > start_time", name="ck_booking_transactions_end_after_start"),
        sa.ForeignKeyConstraint(["booked_by"], ["profiles.id"]),
        sa.ForeignKeyConstraint(["match_id"], ["matches.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["promo_discount_id"], ["venue_discounts.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "uq_booking_transactions_one_active_per_match",
        "booking_transactions",
        ["match_id"],
        unique=True,
        postgresql_where=sa.text("status IN ('PENDING', 'CONFIRMED') AND match_id IS NOT NULL"),
    )
    op.add_column(
        "bookings",
        sa.Column("transaction_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column("bookings", sa.Column("price_per_hour", sa.Numeric(10, 2), nullable=True))
    op.create_foreign_key(
        "fk_bookings_transaction_id",
        "bookings",
        "booking_transactions",
        ["transaction_id"],
        ["id"],
    )
    op.create_index("ix_bookings_transaction_id", "bookings", ["transaction_id"])
    op.drop_index("uq_bookings_one_active_per_match", table_name="bookings")


def downgrade() -> None:
    op.create_index(
        "uq_bookings_one_active_per_match",
        "bookings",
        ["match_id"],
        unique=True,
        postgresql_where=sa.text("status IN ('PENDING', 'CONFIRMED') AND match_id IS NOT NULL"),
    )
    op.drop_index("ix_bookings_transaction_id", table_name="bookings")
    op.drop_constraint("fk_bookings_transaction_id", "bookings", type_="foreignkey")
    op.drop_column("bookings", "price_per_hour")
    op.drop_column("bookings", "transaction_id")
    op.drop_index("uq_booking_transactions_one_active_per_match", table_name="booking_transactions")
    op.drop_table("booking_transactions")
    op.drop_constraint(
        "ck_venue_discounts_usage_count_nonnegative", "venue_discounts", type_="check"
    )
    op.drop_constraint("ck_venue_discounts_usage_limit_positive", "venue_discounts", type_="check")
    op.drop_column("venue_discounts", "usage_count")
    op.drop_column("venue_discounts", "usage_limit")
    op.drop_column("venue_discounts", "active")
    op.drop_column("venue_discounts", "amount_off")
    op.drop_column("courts", "price_per_hour")
