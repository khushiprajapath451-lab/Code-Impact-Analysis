import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ImpactAnalyzer } from './components/ImpactAnalyzer';
import { CodebaseUploader } from './components/CodebaseUploader';
import { HistoryView } from './components/HistoryView';
import { LoginPage } from './components/LoginPage';
import { Sparkles, Compass } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState('analyze');
  const [user, setUser] = useState(null);
  const [currentRepoName, setCurrentRepoName] = useState('ecommerce-microservice');
  
  // Selected history session for restoring into analyzer
  const [restoredSession, setRestoredSession] = useState(null);

  useEffect(() => {
    // Check saved session
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        setUser({ username: 'Active Developer', email: 'developer@example.com' });
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const handleCodebaseIndexed = (repoName) => {
    setCurrentRepoName(repoName);
    setActiveTab('analyze');
  };

  const handleRestoreFromHistory = (sessionItem) => {
    setRestoredSession(sessionItem);
    setCurrentRepoName(sessionItem.repoName);
    setActiveTab('analyze');
  };

  // 1. If not logged in, begin with Login Page
  if (!user) {
    return <LoginPage onAuthSuccess={(userData) => setUser(userData)} />;
  }

  // 2. Once authenticated, display main CodeSense workspace
  return (
    <div className="app-container">
      <Navbar
        user={user}
        onOpenAuth={() => {}}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="main-content">
        {/* Hero Header */}
        <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span className="badge badge-primary">
                <Sparkles size={12} />
                Gemini AI Intelligence
              </span>
              <span className="badge badge-cyan">AST & Dependency Aware</span>
            </div>
            <h1 style={{ fontSize: '2.1rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #ffffff 40%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              AI Codebase Impact & Requirement Primer
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '700px', marginTop: '0.25rem' }}>
              Feed Jira user stories or technical specs to pinpoint exact candidate files, callers, affected test suites, and potential risks before writing code.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-color)',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem'
            }}>
              <Compass size={18} color="var(--accent-secondary)" />
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Active Target: <strong style={{ color: '#fff' }}>{currentRepoName}</strong>
              </span>
            </div>
          </div>
        </header>

        {/* Tab View */}
        {activeTab === 'analyze' && (
          <ImpactAnalyzer
            indexedRepoName={currentRepoName}
            onSwitchToIndexer={() => setActiveTab('codebase')}
            initialRequirement={restoredSession?.brdText}
            initialReport={restoredSession?.analysis}
          />
        )}
        
        {activeTab === 'codebase' && (
          <CodebaseUploader
            currentRepoName={currentRepoName}
            onCodebaseIndexed={handleCodebaseIndexed}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            onRestoreAnalysis={handleRestoreFromHistory}
          />
        )}
      </main>
    </div>
  );
}

export default App;
