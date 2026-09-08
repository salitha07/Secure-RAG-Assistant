from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    JSON,
    Text,
    Uuid,
)
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ChatMessage(SQLModel, table=True):
    __tablename__ = "chat_messages"

    __table_args__ = (
        CheckConstraint(
            "role IN ('user', 'assistant')",
            name="ck_chat_message_valid_role",
        ),
    )

    id: UUID = Field(
        default_factory=uuid4,
        sa_column=Column(
            Uuid(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
    )

    conversation_id: UUID = Field(
        sa_column=Column(
            Uuid(as_uuid=True),
            ForeignKey(
                "conversations.id",
                ondelete="CASCADE",
            ),
            index=True,
            nullable=False,
        ),
    )

    role: str = Field(
        sa_column=Column(
            Text,
            nullable=False,
        ),
    )

    content: str = Field(
        sa_column=Column(
            Text,
            nullable=False,
        ),
    )

    citations: list[dict] = Field(
        default_factory=list,
        sa_column=Column(
            JSON,
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