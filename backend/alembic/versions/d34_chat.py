"""chat: one conversation per match, message indexes"""
from alembic import op

revision = "d34_chat"
down_revision = "d33_booking_constraints"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_unique_constraint("uq_conversations_match", "conversations", ["match_id"])
    op.create_index("ix_messages_conversation_created", "messages", ["conversation_id", "created_at"])
    op.create_index("ix_messages_sender_created", "messages", ["sender_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_messages_sender_created", table_name="messages")
    op.drop_index("ix_messages_conversation_created", table_name="messages")
    op.drop_constraint("uq_conversations_match", "conversations", type_="unique")
