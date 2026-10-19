"""add unique constraints for join races

Revision ID: 31e46faf088b
Revises: 3763681d0540
Create Date: 2026-10-08 10:26:06.868120

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '31e46faf088b'
down_revision: Union[str, Sequence[str], None] = '3763681d0540'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint("uq_match_players_match_user", "match_players", ["match_id", "user_id"])
    op.create_unique_constraint("uq_waiting_list_match_user", "waiting_list", ["match_id", "user_id"])


def downgrade() -> None:
    op.drop_constraint("uq_waiting_list_match_user", "waiting_list", type_="unique")
    op.drop_constraint("uq_match_players_match_user", "match_players", type_="unique")
