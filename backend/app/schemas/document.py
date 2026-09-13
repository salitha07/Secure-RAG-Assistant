from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class DocumentResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: UUID
    title: str
    department: str
    allowed_roles: list[str]
    original_file_name: str
    content_type: str
    file_size: int
    status: str
    error_message: str | None
    uploaded_by: int
    created_at: datetime
    updated_at: datetime


class DocumentUploadResponse(
    DocumentResponse
):
    page_count: int
    chunks_indexed: int


class DocumentListResponse(BaseModel):
    items: list[DocumentResponse]
    total: int