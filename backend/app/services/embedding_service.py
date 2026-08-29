import os

from dotenv import load_dotenv
from google import genai
from google.genai import types


load_dotenv()

EMBEDDING_MODEL = os.getenv(
    "GEMINI_EMBEDDING_MODEL",
    "gemini-embedding-2",
)

EMBEDDING_DIMENSION = int(
    os.getenv("EMBEDDING_DIMENSION", "768")
)


def create_client():
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise ValueError("GEMINI_API_KEY was not found.")

    return genai.Client(api_key=api_key)


def embed_document(text, title):
    if not text.strip():
        raise ValueError("Document text cannot be empty.")

    prepared_text = f"title: {title} | text: {text}"

    client = create_client()

    response = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=prepared_text,
        config=types.EmbedContentConfig(
            output_dimensionality=EMBEDDING_DIMENSION
        ),
    )

    if not response.embeddings:
        raise RuntimeError("Gemini did not return an embedding.")

    return response.embeddings[0].values


def main():
    embedding = embed_document(
        text="Employees receive fourteen days of annual leave.",
        title="Employee Handbook",
    )

    print(f"Embedding model: {EMBEDDING_MODEL}")
    print(f"Vector dimensions: {len(embedding)}")
    print(f"First five values: {embedding[:5]}")

def embed_query(question):
    if not question.strip():
        raise ValueError("Question cannot be empty.")

    prepared_question = (
        f"task: question answering | query: {question}"
    )

    client = create_client()

    response = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=prepared_question,
        config=types.EmbedContentConfig(
            output_dimensionality=EMBEDDING_DIMENSION
        ),
    )

    if not response.embeddings:
        raise RuntimeError("Gemini did not return an embedding.")

    return response.embeddings[0].values


if __name__ == "__main__":
    main()