from fastapi import (
    APIRouter,
    Depends,
    Query,
)
from sqlalchemy import func
from sqlmodel import Session, select

from backend.app.api.dependencies.auth import (
    require_audit_viewer,
)
from backend.app.database import get_session
from backend.app.models.audit_log import RagAuditLog
from backend.app.models.user import User
from backend.app.schemas.audit import (
    AuditLogListResponse,
)


router = APIRouter(
    prefix="/api/v1",
    tags=["Security Audit"],
)


@router.get(
    "/audit-logs",
    response_model=AuditLogListResponse,
)
def list_audit_logs(
    limit: int = Query(
        default=50,
        ge=1,
        le=100,
    ),
    offset: int = Query(
        default=0,
        ge=0,
    ),
    session: Session = Depends(get_session),
    authorized_user: User = Depends(
        require_audit_viewer
    ),
):
    total = session.exec(
        select(func.count(RagAuditLog.id))
    ).one()

    audit_logs = session.exec(
        select(RagAuditLog)
        .order_by(
            RagAuditLog.created_at.desc(),
            RagAuditLog.id.desc(),
        )
        .offset(offset)
        .limit(limit)
    ).all()

    return {
        "items": audit_logs,
        "total": total,
        "limit": limit,
        "offset": offset,
    }