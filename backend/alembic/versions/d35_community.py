"""community: post_reports, unique likes, indexes"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "d35_community"
down_revision = "d34_chat"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "post_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("post_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("posts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reporter_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("profiles.id"), nullable=False),
        sa.Column("reason", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint("post_id", "reporter_id", name="uq_post_reports_post_reporter"),
    )
    op.create_index("ix_post_reports_status_post", "post_reports", ["status", "post_id"])
    op.create_unique_constraint("uq_post_likes_post_user", "post_likes", ["post_id", "user_id"])
    op.create_index("ix_posts_created", "posts", ["created_at"])
    op.create_index("ix_comments_post_created", "comments", ["post_id", "created_at"])
    op.execute("ALTER TABLE post_reports ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    op.drop_index("ix_comments_post_created", table_name="comments")
    op.drop_index("ix_posts_created", table_name="posts")
    op.drop_constraint("uq_post_likes_post_user", "post_likes", type_="unique")
    op.drop_index("ix_post_reports_status_post", table_name="post_reports")
    op.drop_table("post_reports")
