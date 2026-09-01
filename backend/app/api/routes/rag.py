import logging

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
from backend.app.schemas.rag import (
    AskRequest,
    AskResponse,
)
from backend.app.services.rag_service import (
    answer_question,
)


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/api/v1",
    tags=["RAG"],
)


@router.post(
    "/ask",
    response_model=AskResponse,
)
def ask(
    request: AskRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        return answer_question(
            question=request.question,
            user_role=current_user.role,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error

    except Exception as error:
        logger.exception("RAG request failed.")

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "RAG service is temporarily unavailable."
            ),
        ) from error