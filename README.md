# 📚 DocuChat — RAG-powered Document Q&A

DocuChat is a full‑stack application that lets users upload documents (PDF/DOCX) and ask questions.  
Answers are grounded in the uploaded content with **explicit source citations** (document name + page number).  
It uses **Retrieval‑Augmented Generation (RAG)** to provide accurate, traceable responses.

---

## ✨ Features

- 🔐 **Full authentication** – register, email verification, login (Supabase Auth)
- 📄 **Document upload** – PDF & DOCX parsing, chunking, local embedding (`all-MiniLM-L6-v2`)
- 🔍 **Vector search** – Supabase pgvector for similarity search
- 🤖 **RAG chat** – streaming answers via Groq (`openai/gpt-oss-120b`) with context injection
- 📌 **Source citations** – each answer shows the originating document and page number
- ❌ **Refusal handling** – explicitly declines to answer if the information isn't in the documents
- 💬 **Chat history** – auto‑generated session titles, delete sessions
- 🎨 **Modern UI** – glassmorphism design, message animations, responsive sidebars

---

## 🛠️ Tech Stack

| Layer       | Technology |
|-------------|------------|
| Frontend    | React, Vite, CSS (glassmorphism) |
| Backend     | FastAPI (Python) |
| LLM         | Groq (`openai/gpt-oss-120b`) |
| Embeddings  | `all-MiniLM-L6-v2` (384‑dim, local) |
| Vector DB   | Supabase (pgvector) |
| Database    | Supabase (PostgreSQL + Auth) |
| Deployment  | Railway (backend + frontend) |

---

## 📁 Project Structure

DocuChat/
├── backend/
│ ├── models/ # Pydantic schemas
│ ├── prompts/ # RAG system prompt
│ ├── routers/ # API endpoints
│ ├── services/ # Business logic
│ ├── config.py
│ ├── main.py
│ └── requirements.txt
├── frontend/
│ ├── src/
│ │ ├── components/ # React components
│ │ ├── services/ # API calls
│ │ └── styles/
│ └── package.json
└── README.md


---

## 🚀 Getting Started (Local)

### Prerequisites

- Python 3.10+
- Node.js 18+
- Supabase project with pgvector enabled
- Groq API key

### 1. Clone the repository

```bash
git clone https://github.com/your-username/DocuChat.git
cd DocuChat

### 2. Backend setup

cd backend
python -m venv venv
source venv/bin/activate      # Windows: .\venv\Scripts\activate
pip install -r requirements.txt


Create a .env file inside backend/:

GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_key

Run the backend:
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

4. Frontend setup

cd frontend
npm install
npm run dev
Open http://localhost:3000 in your browser.
Register an account (email confirmation can be disabled in Supabase for testing) and log in.

5. Upload documents & chat
Use the Documents panel (toggle with the 📄 button) to upload PDF/DOCX files.

Ask questions in the chat – answers will be grounded in the document content.

Source citations (document name + page number) appear below each answer.

If the answer isn't found, the system will respond with "I cannot find the answer in the provided documents."

📊 Chunking Strategy
Documents are split using a custom word‑based chunker with:

Chunk size: 500 words

Overlap: 50 words

Metadata preserved: page numbers (PDF), document name