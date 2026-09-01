from fastapi import (
    Depends,
    HTTPException,
    status,
)
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)
from sqlmodel import Session

from backend.app.database import get_session
from backend.app.models.user import User
from backend.app.security.tokens import (
    InvalidAccessTokenError,
    decode_access_token,
)


bearer_scheme = HTTPBearer(
    scheme_name="BearerAuth",
    description=(
        "JWT access token returned by the login endpoint."
    ),
    auto_error=False,
)


def authentication_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication credentials.",
        headers={
            "WWW-Authenticate": "Bearer",
        },
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        bearer_scheme
    ),
    session: Session = Depends(get_session),
) -> User:
    if (
        credentials is None
        or credentials.scheme.lower() != "bearer"
    ):
        raise authentication_error()

    try:
        user_id = decode_access_token(
            credentials.credentials
        )
    except InvalidAccessTokenError as error:
        raise authentication_error() from error

    user = session.get(User, user_id)

    if user is None or not user.is_active:
        raise authentication_error()

    return user