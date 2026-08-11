import React from 'react';
import { MessageSquare, FileText, Sparkles } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
    return (
        <header style={{ padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'linear-gradient(135deg, #c043ff, #00f2fe)', padding: '10px', borderRadius: '12px' }}>
                    <Sparkles size={24} color="#fff" />
                </div>
                <div>
                    <h1 style={{ fontSize: '20px', fontWeight: '700', background: 'linear-gradient(90deg, #fff, #8892b0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Smart Extractor & Chat Service
                    </h1>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Production-grade LLM Service</p>
                </div>
            </div>

            <nav className="glass-panel" style={{ padding: '6px', display: 'flex', gap: '6px', borderRadius: '16px' }}>
                <button
                    onClick={() => setActiveTab('chat')}
                      className={`glass-button ${activeTab === 'chat' ? 'nav-tab-active' : ''}`}
                    style={{
                        background: activeTab === 'chat' ? 'linear-gradient(135deg, rgba(192, 67, 255, 0.6), rgba(0, 242, 254, 0.6))' : 'transparent',
                        border: 'none'
                    }}
                >
                    <MessageSquare size={16} /> Streaming Chat
                </button>
                <button
                    onClick={() => setActiveTab('extract')}
                    className={`glass-button ${activeTab === 'extract' ? 'nav-tab-active' : ''}`}
                    style={{
                        background: activeTab === 'extract' ? 'linear-gradient(135deg, rgba(192, 67, 255, 0.6), rgba(0, 242, 254, 0.6))' : 'transparent',
                        border: 'none'
                    }}
                >
                    <FileText size={16} /> JSON Extractor
                </button>
            </nav>
        </header>
    );
}