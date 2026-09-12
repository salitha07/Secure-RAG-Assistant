"""bind conversations to access role

Revision ID: d8a14c7f52e6
Revises: c7e42f6a91d3
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d8a14c7f52e6"
down_revision: Union[
    str,
    Sequence[str],
    None,
] = "c7e42f6a91d3"
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
    op.add_column(
        "conversations",
        sa.Column(
            "access_role",
            sa.String(length=20),
            nullable=True,
        ),
    )

    # Preserve existing conversations by assigning
    # each user's current database role.
    op.execute(
        """
        UPDATE conversations AS conversation
        SET access_role = users.role::text
        FROM users
        WHERE conversation.user_id = users.id
        """
    )

    op.alter_column(
        "conversations",
        "access_role",
        existing_type=sa.String(length=20),
        nullable=False,
    )

    op.create_index(
        op.f("ix_conversations_access_role"),
        "conversations",
        ["access_role"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_conversations_access_role"),
        table_name="conversations",
    )

    op.drop_column(
        "conversations",
        "access_role",
    )