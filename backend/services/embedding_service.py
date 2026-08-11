from sentence_transformers import SentenceTransformer

# Load model once (384‑dimensional embeddings)
model = SentenceTransformer('all-MiniLM-L6-v2')

def get_embedding(text: str) -> list[float]:
    """Return a 384‑dimensional embedding for the given text."""
    return model.encode(text).tolist()