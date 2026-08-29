from uuid import NAMESPACE_URL, uuid5

from qdrant_client import models

from backend.app.services.document_loader import load_documents
from backend.app.services.embedding_service import embed_document
from backend.app.services.text_chunker import chunk_documents
from backend.app.services.vector_store import (
    COLLECTION_NAME,
    create_qdrant_client,
    ensure_collection,
)


def create_point_id(chunk_id):
    return str(
        uuid5(
            NAMESPACE_URL,
            f"secure-rag-assistant/{chunk_id}",
        )
    )


def create_qdrant_point(chunk):
    embedding = embed_document(
        text=chunk["content"],
        title=chunk["title"],
    )

    return models.PointStruct(
        id=create_point_id(chunk["chunk_id"]),
        vector=embedding,
        payload={
            "chunk_id": chunk["chunk_id"],
            "document_id": chunk["document_id"],
            "title": chunk["title"],
            "department": chunk["department"],
            "allowed_roles": chunk["allowed_roles"],
            "content": chunk["content"],
        },
    )


def ingest_documents():
    documents = load_documents()
    chunks = chunk_documents(documents)

    print(f"Preparing {len(chunks)} chunks for ingestion.")

    points = []

    for index, chunk in enumerate(chunks, start=1):
        print(
            f"Embedding {index}/{len(chunks)}: "
            f"{chunk['chunk_id']}"
        )

        points.append(create_qdrant_point(chunk))

    client = create_qdrant_client()

    try:
        ensure_collection(client)

        client.upsert(
            collection_name=COLLECTION_NAME,
            points=points,
            wait=True,
        )

        collection = client.get_collection(COLLECTION_NAME)

        print("Ingestion completed successfully.")
        print(f"Points stored: {collection.points_count}")
    finally:
        client.close()


def main():
    ingest_documents()


if __name__ == "__main__":
    main()