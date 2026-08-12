const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_BASE_URL = BASE.replace(/\/+$/, '') + '/api';

// Helper to build headers with JWT
const getHeaders = () => {
    const token = localStorage.getItem('access_token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

// ========== Auth ==========
export async function registerAPI(data) {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Registration failed');
    return res.json();
}

export async function verifyOtpAPI(email, otp) {
    const res = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Verification failed');
    return res.json();
}

export async function loginAPI(email, password) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Login failed');
    return res.json();
}

// ========== Chat history ==========
export async function fetchSessions() {
    const res = await fetch(`${API_BASE_URL}/chat/sessions`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch sessions');
    return res.json();
}

export async function fetchSessionMessages(sessionId) {
    const res = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}/messages`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch messages');
    return res.json();
}

// ========== Documents ==========
export async function uploadDocument(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE_URL}/documents/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
        body: formData
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
}

export async function fetchDocuments() {
    // ✅ trailing slash matches backend endpoint
    const res = await fetch(`${API_BASE_URL}/documents/`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
    });
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
}

export async function deleteDocument(docId) {
    const res = await fetch(`${API_BASE_URL}/documents/${docId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
    });
    if (!res.ok) throw new Error('Delete failed');
    return res.json();
}

// ========== RAG Chat (streaming) ==========
export async function streamRagChat(
    messages, systemPrompt, customPrompt,
    onChunk, onSources, sessionId, onSessionCreated, signal
) {
    const res = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: getHeaders(),
        signal,
        body: JSON.stringify({
            messages,
            system_prompt: systemPrompt,
            custom_system_prompt: customPrompt,
            session_id: sessionId
        })
    });
    if (!res.ok) throw new Error(`Server error: ${res.statusText}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                if (data === '[DONE]') return;
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.session_id && onSessionCreated) onSessionCreated(parsed.session_id);
                    if (parsed.content) onChunk(parsed.content);
                    if (parsed.sources) onSources(parsed.sources);
                } catch(e) { console.error(e); }
            }
        }
    }
}