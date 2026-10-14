"""courts.availability as JSONB, unique court name per venue"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "d32_court_availability"
down_revision = "d31_venue_review"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "courts",
        "availability",
        existing_type=sa.String(),
        type_=postgresql.JSONB(astext_type=sa.Text()),
        existing_nullable=True,
        postgresql_using="CASE WHEN availability IS NULL OR availability = '' THEN NULL ELSE availability::jsonb END",
    )
    op.create_unique_constraint("uq_courts_venue_name", "courts", ["venue_id", "name"])


def downgrade() -> None:
    op.drop_constraint("uq_courts_venue_name", "courts", type_="unique")
    op.alter_column(
        "courts",
        "availability",
        existing_type=postgresql.JSONB(astext_type=sa.Text()),
        type_=sa.String(),
        existing_nullable=True,
        postgresql_using="availability::text",
    )
