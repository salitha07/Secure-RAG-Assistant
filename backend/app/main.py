from fastapi import FastAPI

from backend.app.api.routes.auth import router as auth_router
from backend.app.api.routes.rag import router as rag_router


app = FastAPI(
    title="Secure RAG Assistant API",
    description=(
        "Role-authorized internal company "
        "knowledge assistant."
    ),
    version="0.1.0",
)
app.include_router(auth_router)
app.include_router(rag_router)



@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "service": "Secure RAG Assistant",
    }