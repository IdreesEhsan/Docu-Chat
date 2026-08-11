from fastapi import APIRouter, UploadFile, File, Depends
from services.document_processor import parse_and_store
from services.db_service import get_user_documents, delete_document
from dependencies import get_current_user
import shutil, os

router = APIRouter(prefix="/api/documents", tags=["documents"])

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    user = Depends(get_current_user)
):
    """Upload a PDF/DOCX, process and store embeddings."""
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    try:
        doc_id = await parse_and_store(temp_path, file.filename, user.id)
        return {"document_id": doc_id, "filename": file.filename}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@router.get("/")
async def list_documents(user = Depends(get_current_user)):
    """Return all documents for the authenticated user."""
    return get_user_documents(user.id)

@router.delete("/{doc_id}")
async def remove_document(doc_id: str, user = Depends(get_current_user)):
    """Delete a document and its chunks (CASCADE)."""
    delete_document(doc_id)
    return {"status": "deleted"}