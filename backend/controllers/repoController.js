import {
  getRepositories,
  getRepositoryById,
  indexRepository,
  getAllIndexedFilesWithDetails,
  addExplicitFile,
  batchAddExplicitFiles,
  removeExplicitFile,
} from '../services/codeIndexer.js';

let analysisHistory = [
  {
    id: 'HIST-1',
    requirementId: 'JIRA-241',
    title: 'Multi-Factor Authentication on High-Value Orders',
    status: 'Completed',
    confidence: '97%',
    impactedFiles: 4,
    timestamp: '10 mins ago',
  },
  {
    id: 'HIST-2',
    requirementId: 'JIRA-182',
    title: 'OAuth2 & JWT Token Refresh Pipeline',
    status: 'Completed',
    confidence: '94%',
    impactedFiles: 3,
    timestamp: '2 hours ago',
  },
  {
    id: 'HIST-3',
    requirementId: 'JIRA-305',
    title: 'Stripe Webhook Signature Verification & Idempotency',
    status: 'Completed',
    confidence: '92%',
    impactedFiles: 2,
    timestamp: '1 day ago',
  },
];

export const addHistoryEntry = (entry) => {
  analysisHistory = [entry, ...analysisHistory.filter((h) => h.requirementId !== entry.requirementId)];
};

export const handleGetRepositories = (req, res) => {
  const repos = getRepositories();
  return res.status(200).json({ repositories: repos });
};

export const handleScanRepository = (req, res) => {
  const { repoId } = req.body;
  const result = indexRepository(repoId || 'repo-1');
  return res.status(200).json({
    message: 'Repository AST scan complete',
    ...result,
  });
};

export const handleGetDashboardStats = (req, res) => {
  const repos = getRepositories();
  const totalFiles = repos.reduce((acc, r) => acc + (r.filesCount || 0), 0);

  return res.status(200).json({
    connectedRepos: repos.length,
    indexedRequirements: analysisHistory.length + 15,
    aiReviewScore: '96%',
    repoTestCoverage: repos[0]?.coverage || '91%',
    totalTrackedFiles: totalFiles,
    activeRepo: repos[0],
  });
};

export const handleGetHistory = (req, res) => {
  return res.status(200).json({ history: analysisHistory });
};

// Explicit Files Handlers
export const handleGetRepoFiles = (req, res) => {
  const repoId = req.query.repoId || 'repo-1';
  const files = getAllIndexedFilesWithDetails(repoId);
  return res.status(200).json({
    repoId,
    totalFiles: files.length,
    files,
  });
};

export const handleAddExplicitFile = (req, res) => {
  const { repoId = 'repo-1', filePath, content, module } = req.body;
  if (!filePath) {
    return res.status(400).json({ error: 'File path relative to root is required (e.g., src/services/auth.js).' });
  }

  try {
    const file = addExplicitFile(repoId, { filePath, content, module });
    return res.status(201).json({
      message: 'File added and indexed successfully',
      file,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

export const handleBatchAddExplicitFiles = (req, res) => {
  const { repoId = 'repo-1', files = [] } = req.body;
  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'Array of files is required.' });
  }

  try {
    const added = batchAddExplicitFiles(repoId, files);
    return res.status(201).json({
      message: `Successfully indexed ${added.length} files.`,
      added,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

export const handleDeleteExplicitFile = (req, res) => {
  const repoId = req.query.repoId || req.body.repoId || 'repo-1';
  const fileIdentifier = req.params.fileId || req.query.filePath || req.body.filePath;

  if (!fileIdentifier) {
    return res.status(400).json({ error: 'File ID or filePath is required.' });
  }

  const result = removeExplicitFile(repoId, fileIdentifier);
  return res.status(200).json({
    message: 'File removed from index registry',
    ...result,
  });
};
