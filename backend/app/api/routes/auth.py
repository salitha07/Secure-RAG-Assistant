from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from backend.app.api.dependencies.auth import (
    get_current_user,
)
from backend.app.models.user import User
from sqlmodel import Session

from backend.app.database import get_session
from backend.app.schemas.auth import (
    RegisterRequest,
    UserResponse,
)
from backend.app.services.auth_service import (
    EmailAlreadyRegisteredError,
    create_user,
    authenticate_user,
)
from backend.app.security.tokens import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    create_access_token,
)
from backend.app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)


router = APIRouter(
    prefix="/api/v1/auth",
    tags=["Authentication"],
)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    request: RegisterRequest,
    session: Session = Depends(get_session),
):
    try:
        return create_user(
            request=request,
            session=session,
        )

    except EmailAlreadyRegisteredError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error
@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    request: LoginRequest,
    session: Session = Depends(get_session),
):
    user = authenticate_user(
        email=str(request.email),
        password=request.password,
        session=session,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        )

    if user.id is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create access token.",
        )

    return TokenResponse(
        access_token=create_access_token(user.id),
        expires_in=(
            ACCESS_TOKEN_EXPIRE_MINUTES * 60
        ),
    )  
@router.get(
    "/me",
    response_model=UserResponse,
)
def get_my_profile(
    current_user: User = Depends(get_current_user),
):
    return current_user