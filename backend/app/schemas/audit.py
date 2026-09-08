from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int
    request_id: UUID
    user_id: int
    role_used: str
    question_hash: str
    outcome: str
    source_document_ids: list[str]
    duration_ms: int
    created_at: datetime


class AuditLogListResponse(BaseModel):
    items: list[AuditLogResponse]
    total: int
    limit: int
    offset: int