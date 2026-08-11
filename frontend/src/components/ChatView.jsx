import React, { useState, useEffect, useRef } from 'react';
import { streamRagChat, fetchSessions, fetchSessionMessages } from '../services/api';
import { Send, Bot, User, Plus, MessageSquare, History } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DocumentPanel from './DocumentPanel';

/**
 * ChatView – the main chat interface with RAG capabilities.
 * Left sidebar contains two separate glass panels:
 *   1. Chat History (sessions + user footer)
 *   2. Document upload & list
 * Main area: streaming AI responses with inline source citations.
 */
export default function ChatView() {
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hello! Upload documents and ask questions.' }
    ]);
    const [input, setInput] = useState('');
    const systemPrompt = "RAG";
    const customPrompt = "";

    const [showHistory, setShowHistory] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [abortController, setAbortController] = useState(null);
    const [userEmail, setUserEmail] = useState('');
    const [sources, setSources] = useState([]);
    const messagesEndRef = useRef(null);

    // Auto‑scroll when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Load sessions and decode user email from JWT on mount
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

    const loadSessions = async () => {
        try {
            const data = await fetchSessions();
            setSessions(data || []);
        } catch (err) {
            console.error('Failed to load history:', err);
        }
    };

    const handleSelectSession = async (session) => {
        if (isGenerating && abortController) {
            abortController.abort();
            setIsGenerating(false);
        }
        setCurrentSessionId(session.id);
        setIsGenerating(false);
        setSources([]);
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
        if (isGenerating && abortController) {
            abortController.abort();
            setIsGenerating(false);
        }
        setCurrentSessionId(null);
        setMessages([{ role: 'assistant', content: 'New chat started. Ask me anything!' }]);
        setSources([]);
    };

    const handleSend = async () => {
        if (!input.trim() || isGenerating) return;

        const userMessage = { role: 'user', content: input };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsGenerating(true);

        const assistantIndex = newMessages.length;
        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

        const controller = new AbortController();
        setAbortController(controller);

        try {
            await streamRagChat(
                newMessages,
                systemPrompt,
                customPrompt,
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
                (src) => setSources(src),
                currentSessionId,
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
            loadSessions();
        }
    };

    return (
        <div style={{
            display: 'flex', gap: '16px', height: 'calc(100vh - 120px)',
            padding: '0 30px 20px', transition: 'all 0.3s ease'
        }}>
            {/* ========== LEFT COLUMN: two separate glass panels ========== */}
            {showHistory && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '260px', flexShrink: 0 }}>
                    {/* 1. Chat History Panel */}
                    <div className="glass-panel" style={{
                        padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px',
                        flex: '1 1 auto', overflow: 'hidden'
                    }}>
                        <button className="glass-button"
                            style={{
                                width: '100%', justifyContent: 'center',
                                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.4), rgba(6, 182, 212, 0.4))'
                            }}
                            onClick={handleNewChat}>
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
                                    }}>
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

                    {/* 2. Document Panel – separate box */}
                    <DocumentPanel />
                </div>
            )}

            {/* ========== MAIN CHAT AREA ========== */}
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
                            Persona: <span style={{ color: 'var(--accent-cyan)', fontWeight: '600' }}>RAG</span>
                        </div>
                    </div>
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

                            {/* Message bubble */}
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
        </div>
    );
}