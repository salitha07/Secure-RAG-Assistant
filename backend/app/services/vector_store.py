from pathlib import Path

from qdrant_client import QdrantClient, models

from backend.app.services.embedding_service import (
    EMBEDDING_DIMENSION,
)


PROJECT_ROOT = Path(__file__).resolve().parents[3]
QDRANT_PATH = PROJECT_ROOT / "qdrant_storage"
COLLECTION_NAME = "secure_company_documents"


def create_qdrant_client():
    return QdrantClient(path=str(QDRANT_PATH))


def ensure_collection(client):
    if client.collection_exists(COLLECTION_NAME):
        print(f"Collection already exists: {COLLECTION_NAME}")
        return

    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=models.VectorParams(
            size=EMBEDDING_DIMENSION,
            distance=models.Distance.COSINE,
        ),
    )

    print(f"Collection created: {COLLECTION_NAME}")


def main():
    client = create_qdrant_client()

    try:
        ensure_collection(client)

        collection = client.get_collection(COLLECTION_NAME)

        print(f"Points stored: {collection.points_count}")
        print(f"Storage location: {QDRANT_PATH}")
    finally:
        client.close()


if __name__ == "__main__":
    main()
    