from backend.app.services.document_loader import load_documents


def split_text(text, chunk_size=80, overlap=20):
    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than zero.")

    if overlap < 0 or overlap >= chunk_size:
        raise ValueError(
            "overlap must be zero or smaller than chunk_size."
        )

    words = text.split()

    if not words:
        return []

    chunks = []
    start = 0

    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunks.append(" ".join(words[start:end]))

        if end == len(words):
            break

        start = end - overlap

    return chunks


def chunk_documents(documents):
    document_chunks = []

    for document in documents:
        text_chunks = split_text(document["content"])

        for index, chunk_text in enumerate(text_chunks, start=1):
            document_chunks.append(
                {
                    "chunk_id": (
                        f"{document['document_id']}-CHUNK-{index:03d}"
                    ),
                    "document_id": document["document_id"],
                    "title": document["title"],
                    "department": document["department"],
                    "allowed_roles": document["allowed_roles"],
                    "content": chunk_text,
                }
            )

    return document_chunks


def main():
    documents = load_documents()
    chunks = chunk_documents(documents)

    print(f"Documents loaded: {len(documents)}")
    print(f"Chunks created: {len(chunks)}")

    for chunk in chunks:
        print(
            f"- {chunk['chunk_id']} "
            f"| Words: {len(chunk['content'].split())} "
            f"| Roles: {chunk['allowed_roles']}"
        )


if __name__ == "__main__":
    main()
    