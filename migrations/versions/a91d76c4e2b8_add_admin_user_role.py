"""add admin user role

Revision ID: a91d76c4e2b8
Revises: 21ef85ee483a
"""

from typing import Sequence, Union

from alembic import op


revision: str = "a91d76c4e2b8"
down_revision: Union[
    str,
    Sequence[str],
    None,
] = "21ef85ee483a"
branch_labels: Union[
    str,
    Sequence[str],
    None,
] = None
depends_on: Union[
    str,
    Sequence[str],
    None,
] = None


def upgrade() -> None:
    op.execute(
        "ALTER TYPE user_role "
        "ADD VALUE IF NOT EXISTS 'admin'"
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE users
        SET role = 'employee'
        WHERE role = 'admin'
        """
    )

    op.execute(
        "ALTER TYPE user_role "
        "RENAME TO user_role_old"
    )

    op.execute(
        """
        CREATE TYPE user_role AS ENUM (
            'employee',
            'hr',
            'finance',
            'executive'
        )
        """
    )

    op.execute(
        """
        ALTER TABLE users
        ALTER COLUMN role TYPE user_role
        USING role::text::user_role
        """
    )

    op.execute("DROP TYPE user_role_old")