import React from 'react';
import { X, Code, FileText, CheckCircle, Copy } from 'lucide-react';

export const CodeModal = ({ isOpen, onClose, filePath, fileContent }) => {
  if (!isOpen) return null;

  const handleCopy = () => {
    if (fileContent) {
      navigator.clipboard.writeText(fileContent);
    }
  };

  const lines = (fileContent || '// File content not available in current indexed scope').split('\n');

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Code size={20} color="var(--accent-secondary)" />
            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', color: '#fff' }}>
              {filePath || 'Source Code Viewer'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleCopy} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
              <Copy size={13} /> Copy Code
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div style={{
          flex: 1,
          background: '#090d16',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '1rem',
          overflowY: 'auto',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '0.8125rem',
          lineHeight: '1.6'
        }}>
          {lines.map((line, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '1rem' }}>
              <span style={{ color: '#475569', minWidth: '35px', textAlign: 'right', userSelect: 'none' }}>
                {idx + 1}
              </span>
              <span style={{ color: line.includes('import ') ? '#38bdf8' : line.includes('export ') ? '#c084fc' : '#e2e8f0', whiteSpace: 'pre-wrap' }}>
                {line}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
