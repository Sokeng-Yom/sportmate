"""initial empty migration

Revision ID: 34def095e9e9
Revises: ac8317119880
Create Date: 2026-09-16 13:27:01.448106

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '34def095e9e9'
down_revision: Union[str, Sequence[str], None] = 'ac8317119880'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
