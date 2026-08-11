import React from 'react';
import { MessageSquare, Sparkles } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
    return (
        <header style={{ padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'linear-gradient(135deg, #c043ff, #00f2fe)', padding: '10px', borderRadius: '12px' }}>
                    <Sparkles size={24} color="#fff" />
                </div>
                <div>
                    <h1
                        className="docuchat-title"
                        style={{
                            fontSize: '20px', fontWeight: '700',
                            background: 'linear-gradient(90deg, #fff, #00f2fe)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            display: 'inline-block'
                        }}
                    >
                        DocuChat
                    </h1>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>RAG-powered Document Q&A</p>
                </div>
            </div>

            <nav className="glass-panel" style={{ padding: '6px', display: 'flex', gap: '6px', borderRadius: '16px' }}>
                <button
                    onClick={() => setActiveTab('chat')}
                    className={`glass-button ${activeTab === 'chat' ? 'nav-tab-active' : ''}`}
                    style={{
                        background: activeTab === 'chat' ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(6, 182, 212, 0.6))' : 'transparent',
                        border: 'none'
                    }}
                >
                    <MessageSquare size={16} /> Chat
                </button>
            </nav>
        </header>
    );
}