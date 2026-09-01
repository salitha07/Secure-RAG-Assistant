from datetime import datetime, timezone

from sqlalchemy import Column, DateTime
from sqlalchemy import Enum as SAEnum
from sqlalchemy import String
from sqlmodel import Field, SQLModel

from backend.app.models.role import UserRole


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: int | None = Field(
        default=None,
        primary_key=True,
    )

    email: str = Field(
        sa_column=Column(
            String(320),
            unique=True,
            index=True,
            nullable=False,
        )
    )

    full_name: str = Field(
        sa_column=Column(
            String(120),
            nullable=False,
        )
    )

    password_hash: str = Field(
        sa_column=Column(
            String(255),
            nullable=False,
        )
    )

    role: UserRole = Field(
        sa_column=Column(
            SAEnum(
                UserRole,
                name="user_role",
                values_callable=lambda role_class: [
                    role.value for role in role_class
                ],
            ),
            nullable=False,
        )
    )

    is_active: bool = Field(
        default=True,
        nullable=False,
    )

    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
        ),
    )