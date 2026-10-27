"""Track per-user read position in match conversations.

Revision ID: d40_chat_read_states
Revises: d39_venue_marketing
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "d40_chat_read_states"
down_revision = "d39_venue_marketing"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "conversation_read_states",
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("last_read_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("conversation_id", "user_id"),
    )
    op.execute(
        """
        INSERT INTO conversation_read_states (conversation_id, user_id, last_read_at)
        SELECT c.id, participant.user_id, now() AT TIME ZONE 'UTC'
        FROM conversations c
        JOIN matches m ON m.id = c.match_id
        CROSS JOIN LATERAL (
            SELECT m.created_by AS user_id
            UNION
            SELECT mp.user_id
            FROM match_players mp
            WHERE mp.match_id = m.id
        ) AS participant
        """
    )


def downgrade() -> None:
    op.drop_table("conversation_read_states")
