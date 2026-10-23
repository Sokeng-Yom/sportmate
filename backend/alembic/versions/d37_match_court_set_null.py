"""Preserve matches when a selected court is removed.

Revision ID: d37_match_court_set_null
Revises: d36_match_court_selection
Create Date: 2026-10-20
"""
from alembic import op

revision = "d37_match_court_set_null"
down_revision = "d36_match_court_selection"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("fk_matches_court_id_courts", "matches", type_="foreignkey")
    op.create_foreign_key(
        "fk_matches_court_id_courts",
        "matches",
        "courts",
        ["court_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_matches_court_id_courts", "matches", type_="foreignkey")
    op.create_foreign_key(
        "fk_matches_court_id_courts",
        "matches",
        "courts",
        ["court_id"],
        ["id"],
    )
