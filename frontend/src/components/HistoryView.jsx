import React, { useState, useEffect } from 'react';
import { History, Star, Trash2, ArrowUpRight, Search, Download, Calendar, Layers, ShieldAlert, FileText } from 'lucide-react';
import { agentAPI } from '../services/api';

export const HistoryView = ({ onRestoreAnalysis }) => {
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStarred, setFilterStarred] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await agentAPI.getHistory();
      const items = data.history || [];
      setHistoryItems(items);
      if (items.length > 0 && !selectedItem) {
        setSelectedItem(items[0]);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this saved analysis?')) return;
    try {
      await agentAPI.deleteHistoryItem(id);
      const updated = historyItems.filter(item => (item.id !== id && item._id !== id));
      setHistoryItems(updated);
      if (selectedItem && (selectedItem.id === id || selectedItem._id === id)) {
        setSelectedItem(updated[0] || null);
      }
    } catch (err) {
      alert('Failed to delete item');
    }
  };

  const handleToggleStar = async (id, e) => {
    e.stopPropagation();
    try {
      await agentAPI.toggleStar(id);
      setHistoryItems(prev => prev.map(item => {
        if (item.id === id || item._id === id) {
          return { ...item, starred: !item.starred };
        }
        return item;
      }));
      if (selectedItem && (selectedItem.id === id || selectedItem._id === id)) {
        setSelectedItem(prev => ({ ...prev, starred: !prev.starred }));
      }
    } catch (err) {
      console.error('Failed to star item:', err);
    }
  };

  const handleExportMarkdown = (item) => {
    const filename = `${item.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_impact_analysis.md`;
    const content = `# ${item.title}\n\n**Repository**: ${item.repoName}\n**Date**: ${new Date(item.createdAt).toLocaleString()}\n**Risk Level**: ${item.riskScore}\n\n## Requirement / BRD\n${item.brdText}\n\n## AI Impact Analysis Report\n${item.analysis}`;
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredItems = historyItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.repoName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.brdText.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStarred = filterStarred ? item.starred : true;
    return matchesSearch && matchesStarred;
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.9fr', gap: '1.5rem' }}>
      {/* Left Column: History list */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: 'calc(100vh - 200px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <History size={22} color="var(--accent-secondary)" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Analysis History</h2>
          </div>
          <span className="badge badge-primary">{filteredItems.length} Sessions</span>
        </div>

        {/* Search & Filter */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.3rem', fontSize: '0.8125rem' }}
              placeholder="Search previous requirements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
          </div>
          <button
            onClick={() => setFilterStarred(!filterStarred)}
            className={`btn ${filterStarred ? 'btn-primary' : 'btn-secondary'}`}
            title="Show Starred Only"
            style={{ padding: '0.5rem 0.75rem' }}
          >
            <Star size={14} fill={filterStarred ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* History List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
          paddingRight: '0.25rem'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
              Loading previous sessions...
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 1rem' }}>
              <FileText size={32} strokeWidth={1.5} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
              <p style={{ fontSize: '0.875rem' }}>No saved analysis sessions found.</p>
              <p style={{ fontSize: '0.75rem' }}>Run an Impact Analysis in the Analyzer tab to save your work!</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const id = item.id || item._id;
              const isSelected = selectedItem && (selectedItem.id === id || selectedItem._id === id);

              return (
                <div
                  key={id}
                  onClick={() => setSelectedItem(item)}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-input)',
                    border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', fontWeight: 600 }}>
                      {item.repoName}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button
                        onClick={(e) => handleToggleStar(id, e)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: item.starred ? '#fbbf24' : 'var(--text-muted)' }}
                      >
                        <Star size={13} fill={item.starred ? '#fbbf24' : 'none'} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(id, e)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.title}
                  </h4>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Calendar size={11} /> {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.4rem',
                      borderRadius: 'var(--radius-sm)',
                      background: item.riskScore === 'HIGH' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                      color: item.riskScore === 'HIGH' ? '#fca5a5' : '#6ee7b7'
                    }}>
                      {item.riskScore || 'MED'} RISK
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Selected Session Detail */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)' }}>
        {selectedItem ? (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span className="badge badge-cyan">{selectedItem.repoName}</span>
                  <span className="badge badge-primary">{new Date(selectedItem.createdAt).toLocaleString()}</span>
                </div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>{selectedItem.title}</h2>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleExportMarkdown(selectedItem)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
                >
                  <Download size={13} /> Export .MD
                </button>
                {onRestoreAnalysis && (
                  <button
                    onClick={() => onRestoreAnalysis(selectedItem)}
                    className="btn btn-primary"
                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
                  >
                    <ArrowUpRight size={13} /> Open in Analyzer
                  </button>
                )}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingRight: '0.5rem' }}>
              {/* Original BRD Requirement */}
              <div>
                <h4 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Original Requirement / BRD Story
                </h4>
                <div style={{
                  background: 'var(--bg-input)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '0.8125rem',
                  lineHeight: '1.6',
                  color: '#94a3b8'
                }}>
                  {selectedItem.brdText}
                </div>
              </div>

              {/* Saved AI Impact Primer */}
              <div>
                <h4 style={{ fontSize: '0.875rem', color: 'var(--accent-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  AI Impact Primer & Starting Map
                </h4>
                <div style={{
                  background: 'rgba(10, 14, 26, 0.85)',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid rgba(255,255,255,0.08)'
                }} className="markdown-analysis">
                  {selectedItem.analysis.split('\n').map((line, idx) => {
                    if (line.startsWith('###')) return <h3 key={idx}>{line.replace(/^###\s*/, '')}</h3>;
                    if (line.startsWith('- **') || line.startsWith('* **')) {
                      const match = line.match(/^[-*]\s*\*\*(.*?)\*\*:\s*(.*)$/);
                      if (match) {
                        return (
                          <div key={idx} style={{
                            display: 'flex',
                            gap: '0.5rem',
                            marginBottom: '0.6rem',
                            background: 'rgba(255,255,255,0.02)',
                            padding: '0.5rem 0.75rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid rgba(255,255,255,0.04)'
                          }}>
                            <span style={{ color: 'var(--accent-secondary)', fontWeight: 700, minWidth: '180px' }}>{match[1]}</span>
                            <span style={{ color: '#e2e8f0' }}>{match[2]}</span>
                          </div>
                        );
                      }
                    }
                    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                      return <li key={idx} style={{ marginLeft: '1.25rem', marginBottom: '0.35rem' }}>{line.replace(/^[-*]\s*/, '')}</li>;
                    }
                    if (!line.trim()) return <div key={idx} style={{ height: '0.4rem' }} />;
                    return <p key={idx} style={{ marginBottom: '0.5rem' }}>{line}</p>;
                  })}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: 'auto' }}>
            <Layers size={40} strokeWidth={1.5} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
            <p>Select an analysis session on the left to view the complete saved report.</p>
          </div>
        )}
      </div>
    </div>
  );
};
