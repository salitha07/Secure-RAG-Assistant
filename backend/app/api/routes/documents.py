import logging
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy import func
from sqlmodel import Session, select
from starlette.concurrency import run_in_threadpool

from backend.app.api.dependencies.auth import (
    require_document_manager,
)
from backend.app.database import get_session
from backend.app.models.document import (
    Document,
    utc_now,
)
from backend.app.models.user import User
from backend.app.schemas.document import (
    DocumentListResponse,
    DocumentResponse,
    DocumentUploadResponse,
)
from backend.app.services.document_indexing import (
    delete_document_index,
    index_document,
    normalize_allowed_roles,
)
from backend.app.services.document_storage import (
    delete_document_file,
    save_document_file,
)
from backend.app.services.pdf_service import (
    MAX_PDF_SIZE_BYTES,
    process_pdf_upload,
)


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/api/v1/documents",
    tags=["Documents"],
)


@router.post(
    "",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    title: str = Form(
        min_length=1,
        max_length=200,
    ),
    department: str = Form(
        min_length=1,
        max_length=100,
    ),
    allowed_roles: list[str] = Form(),
    file: UploadFile = File(),
    current_user: User = Depends(
        require_document_manager
    ),
    session: Session = Depends(get_session),
):
    if current_user.id is None:
        raise HTTPException(
            status_code=(
                status.HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail="Authenticated user is invalid.",
        )

    clean_title = title.strip()
    clean_department = department.strip()

    if not clean_title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document title cannot be empty.",
        )

    if not clean_department:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department cannot be empty.",
        )

    try:
        normalized_roles = normalize_allowed_roles(
            allowed_roles
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error

    try:
        file_bytes = await file.read(
            MAX_PDF_SIZE_BYTES + 1
        )
    finally:
        await file.close()

    try:
        processed_pdf = await run_in_threadpool(
            process_pdf_upload,
            file_name=file.filename or "",
            content_type=file.content_type,
            file_bytes=file_bytes,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error

    document_id = uuid4()
    stored_file_name = f"{document_id}.pdf"

    document = Document(
        id=document_id,
        title=clean_title,
        department=clean_department,
        allowed_roles=normalized_roles,
        original_file_name=file.filename or "",
        stored_file_name=stored_file_name,
        content_type="application/pdf",
        file_size=processed_pdf["file_size"],
        status="processing",
        uploaded_by=current_user.id,
    )

    try:
        await run_in_threadpool(
            save_document_file,
            stored_file_name=stored_file_name,
            file_bytes=file_bytes,
        )

        session.add(document)
        session.commit()
        session.refresh(document)

    except Exception as error:
        session.rollback()

        await run_in_threadpool(
            delete_document_file,
            stored_file_name,
        )

        logger.exception(
            "Document file or metadata could not be saved."
        )

        raise HTTPException(
            status_code=(
                status.HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail=(
                "The document could not be saved."
            ),
        ) from error

    try:
        chunks_indexed = await run_in_threadpool(
            index_document,
            document_id=document.id,
            title=document.title,
            department=document.department,
            allowed_roles=document.allowed_roles,
            text=processed_pdf["text"],
        )

        document.status = "ready"
        document.error_message = None
        document.updated_at = utc_now()

        session.add(document)
        session.commit()
        session.refresh(document)

    except Exception as error:
        logger.exception(
            "Document indexing failed."
        )

        session.rollback()

        try:
            await run_in_threadpool(
                delete_document_index,
                document.id,
            )
        except Exception:
            logger.exception(
                "Failed to clean up the document index."
            )

        failed_document = session.get(
            Document,
            document.id,
        )

        if failed_document is not None:
            failed_document.status = "failed"
            failed_document.error_message = (
                "Document indexing failed."
            )
            failed_document.updated_at = utc_now()

            try:
                session.add(failed_document)
                session.commit()
            except Exception:
                session.rollback()
                logger.exception(
                    "Failed to save document failure status."
                )

        raise HTTPException(
            status_code=(
                status.HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail=(
                "The document could not be indexed."
            ),
        ) from error

    response_data = DocumentResponse.model_validate(
        document
    ).model_dump()

    return {
        **response_data,
        "page_count": processed_pdf["page_count"],
        "chunks_indexed": chunks_indexed,
    }


@router.get(
    "",
    response_model=DocumentListResponse,
)
def list_documents(
    limit: int = Query(
        default=50,
        ge=1,
        le=100,
    ),
    offset: int = Query(
        default=0,
        ge=0,
    ),
    current_user: User = Depends(
        require_document_manager
    ),
    session: Session = Depends(get_session),
):
    total = session.exec(
        select(func.count(Document.id))
    ).one()

    documents = session.exec(
        select(Document)
        .order_by(
            Document.updated_at.desc(),
            Document.created_at.desc(),
        )
        .offset(offset)
        .limit(limit)
    ).all()

    return {
        "items": documents,
        "total": total,
    }