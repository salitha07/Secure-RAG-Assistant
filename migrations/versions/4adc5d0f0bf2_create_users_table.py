"""create users table

Revision ID: 4adc5d0f0bf2
Revises: 
Create Date: 2026-09-06 18:05:19.280879

"""
from typing import Sequence, Union
from sqlalchemy.dialects import postgresql

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4adc5d0f0bf2'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None
user_role_enum = postgresql.ENUM(
    "employee",
    "hr",
    "finance",
    "executive",
    name="user_role",
    create_type=False,
)


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
