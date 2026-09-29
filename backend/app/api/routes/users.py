from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from backend.app.api.dependencies.auth import get_current_user
from backend.app.database import get_session
from backend.app.models.role import UserRole
from backend.app.models.user import User
from backend.app.schemas.admin import (
    AdminUserResponse,
    UpdateUserRoleRequest,
    UpdateUserStatusRequest,
)


router = APIRouter(
    prefix="/api/v1/users",
    tags=["User Management"],
)


ADMIN_ROLES = frozenset({UserRole.ADMIN})


def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role not in ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to manage users.",
        )

    return current_user


@router.get("", response_model=list[AdminUserResponse])
def list_users(
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    users = session.exec(
        select(User).order_by(User.id)
    ).all()

    return users


@router.patch(
    "/{user_id}/role",
    response_model=AdminUserResponse,
)
def update_user_role(
    user_id: int,
    request: UpdateUserRoleRequest,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    user = session.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    # Prevent an admin from removing their own admin role
    if user.id == current_user.id and request.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove your own admin role.",
        )

    user.role = request.role

    session.add(user)
    session.commit()
    session.refresh(user)

    return user


@router.patch(
    "/{user_id}/status",
    response_model=AdminUserResponse,
)
def update_user_status(
    user_id: int,
    request: UpdateUserStatusRequest,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    user = session.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    # Prevent an admin from deactivating their own account
    if user.id == current_user.id and request.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account.",
        )

    user.is_active = request.is_active

    session.add(user)
    session.commit()
    session.refresh(user)

    return user