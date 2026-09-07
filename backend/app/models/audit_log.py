from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Uuid,
)
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class RagAuditLog(SQLModel, table=True):
    __tablename__ = "rag_audit_logs"

    __table_args__ = (
        CheckConstraint(
            "duration_ms >= 0",
            name="ck_audit_duration_nonnegative",
        ),
        CheckConstraint(
            (
                "outcome IN "
                "('answered', 'refused', 'error')"
            ),
            name="ck_audit_valid_outcome",
        ),
    )

    id: int | None = Field(
        default=None,
        primary_key=True,
    )

    request_id: UUID = Field(
        default_factory=uuid4,
        sa_column=Column(
            Uuid(as_uuid=True),
            unique=True,
            index=True,
            nullable=False,
        ),
    )

    user_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("users.id"),
            index=True,
            nullable=False,
        )
    )

    role_used: str = Field(
        sa_column=Column(
            String(20),
            nullable=False,
        )
    )

    question_hash: str = Field(
        sa_column=Column(
            String(64),
            nullable=False,
        )
    )

    outcome: str = Field(
        sa_column=Column(
            String(20),
            nullable=False,
        )
    )

    source_document_ids: list[str] = Field(
        default_factory=list,
        sa_column=Column(
            JSON,
            nullable=False,
        ),
    )

    duration_ms: int = Field(
        ge=0,
        nullable=False,
    )

    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(
            DateTime(timezone=True),
            index=True,
            nullable=False,
        ),
    )