from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from models.schemas import ChatRequest, CreateSessionRequest
from services.llm_service import stream_rag_chat, generate_chat_title
from services.embedding_service import get_embedding
from services import db_service
from dependencies import get_current_user
import json, asyncio, logging

router = APIRouter(prefix="/api/chat", tags=["chat"])
logger = logging.getLogger("uvicorn")

# ---------- Session management ----------
@router.get("/sessions")
def list_sessions(user = Depends(get_current_user)):
    return db_service.get_all_sessions(user.id)

@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, user=Depends(get_current_user)):
    try:
        # Delete session (messages will be deleted via CASCADE)
        db_service.supabase.table("chat_sessions").delete().eq("id", session_id).execute()
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sessions")
def create_session(request: CreateSessionRequest, user = Depends(get_current_user)):
    return db_service.create_chat_session(user.id, request.system_prompt, request.title)

@router.get("/sessions/{session_id}/messages")
def get_session_messages(session_id: str, user = Depends(get_current_user)):
    return db_service.get_session_messages(session_id)

# ---------- Background title generator ----------
async def generate_and_update_title(session_id: str, prompt: str):
    try:
        new_title = await generate_chat_title(prompt)
        db_service.update_session_title(session_id, new_title)
    except Exception as e:
        logger.error(f"Title generation failed: {e}")

# ---------- Main RAG Chat Endpoint ----------
@router.post("")
async def chat_endpoint(request: ChatRequest, user = Depends(get_current_user)):
    """
    Handles a user message:
    1. Creates a new session if needed.
    2. Saves user message.
    3. Retrieves top‑k chunks via vector similarity.
    4. If no relevant chunks, refuses to answer.
    5. Otherwise, streams the LLM response with source citations.
    """
    current_session_id = request.session_id
    is_new_session = False

    # Create session if not provided
    if not current_session_id:
        is_new_session = True
        session = db_service.create_chat_session(
            user.id, system_prompt="RAG", title="New Chat"
        )
        if session:
            current_session_id = session["id"]
            # Background title generation
            if request.messages:
                asyncio.create_task(
                    generate_and_update_title(
                        current_session_id, request.messages[-1].content
                    )
                )

    # Save user message
    if current_session_id and request.messages:
        user_msg = request.messages[-1].content
        db_service.save_message(current_session_id, role="user", content=user_msg)

    # Retrieve relevant chunks
    query = request.messages[-1].content
    query_embedding = get_embedding(query)           # synchronous local call
    retrieved = db_service.similarity_search(query_embedding, top_k=10, threshold=0.15)

    context_chunks = [
        {
            "content": c["content"],
            "chunk_index": c["chunk_index"],
            "document_id": c["document_id"],
            "similarity": c["similarity"]
        }
        for c in retrieved
    ]

    # Refuse if no chunk meets the threshold
    if not retrieved:
        refuse_msg = "I cannot find the answer in the provided documents."
        db_service.save_message(current_session_id, role="assistant", content=refuse_msg)

        async def refuse_stream():
            yield f"data: {json.dumps({'content': refuse_msg})}\n\n"
            yield f"data: {json.dumps({'sources': []})}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(refuse_stream(), media_type="text/event-stream")

    # Stream LLM answer
    async def generate_and_save():
        full_response = ""
        try:
            async for token in stream_rag_chat(request.messages, context_chunks):
                full_response += token
                yield f"data: {json.dumps({'content': token})}\n\n"
        except Exception as e:
            logger.error(f"LLM error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            # Save final assistant message
            if current_session_id and full_response:
                db_service.save_message(current_session_id, role="assistant", content=full_response)
            # Emit source list
            sources = [
                {"chunk_index": c["chunk_index"], "document_id": c["document_id"]}
                for c in context_chunks
            ]
            yield f"data: {json.dumps({'sources': sources})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(generate_and_save(), media_type="text/event-stream")