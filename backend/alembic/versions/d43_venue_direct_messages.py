"""Add private venue-owner to match-host conversations.

Revision ID: d43_venue_direct_messages
Revises: d42_multi_court_pricing_promos
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "d43_venue_direct_messages"
down_revision = "d42_multi_court_pricing_promos"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "venue_direct_conversations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("host_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["host_id"], ["profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["owner_id"], ["profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("owner_id", "host_id", name="uq_venue_direct_conversations_pair"),
    )
    op.create_index(
        "ix_venue_direct_conversations_host",
        "venue_direct_conversations",
        ["host_id"],
    )
    op.create_table(
        "venue_direct_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sender_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("content", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(
            ["conversation_id"], ["venue_direct_conversations.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["sender_id"], ["profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_venue_direct_messages_conversation_created",
        "venue_direct_messages",
        ["conversation_id", "created_at"],
    )
    op.create_index(
        "ix_venue_direct_messages_sender_created",
        "venue_direct_messages",
        ["sender_id", "created_at"],
    )
    op.create_table(
        "venue_direct_read_states",
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("last_read_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["conversation_id"], ["venue_direct_conversations.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("conversation_id", "user_id"),
    )
    op.execute(
        """
        INSERT INTO venue_direct_conversations (id, owner_id, host_id)
        SELECT gen_random_uuid(), venue.owner_id, match.created_by
        FROM bookings AS booking
        JOIN courts AS court ON court.id = booking.court_id
        JOIN venues AS venue ON venue.id = court.venue_id
        JOIN matches AS match ON match.id = booking.match_id
        GROUP BY venue.owner_id, match.created_by
        ON CONFLICT (owner_id, host_id) DO NOTHING
        """
    )


def downgrade() -> None:
    op.drop_table("venue_direct_read_states")
    op.drop_index(
        "ix_venue_direct_messages_sender_created", table_name="venue_direct_messages"
    )
    op.drop_index(
        "ix_venue_direct_messages_conversation_created", table_name="venue_direct_messages"
    )
    op.drop_table("venue_direct_messages")
    op.drop_index(
        "ix_venue_direct_conversations_host",
        table_name="venue_direct_conversations",
    )
    op.drop_table("venue_direct_conversations")
