from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from backend.app.models.role import UserRole
from backend.app.models.user import User
from backend.app.schemas.auth import RegisterRequest
from backend.app.security.passwords import (
    hash_password,
    verify_password,
)


class EmailAlreadyRegisteredError(Exception):
    pass


def create_user(
    request: RegisterRequest,
    session: Session,
) -> User:
    normalized_email = str(request.email).strip().lower()

    existing_user = session.exec(
        select(User).where(
            User.email == normalized_email
        )
    ).first()

    if existing_user is not None:
        raise EmailAlreadyRegisteredError(
            "An account with this email already exists."
        )

    user = User(
        full_name=request.full_name,
        email=normalized_email,
        password_hash=hash_password(request.password),
        role=UserRole("employee"),
        is_active=True,
    )

    session.add(user)

    try:
        session.commit()
    except IntegrityError as error:
        session.rollback()

        raise EmailAlreadyRegisteredError(
            "An account with this email already exists."
        ) from error

    session.refresh(user)

    return user
DUMMY_PASSWORD_HASH = hash_password(
    "dummy-password-used-for-safe-timing"
)


def authenticate_user(
    email: str,
    password: str,
    session: Session,
) -> User | None:
    normalized_email = email.strip().lower()

    user = session.exec(
        select(User).where(
            User.email == normalized_email
        )
    ).first()

    if user is None:
        verify_password(
            password,
            DUMMY_PASSWORD_HASH,
        )
        return None

    if not verify_password(
        password,
        user.password_hash,
    ):
        return None

    if not user.is_active:
        return None

    return user