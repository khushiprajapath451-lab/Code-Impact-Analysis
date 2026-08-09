import React, { useEffect, useState } from 'react';
import { Cpu, ShieldCheck, User as UserIcon, LogOut, CheckCircle2, AlertCircle, History, Sparkles } from 'lucide-react';
import { authAPI, agentAPI } from '../services/api';

export const Navbar = ({ user, onOpenAuth, onLogout, activeTab, setActiveTab }) => {
  const [backendHealthy, setBackendHealthy] = useState(null);
  const [historyCount, setHistoryCount] = useState(0);

  const checkStatus = async () => {
    try {
      await authAPI.checkHealth();
      setBackendHealthy(true);
      const hist = await agentAPI.getHistory();
      setHistoryCount(hist.history?.length || 0);
    } catch (err) {
      setBackendHealthy(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, [activeTab]);

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div className="brand-logo" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('analyze')}>
            <div className="brand-icon">
              <Cpu size={22} />
            </div>
            <div>
              <span style={{ background: 'linear-gradient(90deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                CodeSense
              </span>
              <span style={{ color: 'var(--accent-secondary)', fontSize: '0.8em', marginLeft: '4px' }}>AI</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('analyze')}
              className={`btn ${activeTab === 'analyze' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.4rem 0.9rem', fontSize: '0.8125rem' }}
            >
              <Sparkles size={14} />
              <span>Impact Analyzer</span>
            </button>
            <button
              onClick={() => setActiveTab('codebase')}
              className={`btn ${activeTab === 'codebase' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.4rem 0.9rem', fontSize: '0.8125rem' }}
            >
              Codebase Indexer
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.4rem 0.9rem', fontSize: '0.8125rem', position: 'relative' }}
            >
              <History size={14} />
              <span>Previous Work</span>
              {historyCount > 0 && (
                <span style={{
                  background: 'var(--accent-secondary)',
                  color: '#0f172a',
                  fontWeight: 800,
                  fontSize: '0.65rem',
                  padding: '1px 6px',
                  borderRadius: '99px',
                  marginLeft: '4px'
                }}>
                  {historyCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Server status indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.75rem',
            padding: '0.25rem 0.6rem',
            borderRadius: 'var(--radius-full)',
            background: backendHealthy ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${backendHealthy ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: backendHealthy ? '#34d399' : '#f87171'
          }}>
            {backendHealthy ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
            <span>{backendHealthy ? 'Backend Active (:5000)' : 'Backend Offline'}</span>
          </div>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(255,255,255,0.05)',
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem'
              }}>
                <ShieldCheck size={16} color="var(--accent-secondary)" />
                <span style={{ fontWeight: 600 }}>{user.username || user.name || 'Developer'}</span>
              </div>
              <button
                onClick={onLogout}
                className="btn btn-secondary"
                title="Logout"
                style={{ padding: '0.4rem 0.6rem' }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.9rem', fontSize: '0.8125rem' }}
            >
              <UserIcon size={14} />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};
