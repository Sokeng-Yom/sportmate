"""Store uploaded venue payment proof paths."""

import sqlalchemy as sa
from alembic import op

revision = "d44_venue_payment_proof"
down_revision = "d43_venue_direct_messages"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("venues", sa.Column("payment_proof_path", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("venues", "payment_proof_path")
