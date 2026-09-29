from pydantic import BaseModel

from backend.app.models.role import UserRole


class AdminUserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: UserRole
    is_active: bool


class UpdateUserRoleRequest(BaseModel):
    role: UserRole


class UpdateUserStatusRequest(BaseModel):
    is_active: bool