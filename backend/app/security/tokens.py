import os
from datetime import datetime, timedelta, timezone

import jwt
from dotenv import load_dotenv


load_dotenv()


JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"
JWT_ISSUER = "secure-rag-assistant"
JWT_AUDIENCE = "secure-rag-users"

ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
)


if not JWT_SECRET or len(JWT_SECRET) < 32:
    raise RuntimeError(
        "JWT_SECRET must contain at least 32 characters."
    )

if ACCESS_TOKEN_EXPIRE_MINUTES <= 0:
    raise RuntimeError(
        "ACCESS_TOKEN_EXPIRE_MINUTES must be positive."
    )


class InvalidAccessTokenError(ValueError):
    pass


def create_access_token(user_id: int) -> str:
    if user_id <= 0:
        raise ValueError("User ID must be positive.")

    current_time = datetime.now(timezone.utc)

    payload = {
        "sub": str(user_id),
        "type": "access",
        "iat": current_time,
        "exp": current_time
        + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        ),
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
    }

    return jwt.encode(
        payload,
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> int:
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            issuer=JWT_ISSUER,
            audience=JWT_AUDIENCE,
        )

        if payload.get("type") != "access":
            raise InvalidAccessTokenError(
                "Invalid token type."
            )

        subject = payload.get("sub")

        if subject is None:
            raise InvalidAccessTokenError(
                "Token subject is missing."
            )

        return int(subject)

    except InvalidAccessTokenError:
        raise

    except (
        jwt.InvalidTokenError,
        TypeError,
        ValueError,
    ) as error:
        raise InvalidAccessTokenError(
            "Invalid or expired access token."
        ) from error