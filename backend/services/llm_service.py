import logging
from groq import AsyncGroq
from config import settings
from prompts.rag_prompt import RAG_SYSTEM_PROMPT

logger = logging.getLogger("uvicorn")
groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)

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

async def stream_rag_chat(messages, context_chunks, temperature=0.7):
    """Stream the LLM response with context chunks."""
    # Format context with numbered sources [1], [2], etc.
    context = ""
    for i, chunk in enumerate(context_chunks):
        context += f"[{i+1}] {chunk['content']}\n"

    system_msg = RAG_SYSTEM_PROMPT.format(context=context)

    full_messages = [{"role": "system", "content": system_msg}]
    for m in messages:
        full_messages.append({
            "role": m.get("role", "user"),
            "content": m.get("content", "")
        })

    stream = await groq_client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=full_messages,
        temperature=temperature,
        stream=True
    )
    async for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content