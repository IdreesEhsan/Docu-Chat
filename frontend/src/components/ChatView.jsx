import React, { useState, useEffect, useRef } from 'react';
import { streamRagChat, fetchSessions, fetchSessionMessages } from '../services/api';
import { Send, Bot, User, Settings, Plus, MessageSquare, History } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const PRESET_PROMPTS = [
    "AI Tech Mentor",
    "Executive Assistant",
    "Creative Writer",
    "Strict Code Auditor"
];

/**
 * ChatView – the main chat interface with RAG capabilities.
 * Features:
 * - Real‑time streaming AI responses (Groq)
 * - Document‑grounded answers with inline source citations
 * - Chat session management (create, switch, delete)
 * - Custom system prompt / persona selection
 * - Glassmorphism UI with message animations, typing indicator, send pulse
 */
export default function ChatView() {
    // ---------- State ----------
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hello! Upload documents and ask questions.' }
    ]);
    const [input, setInput] = useState('');
    const [systemPrompt, setSystemPrompt] = useState('AI Tech Mentor');
    const [customPrompt, setCustomPrompt] = useState('');
    const [showConfig, setShowConfig] = useState(false);
    const [showHistory, setShowHistory] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [abortController, setAbortController] = useState(null);
    const [userEmail, setUserEmail] = useState('');
    const [sources, setSources] = useState([]);          // holds retrieved source chunks
    const messagesEndRef = useRef(null);

    // ---------- Auto‑scroll to latest message ----------
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ---------- Initial load: sessions + decode JWT ----------
    useEffect(() => {
        loadSessions();
        try {
            const token = localStorage.getItem('access_token');
            if (token) {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(c =>
                    '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
                ).join(''));
                const payload = JSON.parse(jsonPayload);
                setUserEmail(payload.email || 'Logged In User');
            }
        } catch (err) {
            console.error('Failed to decode JWT:', err);
            setUserEmail('Logged In User');
        }
    }, []);

    // ---------- Data fetching helpers ----------
    const loadSessions = async () => {
        try {
            const data = await fetchSessions();
            setSessions(data || []);
        } catch (err) {
            console.error('Failed to load history:', err);
        }
    };

    // ---------- Session handling ----------
    const handleSelectSession = async (session) => {
        // Abort any in‑flight stream before switching
        if (isGenerating && abortController) {
            abortController.abort();
            setIsGenerating(false);
        }
        setCurrentSessionId(session.id);
        setSystemPrompt(session.system_prompt);
        setIsGenerating(false);
        setSources([]);                               // clear old sources
        try {
            const historyMessages = await fetchSessionMessages(session.id);
            const formattedHistory = historyMessages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));
            setMessages(formattedHistory.length ? formattedHistory : [
                { role: 'assistant', content: 'Conversation loaded.' }
            ]);
        } catch (err) {
            console.error('Failed to load messages:', err);
        }
    };

    const handleNewChat = () => {
        // Abort active stream if any
        if (isGenerating && abortController) {
            abortController.abort();
            setIsGenerating(false);
        }
        setCurrentSessionId(null);
        setMessages([{ role: 'assistant', content: 'New chat started. Ask me anything!' }]);
        setSources([]);
    };

    // ---------- Send message (RAG pipeline) ----------
    const handleSend = async () => {
        if (!input.trim() || isGenerating) return;

        const userMessage = { role: 'user', content: input };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsGenerating(true);

        const assistantIndex = newMessages.length;                // where the AI response will appear
        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

        const controller = new AbortController();
        setAbortController(controller);

        try {
            await streamRagChat(
                newMessages,
                systemPrompt,
                customPrompt,
                // onChunk – append token to assistant message
                (chunk) => {
                    setMessages(prev => {
                        const updated = [...prev];
                        updated[assistantIndex] = {
                            ...updated[assistantIndex],
                            content: updated[assistantIndex].content + chunk
                        };
                        return updated;
                    });
                },
                // onSources – store the final list of source chunks
                (src) => setSources(src),
                currentSessionId,
                // onSessionCreated – assign new session ID and refresh list
                (assignedSessionId) => {
                    if (!currentSessionId) {
                        setCurrentSessionId(assignedSessionId);
                        loadSessions();
                    }
                },
                controller.signal
            );
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log("Stream aborted.");
                return;
            }
            setMessages(prev => {
                const updated = [...prev];
                updated[assistantIndex] = {
                    ...updated[assistantIndex],
                    content: updated[assistantIndex].content + `\n\n**[Error: ${err.message}]**`
                };
                return updated;
            });
        } finally {
            setIsGenerating(false);
            loadSessions();              // refresh session list (e.g., new title)
        }
    };

    // ---------- Render ----------
    return (
        <div style={{
            display: 'flex', gap: '16px', height: 'calc(100vh - 120px)',
            padding: '0 30px 20px', transition: 'all 0.3s ease'
        }}>
            {/* ========== 1. HISTORY SIDEBAR ========== */}
            {showHistory && (
                <div className="glass-panel" style={{
                    width: '260px', flexShrink: 0, padding: '16px',
                    display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden'
                }}>
                    <button className="glass-button"
                        style={{
                            width: '100%', justifyContent: 'center',
                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.4), rgba(6, 182, 212, 0.4))'
                        }}
                        onClick={handleNewChat}
                    >
                        <Plus size={16} /> New Chat
                    </button>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '8px' }}>
                        CHAT HISTORY
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {sessions.map(s => (
                            <div
                                key={s.id}
                                onClick={() => handleSelectSession(s)}
                                className="session-item"
                                style={{
                                    padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                                    background: currentSessionId === s.id ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                                    border: currentSessionId === s.id ? '1px solid var(--accent-cyan)' : '1px solid rgba(255, 255, 255, 0.05)',
                                    fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <MessageSquare size={14} style={{ flexShrink: 0, color: 'var(--accent-cyan)' }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</span>
                            </div>
                        ))}
                    </div>

                    {/* User profile footer */}
                    <div style={{
                        marginTop: 'auto', padding: '10px 12px', borderRadius: '12px',
                        background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--glass-border)',
                        display: 'flex', alignItems: 'center', gap: '10px'
                    }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 'bold', fontSize: '14px', color: '#fff', flexShrink: 0
                        }}>
                            {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div style={{ overflow: 'hidden', flex: 1 }}>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Logged in as
                            </div>
                            <div style={{
                                fontSize: '12px', color: '#fff', fontWeight: '500',
                                textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap'
                            }}>
                                {userEmail || 'Active User'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========== 2. MAIN CHAT AREA ========== */}
            <div className="glass-panel" style={{
                flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
                height: '100%', overflow: 'hidden'
            }}>
                {/* Top bar */}
                <div style={{
                    padding: '14px 20px', borderBottom: '1px solid var(--glass-border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button className="glass-button" style={{ padding: '6px' }}
                            onClick={() => setShowHistory(!showHistory)} title="Toggle History">
                            <History size={16} />
                        </button>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            Persona: <span style={{ color: 'var(--accent-cyan)', fontWeight: '600' }}>
                                {customPrompt ? "Custom" : systemPrompt}
                            </span>
                        </div>
                    </div>
                    <button className="glass-button" style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => setShowConfig(!showConfig)}>
                        <Settings size={14} /> {showConfig ? 'Close Prompt Config' : 'Configure Prompt'}
                    </button>
                </div>

                {/* Messages container */}
                <div style={{
                    flex: 1, padding: '20px', overflowY: 'auto',
                    display: 'flex', flexDirection: 'column', gap: '16px'
                }}>
                    {messages.map((m, i) => (
                        <div key={i} className="message-row" style={{
                            display: 'flex', gap: '12px',
                            justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start'
                        }}>
                            {/* Bot icon (left) */}
                            {m.role === 'assistant' && (
                                <div style={{
                                    background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                                    width: '32px', height: '32px', borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <Bot size={18} color="#fff" />
                                </div>
                            )}

                            {/* Bubble */}
                            <div style={{
                                maxWidth: '70%', padding: '12px 16px', borderRadius: '16px',
                                background: m.role === 'user'
                                    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.4), rgba(6, 182, 212, 0.4))'
                                    : 'rgba(15, 23, 42, 0.7)',
                                border: '1px solid var(--glass-border)', lineHeight: '1.5', overflowX: 'auto',
                            }}>
                                {m.role === 'user' ? (
                                    <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                                ) : (
                                    <div className="markdown-body">
                                        {m.content
                                            ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                                            : (isGenerating && i === messages.length - 1)
                                                ? <div className="typing-indicator"><span></span><span></span><span></span></div>
                                                : ""
                                        }
                                        {/* Source citations (only for last assistant message when not generating) */}
                                        {m.role === 'assistant' && i === messages.length - 1 &&
                                         sources.length > 0 && !isGenerating && (
                                            <div style={{
                                                marginTop: '8px', fontSize: '12px', color: '#8892b0',
                                                borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px'
                                            }}>
                                                <strong>Sources:</strong> {sources.map(s => `[${s.chunk_index}]`).join(', ')}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* User icon (right) */}
                            {m.role === 'user' && (
                                <div style={{
                                    background: 'rgba(255, 255, 255, 0.1)', width: '32px', height: '32px',
                                    borderRadius: '50%', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', flexShrink: 0
                                }}>
                                    <User size={18} color="#fff" />
                                </div>
                            )}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <div style={{
                    padding: '16px', borderTop: '1px solid var(--glass-border)',
                    display: 'flex', gap: '12px', alignItems: 'flex-end'
                }}>
                    <textarea
                        className="glass-textarea"
                        placeholder="Type your message... (Shift + Enter for new line)"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        rows={1}
                        style={{
                            flex: 1, resize: 'none', minHeight: '45px',
                            maxHeight: '150px', overflowY: 'auto'
                        }}
                    />
                    <button
                        className={`glass-button ${input.trim() && !isGenerating ? 'send-pulse' : ''}`}
                        style={{ height: '45px' }}
                        onClick={handleSend}
                        disabled={isGenerating}
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>

            {/* ========== 3. PROMPT CONFIG SIDEBAR ========== */}
            {showConfig && (
                <div className="glass-panel" style={{
                    width: '280px', flexShrink: 0, padding: '16px',
                    display: 'flex', flexDirection: 'column', gap: '16px'
                }}>
                    <h3 style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Settings size={16} /> Prompt Config
                    </h3>
                    <div>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Role Preset</label>
                        <select
                            className="glass-select"
                            value={systemPrompt}
                            onChange={(e) => { setSystemPrompt(e.target.value); setCustomPrompt(''); }}
                            style={{ marginTop: '6px' }}
                        >
                            {PRESET_PROMPTS.map(p => (
                                <option key={p} value={p} style={{ background: '#0f172a' }}>{p}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Override Custom Prompt
                        </label>
                        <textarea
                            className="glass-textarea"
                            rows={5}
                            placeholder="Enter custom instructions..."
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            style={{ marginTop: '6px' }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}