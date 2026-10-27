"""Reopen matches with available non-host player slots.

Revision ID: d41_host_excluded_from_match_capacity
Revises: d40_chat_read_states
"""

from alembic import op

revision = "d41_host_excluded_from_match_capacity"
down_revision = "d40_chat_read_states"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE matches
        SET status = 'OPEN'
        WHERE status = 'FULL'
          AND (
            SELECT count(*)
            FROM match_players
            WHERE match_players.match_id = matches.id
              AND match_players.user_id != matches.created_by
          ) < matches.players_needed
        """
    )


def downgrade() -> None:
    pass
