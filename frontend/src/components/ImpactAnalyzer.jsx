import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, Send, FileText, CheckCircle2, AlertTriangle, Layers, Copy, Check, Download, ExternalLink, ShieldCheck, CheckSquare, Square } from 'lucide-react';
import { agentAPI } from '../services/api';
import { SAMPLE_BRDS, SAMPLE_CODEBASES } from './SampleData';
import { CodeModal } from './CodeModal';

export const ImpactAnalyzer = ({ indexedRepoName, onSwitchToIndexer, initialRequirement, initialReport }) => {
  const [brdText, setBrdText] = useState(initialRequirement || SAMPLE_BRDS[0].text);
  const [targetRepo, setTargetRepo] = useState(indexedRepoName || 'ecommerce-microservice');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(initialReport || null);
  const [riskScore, setRiskScore] = useState('MEDIUM');
  const [errorMsg, setErrorMsg] = useState(null);
  const [copied, setCopied] = useState(false);
  
  // Interactive Code Inspection Modal
  const [modalFile, setModalFile] = useState(null);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);

  // Interactive Test Checklist State
  const [testChecklist, setTestChecklist] = useState({});

  useEffect(() => {
    if (initialRequirement) setBrdText(initialRequirement);
    if (initialReport) setAnalysisResult(initialReport);
  }, [initialRequirement, initialReport]);

  const handleSelectSampleBRD = (sample) => {
    setBrdText(sample.text);
  };

  const handleRunAnalysis = async () => {
    if (!brdText.trim()) {
      setErrorMsg('Please enter a Jira story or BRD requirement to analyze.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);
    setAnalysisResult(null);

    try {
      const data = await agentAPI.analyzeRequirement(brdText.trim(), targetRepo.trim());
      setAnalysisResult(data.analysis);
      if (data.riskScore) setRiskScore(data.riskScore);
    } catch (err) {
      setErrorMsg(
        err.response?.data?.error ||
        err.message ||
        'Error communicating with the Gemini Impact Agent.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopy = () => {
    if (analysisResult) {
      navigator.clipboard.writeText(analysisResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadReport = () => {
    if (!analysisResult) return;
    const blob = new Blob([`# Impact Primer Report\n\n**Repo**: ${targetRepo}\n**Date**: ${new Date().toLocaleString()}\n\n## Requirement\n${brdText}\n\n## Analysis\n${analysisResult}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `impact_analysis_${targetRepo}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenFileModal = (filePath) => {
    const cleanPath = filePath.replace(/[`*]/g, '').trim();
    // Lookup in sample codebase or files
    let content = null;
    const sample = SAMPLE_CODEBASES[targetRepo];
    if (sample) {
      const found = sample.files.find(f => cleanPath.includes(f.filePath) || f.filePath.includes(cleanPath));
      if (found) content = found.content;
    }

    if (!content) {
      content = `// File: ${cleanPath}\n// Ready for modifications based on requirement\n\nexport default function handler() {\n  // Implementation logic here...\n}`;
    }

    setModalFile({ path: cleanPath, content });
    setIsCodeModalOpen(true);
  };

  const toggleTestCheck = (testName) => {
    setTestChecklist(prev => ({
      ...prev,
      [testName]: !prev[testName]
    }));
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.9fr', gap: '1.5rem' }}>
      {/* Left Column: BRD Requirement Input */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FileText color="var(--accent-primary)" size={22} />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Requirement Input</h2>
          </div>
          <span className="badge badge-primary">Auto-Saved Session</span>
        </div>

        {/* Sample Templates */}
        <div>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={14} color="var(--accent-secondary)" />
            Load Sample Story / PRD:
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {SAMPLE_BRDS.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectSampleBRD(item)}
                className="btn btn-secondary"
                style={{
                  fontSize: '0.75rem',
                  padding: '0.45rem 0.65rem',
                  justifyContent: 'flex-start',
                  textAlign: 'left'
                }}
              >
                {item.title}
              </button>
            ))}
          </div>
        </div>

        {/* Target Repository Selection */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Target Codebase</label>
            {onSwitchToIndexer && (
              <button
                onClick={onSwitchToIndexer}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-secondary)',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                Manage Files ↗
              </button>
            )}
          </div>
          <input
            type="text"
            className="form-input"
            value={targetRepo}
            onChange={(e) => setTargetRepo(e.target.value)}
            placeholder="e.g. ecommerce-microservice"
          />
        </div>

        {/* BRD / Requirement Text Area */}
        <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', marginBottom: 0 }}>
          <label className="form-label">BRD / Jira Ticket Text</label>
          <textarea
            className="form-textarea"
            style={{
              flex: 1,
              minHeight: '200px',
              fontSize: '0.8125rem',
              lineHeight: '1.5'
            }}
            value={brdText}
            onChange={(e) => setBrdText(e.target.value)}
            placeholder="Paste your user story, acceptance criteria, or technical spec here..."
          />
        </div>

        {/* Analyze Button */}
        <div style={{ marginTop: 'auto' }}>
          <button
            onClick={handleRunAnalysis}
            disabled={isAnalyzing || !brdText.trim()}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem' }}
          >
            {isAnalyzing ? (
              <>
                <Bot size={18} className="animate-spin" />
                <span>Gemini Analyzing Code Graph...</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Generate Impact Primer</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Column: AI Analysis Output & Interactive Cards */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Bot color="var(--accent-secondary)" size={22} />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>AI Impact Primer & Blast Radius</h2>
            {analysisResult && (
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.2rem 0.5rem',
                borderRadius: 'var(--radius-full)',
                background: riskScore === 'HIGH' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                border: `1px solid ${riskScore === 'HIGH' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                color: riskScore === 'HIGH' ? '#fca5a5' : '#6ee7b7'
              }}>
                {riskScore} BLAST RADIUS
              </span>
            )}
          </div>
          {analysisResult && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleDownloadReport}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
              >
                <Download size={13} /> Export .md
              </button>
              <button
                onClick={handleCopy}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
              >
                {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Output container */}
        <div style={{
          flex: 1,
          background: 'rgba(10, 14, 26, 0.7)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(255,255,255,0.06)',
          padding: '1.5rem',
          overflowY: 'auto',
          minHeight: '450px'
        }}>
          {isAnalyzing && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              minHeight: '350px',
              gap: '1rem',
              color: 'var(--text-secondary)'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                border: '3px solid rgba(99, 102, 241, 0.2)',
                borderTopColor: 'var(--accent-primary)',
                animation: 'spin 1s linear infinite'
              }} />
              <p style={{ fontWeight: 500, fontSize: '0.95rem' }}>
                Analyzing requirement against indexed files with Gemini AI Agent...
              </p>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Predicting candidate files, blast radius, callers & affected test suites
              </span>
            </div>
          )}

          {errorMsg && (
            <div style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}>
              <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Analysis Error</strong>
                <span style={{ fontSize: '0.85rem' }}>{errorMsg}</span>
              </div>
            </div>
          )}

          {!isAnalyzing && !errorMsg && !analysisResult && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              minHeight: '350px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              gap: '1rem'
            }}>
              <Layers size={42} strokeWidth={1.5} color="var(--border-color)" />
              <div>
                <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Ready for Analysis</h4>
                <p style={{ fontSize: '0.875rem', maxWidth: '400px' }}>
                  Select a preset on the left or paste your Jira requirement, then click "Generate Impact Primer".
                </p>
              </div>
            </div>
          )}

          {!isAnalyzing && analysisResult && (
            <div className="markdown-analysis">
              {/* Render structured lines with interactive clickable file links & test checkboxes */}
              {analysisResult.split('\n').map((line, index) => {
                if (line.startsWith('###')) {
                  return <h3 key={index}>{line.replace(/^###\s*/, '')}</h3>;
                }
                if (line.startsWith('##')) {
                  return <h2 key={index} style={{ fontSize: '1.4rem', margin: '1.25rem 0 0.5rem' }}>{line.replace(/^##\s*/, '')}</h2>;
                }

                // Section header block (Primary Files, Tests, Upstream)
                if (line.startsWith('- **') || line.startsWith('* **')) {
                  const match = line.match(/^[-*]\s*\*\*(.*?)\*\*:\s*(.*)$/);
                  if (match) {
                    return (
                      <div key={index} style={{
                        marginTop: '1rem',
                        marginBottom: '0.5rem',
                        background: 'rgba(99, 102, 241, 0.08)',
                        padding: '0.6rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <span style={{ color: 'var(--accent-secondary)', fontWeight: 700 }}>
                          {match[1]}
                        </span>
                        {match[2] && <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{match[2]}</span>}
                      </div>
                    );
                  }
                }

                // Candidate file items or test items
                if (line.trim().startsWith('* `') || line.trim().startsWith('- `') || line.includes('.js`') || line.includes('.ts`') || line.includes('.jsx`')) {
                  const fileMatch = line.match(/`([^`]+)`/);
                  const filename = fileMatch ? fileMatch[1] : null;

                  if (filename && (filename.includes('test') || filename.includes('spec'))) {
                    // Test item with runnable checkbox
                    const isChecked = Boolean(testChecklist[filename]);
                    return (
                      <div
                        key={index}
                        onClick={() => toggleTestCheck(filename)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          padding: '0.45rem 0.75rem',
                          background: isChecked ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${isChecked ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.05)'}`,
                          borderRadius: 'var(--radius-md)',
                          marginBottom: '0.4rem',
                          cursor: 'pointer'
                        }}
                      >
                        {isChecked ? <CheckSquare size={16} color="#34d399" /> : <Square size={16} color="#64748b" />}
                        <span style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: '0.8125rem',
                          color: isChecked ? '#34d399' : '#e2e8f0',
                          textDecoration: isChecked ? 'line-through' : 'none'
                        }}>
                          {filename}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: 'auto' }}>
                          {isChecked ? 'Verified ✓' : 'Mark test updated'}
                        </span>
                      </div>
                    );
                  }

                  if (filename) {
                    return (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.45rem 0.75rem',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.05)',
                          borderRadius: 'var(--radius-md)',
                          marginBottom: '0.4rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-secondary)', fontSize: '0.8125rem' }}>
                            {filename}
                          </span>
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                            {line.replace(/.*`[^`]+`/, '')}
                          </span>
                        </div>
                        <button
                          onClick={() => handleOpenFileModal(filename)}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                        >
                          <ExternalLink size={12} /> View Code
                        </button>
                      </div>
                    );
                  }
                }

                if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                  return (
                    <li key={index} style={{ marginLeft: '1.25rem', marginBottom: '0.4rem', color: '#cbd5e1' }}>
                      {line.replace(/^[-*]\s*/, '')}
                    </li>
                  );
                }

                if (!line.trim()) {
                  return <div key={index} style={{ height: '0.4rem' }} />;
                }

                return <p key={index} style={{ marginBottom: '0.6rem', color: '#cbd5e1' }}>{line}</p>;
              })}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Code Modal */}
      <CodeModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        filePath={modalFile?.path}
        fileContent={modalFile?.content}
      />
    </div>
  );
};
