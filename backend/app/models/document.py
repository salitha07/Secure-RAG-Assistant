from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    Uuid,
)
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Document(SQLModel, table=True):
    __tablename__ = "documents"

    id: UUID = Field(
        default_factory=uuid4,
        sa_column=Column(
            Uuid(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
    )

    title: str = Field(
        sa_column=Column(
            String(200),
            index=True,
            nullable=False,
        ),
    )

    department: str = Field(
        sa_column=Column(
            String(100),
            index=True,
            nullable=False,
        ),
    )

    allowed_roles: list[str] = Field(
        default_factory=list,
        sa_column=Column(
            JSON,
            nullable=False,
        ),
    )

    original_file_name: str = Field(
        sa_column=Column(
            String(255),
            nullable=False,
        ),
    )

    stored_file_name: str = Field(
        sa_column=Column(
            String(255),
            unique=True,
            nullable=False,
        ),
    )

    content_type: str = Field(
        default="application/pdf",
        sa_column=Column(
            String(100),
            nullable=False,
        ),
    )

    file_size: int = Field(
        sa_column=Column(
            Integer,
            nullable=False,
        ),
    )

    status: str = Field(
        default="processing",
        sa_column=Column(
            String(20),
            index=True,
            nullable=False,
        ),
    )

    error_message: str | None = Field(
        default=None,
        sa_column=Column(
            Text,
            nullable=True,
        ),
    )

    uploaded_by: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey(
                "users.id",
                ondelete="RESTRICT",
            ),
            index=True,
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