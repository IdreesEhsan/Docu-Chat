import os
from pypdf import PdfReader
from docx import Document
from services.chunker import  chunk_text
from services.embedding_service import get_embedding
from services.db_service import create_document, insert_chunk

async def parse_and_store(file_path: str, filename: str, user_id: str) -> str:
    """
    Extract text from PDF/DOCX, chunk it, embed chunks, store in DB.
    """
    ext = os.path.splitext(filename)[1].lower()

    if ext == ".pdf":
        reader = PdfReader(file_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
    elif ext == ".docx":
        doc = Document(file_path)
        text = "\n".join([para.text for para in doc.paragraphs])
    else:
        raise ValueError("Unsupported file type")

    chunks = chunk_text(text, chunk_size=500, overlap=50)

    # Create document record
    doc_record = create_document(user_id, filename)
    doc_id = doc_record["id"]

    # Embed and store each chunk
    for i, chunk in enumerate(chunks):
        embedding = get_embedding(chunk)
        insert_chunk(doc_id, i, chunk, embedding, {"chunk_index": i})

    return doc_id