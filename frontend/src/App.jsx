import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ChatView from './components/ChatView';
import DocumentPanel from './components/DocumentPanel';
import AuthView from './components/AuthView';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for existing token on mount
    if (localStorage.getItem('access_token')) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <AuthView onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
        <div style={{ paddingRight: '30px' }}>
          <button className="glass-button" onClick={handleLogout}
            style={{ border: '1px solid rgba(239, 68, 68, 0.5)', color: '#ff7675' }}>
            Logout
          </button>
        </div>
      </div>
      <main style={{ flex: 1, display: 'flex' }}>
        {/* Left sidebar: DocumentPanel + chat history is inside ChatView */}
        <div style={{ width: '280px', flexShrink: 0 }}>
          <DocumentPanel />
        </div>
        <div style={{ flex: 1 }}>
          <ChatView />
        </div>
      </main>
    </div>
  );
}