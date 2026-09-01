import logging

from fastapi import APIRouter, HTTPException, status

from backend.app.schemas.rag import AskRequest, AskResponse
from backend.app.services.rag_service import answer_question


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1",
    tags=["RAG"],
)


@router.post("/ask", response_model=AskResponse)
def ask(request: AskRequest):
    try:
        result = answer_question(
            question=request.question,
            user_role=request.role,
        )

        return result

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error

    except Exception as error:
        logger.exception("RAG request failed.")

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="RAG service is temporarily unavailable.",
        ) from error