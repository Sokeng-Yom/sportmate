"""Persist the court selected for a hosted match.

Revision ID: d36_match_court_selection
Revises: d35_community
Create Date: 2026-10-20
"""
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "d36_match_court_selection"
down_revision = "d35_community"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("matches", sa.Column("court_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("matches", sa.Column("court_duration_minutes", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_matches_court_id_courts",
        "matches",
        "courts",
        ["court_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_matches_court_id_courts", "matches", type_="foreignkey")
    op.drop_column("matches", "court_duration_minutes")
    op.drop_column("matches", "court_id")
