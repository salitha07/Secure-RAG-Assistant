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
    user_role_enum.create(
        op.get_bind(),
        checkfirst=True,
    )

    op.create_table(
        "users",
        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "email",
            sa.String(length=320),
            nullable=False,
        ),
        sa.Column(
            "full_name",
            sa.String(length=120),
            nullable=False,
        ),
        sa.Column(
            "password_hash",
            sa.String(length=255),
            nullable=False,
        ),
        sa.Column(
            "role",
            user_role_enum,
            nullable=False,
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_users_email",
        "users",
        ["email"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_users_email",
        table_name="users",
    )

    op.drop_table("users")

    user_role_enum.drop(
        op.get_bind(),
        checkfirst=True,
    )