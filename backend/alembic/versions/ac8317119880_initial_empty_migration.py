"""initial empty migration

Revision ID: ac8317119880
Revises: 2b7b00e53f6b
Create Date: 2026-09-16 13:24:22.061215

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ac8317119880'
down_revision: Union[str, Sequence[str], None] = '2b7b00e53f6b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
