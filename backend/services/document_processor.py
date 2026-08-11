import os
from pypdf import PdfReader
from docx import Document
from services.chunker import chunk_text
from services.embedding_service import get_embedding
from services.db_service import create_document, insert_chunk

async def parse_and_store(file_path: str, filename: str, user_id: str) -> str:
    ext = os.path.splitext(filename)[1].lower()

    if ext == '.pdf':
        reader = PdfReader(file_path)
        doc_record = create_document(user_id, filename)
        doc_id = doc_record["id"]
        global_chunk_index = 0

        # Process page by page to keep page numbers
        for page_num, page in enumerate(reader.pages, start=1):
            page_text = page.extract_text()
            if not page_text:
                continue
            # Chunk this page's text
            chunks = chunk_text(page_text, chunk_size=500, overlap=50)
            for chunk in chunks:
                embedding = get_embedding(chunk)
                metadata = {
                    "chunk_index": global_chunk_index,
                    "page": page_num,
                    "document_id": doc_id,
                    "filename": filename
                }
                insert_chunk(doc_id, global_chunk_index, chunk, embedding, metadata)
                global_chunk_index += 1
        return doc_id

    elif ext == '.docx':
        # DOCX doesn't have reliable page numbers – we'll mark as page 1
        doc = Document(file_path)
        text = "\n".join([para.text for para in doc.paragraphs])
        chunks = chunk_text(text, chunk_size=500, overlap=50)
        doc_record = create_document(user_id, filename)
        doc_id = doc_record["id"]
        for i, chunk in enumerate(chunks):
            embedding = get_embedding(chunk)
            metadata = {
                "chunk_index": i,
                "page": 1,             # no page info for DOCX
                "document_id": doc_id,
                "filename": filename
            }
            insert_chunk(doc_id, i, chunk, embedding, metadata)
        return doc_id
    else:
        raise ValueError("Unsupported file type")