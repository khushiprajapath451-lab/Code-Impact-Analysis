import React, { useState } from 'react';
import { Upload, FolderGit2, FileCode, CheckCircle2, Trash2, Plus, Code, Sparkles, Database } from 'lucide-react';
import { repoAPI } from '../services/api';
import { SAMPLE_CODEBASES } from './SampleData';

export const CodebaseUploader = ({ onCodebaseIndexed, currentRepoName }) => {
  const [repoName, setRepoName] = useState(currentRepoName || 'ecommerce-microservice');
  const [files, setFiles] = useState(SAMPLE_CODEBASES['ecommerce-microservice'].files);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [newFilePath, setNewFilePath] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const handleLoadSample = (sampleKey) => {
    const sample = SAMPLE_CODEBASES[sampleKey];
    if (sample) {
      setRepoName(sample.repoName);
      setFiles([...sample.files]);
      setSelectedFileIndex(0);
      setStatusMessage({ type: 'info', text: `Loaded preset: ${sample.repoName}` });
    }
  };

  const handleAddFile = () => {
    if (!newFilePath.trim() || !newFileContent.trim()) {
      alert('Please enter a file path and content.');
      return;
    }
    const updated = [...files, { filePath: newFilePath.trim(), content: newFileContent }];
    setFiles(updated);
    setSelectedFileIndex(updated.length - 1);
    setNewFilePath('');
    setNewFileContent('');
  };

  const handleDeleteFile = (index) => {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    if (selectedFileIndex >= updated.length) {
      setSelectedFileIndex(Math.max(0, updated.length - 1));
    }
  };

  const handleFileUpload = (e) => {
    const uploadedFiles = Array.from(e.target.files);
    if (uploadedFiles.length === 0) return;

    let readCount = 0;
    const newParsedFiles = [];

    uploadedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const relativePath = file.webkitRelativePath || file.name;
        newParsedFiles.push({
          filePath: relativePath,
          content: event.target.result
        });
        readCount++;
        if (readCount === uploadedFiles.length) {
          setFiles((prev) => [...prev, ...newParsedFiles]);
          setStatusMessage({ type: 'success', text: `Added ${newParsedFiles.length} uploaded files.` });
        }
      };
      reader.readAsText(file);
    });
  };

  const handleIndexCodebase = async () => {
    if (!repoName.trim()) {
      setStatusMessage({ type: 'error', text: 'Please provide a repository name.' });
      return;
    }
    if (files.length === 0) {
      setStatusMessage({ type: 'error', text: 'Add at least one code file to index.' });
      return;
    }

    setIsUploading(true);
    setStatusMessage(null);

    try {
      const res = await repoAPI.uploadCodebase(repoName.trim(), files);
      setStatusMessage({ type: 'success', text: res.message || `Indexed ${files.length} files successfully!` });
      if (onCodebaseIndexed) {
        onCodebaseIndexed(repoName.trim(), files);
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Failed to upload codebase to backend.'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const activeFile = files[selectedFileIndex];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '1.5rem' }}>
      {/* Left Column: Repository Config & File Tree */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FolderGit2 color="var(--accent-secondary)" size={22} />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Codebase Indexer</h2>
          </div>
          <span className="badge badge-cyan">{files.length} Files</span>
        </div>

        {/* Quick Load Sample Presets */}
        <div>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={14} color="var(--accent-primary)" />
            Load Sample Repository Preset:
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {Object.keys(SAMPLE_CODEBASES).map((key) => (
              <button
                key={key}
                onClick={() => handleLoadSample(key)}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
              >
                {SAMPLE_CODEBASES[key].repoName}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Repository Identifier Name</label>
          <input
            type="text"
            className="form-input"
            value={repoName}
            onChange={(e) => setRepoName(e.target.value)}
            placeholder="e.g. backend-api-v2"
          />
        </div>

        {/* File Tree List */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span className="form-label" style={{ marginBottom: 0 }}>Indexed Files</span>
            <label className="btn btn-outline" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer' }}>
              <Upload size={12} />
              <span>Upload Local Files</span>
              <input type="file" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          </div>

          <div style={{
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            maxHeight: '260px',
            overflowY: 'auto'
          }}>
            {files.map((file, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedFileIndex(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.55rem 0.75rem',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: selectedFileIndex === idx ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  cursor: 'pointer',
                  fontSize: '0.8125rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                  <FileCode size={15} color={selectedFileIndex === idx ? 'var(--accent-secondary)' : 'var(--text-muted)'} />
                  <span style={{
                    fontFamily: 'monospace',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    color: selectedFileIndex === idx ? '#fff' : 'var(--text-secondary)'
                  }}>
                    {file.filePath}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFile(idx);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '2px'
                  }}
                  title="Remove file"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Index Action */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {statusMessage && (
            <div style={{
              padding: '0.65rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              background: statusMessage.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              border: `1px solid ${statusMessage.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
              color: statusMessage.type === 'error' ? '#fca5a5' : '#6ee7b7'
            }}>
              {statusMessage.text}
            </div>
          )}

          <button
            onClick={handleIndexCodebase}
            disabled={isUploading || files.length === 0}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem' }}
          >
            <Database size={16} />
            <span>{isUploading ? 'Indexing Codebase in Backend...' : `Index ${files.length} Files in Knowledge Base`}</span>
          </button>
        </div>
      </div>

      {/* Right Column: Code Viewer & Add New File Form */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {activeFile ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Code size={18} color="var(--accent-secondary)" />
                <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.9rem' }}>
                  {activeFile.filePath}
                </span>
              </div>
              <span className="badge badge-primary">{activeFile.content.split('\n').length} lines</span>
            </div>

            <textarea
              className="form-textarea"
              style={{
                flex: 1,
                minHeight: '280px',
                fontSize: '0.8125rem',
                background: '#090d16',
                color: '#e2e8f0',
                border: '1px solid rgba(255,255,255,0.06)'
              }}
              value={activeFile.content}
              onChange={(e) => {
                const val = e.target.value;
                setFiles((prev) =>
                  prev.map((f, i) => (i === selectedFileIndex ? { ...f, content: val } : f))
                );
              }}
            />
          </>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 0' }}>
            No file selected.
          </div>
        )}

        {/* Add custom file manually */}
        <div style={{
          borderTop: '1px solid var(--border-color)',
          paddingTop: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Add Custom Source File
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              className="form-input"
              style={{ fontSize: '0.8125rem', padding: '0.5rem 0.75rem' }}
              value={newFilePath}
              onChange={(e) => setNewFilePath(e.target.value)}
              placeholder="e.g. src/middleware/rateLimiter.js"
            />
            <button
              onClick={handleAddFile}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 0.9rem', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}
            >
              <Plus size={14} /> Add File
            </button>
          </div>
          <textarea
            className="form-textarea"
            style={{ fontSize: '0.75rem', minHeight: '60px', padding: '0.5rem' }}
            value={newFileContent}
            onChange={(e) => setNewFileContent(e.target.value)}
            placeholder="// Paste file content here before clicking Add File..."
          />
        </div>
      </div>
    </div>
  );
};
