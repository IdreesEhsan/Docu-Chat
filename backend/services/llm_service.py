import logging
from groq import AsyncGroq
from config import settings
from prompts.rag_prompt import RAG_SYSTEM_PROMPT

logger = logging.getLogger("uvicorn")
groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)

# ---------- Title generation ----------
async def generate_chat_title(user_prompt: str) -> str:
    """Generate a short title for a new chat session."""
    messages = [
        {"role": "system", "content": "Create a 3-4 word title for this chat."},
        {"role": "user", "content": user_prompt}
    ]
    res = await groq_client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=messages,
        max_tokens=15,
        temperature=0.3
    )
    return res.choices[0].message.content.strip()

# ---------- Streaming RAG chat ----------
async def stream_rag_chat(messages, context_chunks, temperature=0.7):
    """
    Stream the LLM response, using retrieved chunks as context.
    Yields content tokens one by one.
    """
    # Format context with numbered sources: [1] text... [2] text...
    context = ""
    for i, chunk in enumerate(context_chunks):
        context += f"[{i+1}] {chunk['content']}\n"

    # Inject context into the system prompt
    system_msg = RAG_SYSTEM_PROMPT.format(context=context)

    # Build the full message list – handles Pydantic models or dicts
    full_messages = [{"role": "system", "content": system_msg}]
    for m in messages:
        role = m.role if hasattr(m, 'role') else m['role']
        content = m.content if hasattr(m, 'content') else m['content']
        full_messages.append({"role": role, "content": content})

    # Call Groq with streaming
    stream = await groq_client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=full_messages,
        temperature=temperature,
        stream=True
    )

    async for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content