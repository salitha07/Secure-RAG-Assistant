from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Uuid,
)
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Conversation(SQLModel, table=True):
    __tablename__ = "conversations"

    id: UUID = Field(
        default_factory=uuid4,
        sa_column=Column(
            Uuid(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
    )

    user_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey(
                "users.id",
                ondelete="CASCADE",
            ),
            index=True,
            nullable=False,
        ),
    )

    title: str = Field(
        default="New conversation",
        sa_column=Column(
            String(120),
            nullable=False,
        ),
    )

    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(
            DateTime(timezone=True),
            index=True,
            nullable=False,
        ),
    )

    updated_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(
            DateTime(timezone=True),
            index=True,
            nullable=False,
        ),
    )