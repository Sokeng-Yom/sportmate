"""venue review fields, security log details, notification index"""
import sqlalchemy as sa
from alembic import op

revision = "d31_venue_review"
down_revision = "31e46faf088b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("venues", sa.Column("photo_url", sa.String(), nullable=True))
    op.add_column("venues", sa.Column("rejection_reason", sa.String(), nullable=True))
    op.add_column("venues", sa.Column("reviewed_at", sa.DateTime(), nullable=True))
    op.add_column("security_logs", sa.Column("details", sa.String(), nullable=True))
    op.create_index("ix_notifications_user_created", "notifications", ["user_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_notifications_user_created", table_name="notifications")
    op.drop_column("security_logs", "details")
    op.drop_column("venues", "reviewed_at")
    op.drop_column("venues", "rejection_reason")
    op.drop_column("venues", "photo_url")
