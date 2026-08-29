import express from 'express';
import { handleImpactAnalysis, handlePreReview } from '../controllers/agentController.js';
import {
  handleGetRepositories,
  handleScanRepository,
  handleGetDashboardStats,
  handleGetHistory,
  handleGetRepoFiles,
  handleAddExplicitFile,
  handleBatchAddExplicitFiles,
  handleDeleteExplicitFile,
} from '../controllers/repoController.js';
import { handleRegister, handleLogin, handleGetMe, handleUpdateIntegrations } from '../controllers/authController.js';

const router = express.Router();

// Authentication Routes
router.post('/auth/register', handleRegister);
router.post('/auth/login', handleLogin);
router.get('/auth/me', handleGetMe);

// Current User Routes (used by Settings page)
router.get('/me', handleGetMe);
router.patch('/me/integrations', handleUpdateIntegrations);

// Repository & Code Indexing Routes
router.get('/repositories', handleGetRepositories);
router.post('/repositories/scan', handleScanRepository);
router.get('/dashboard/stats', handleGetDashboardStats);
router.get('/history', handleGetHistory);

// Explicit Code Files Management
router.get('/repositories/files', handleGetRepoFiles);
router.post('/repositories/files', handleAddExplicitFile);
router.post('/repositories/files/batch', handleBatchAddExplicitFiles);
router.delete('/repositories/files/:fileId', handleDeleteExplicitFile);
router.delete('/repositories/files', handleDeleteExplicitFile);

// AI Agent Core Routes & Aliases
router.post('/impact-analysis', handleImpactAnalysis);
router.post('/impact', handleImpactAnalysis);
router.post('/analyze', handleImpactAnalysis);
router.post('/analyze-impact', handleImpactAnalysis);

router.post('/pre-review', handlePreReview);
router.post('/code-review', handlePreReview);
router.post('/review', handlePreReview);

// 404 handler for API routes
router.use((req, res) => {
  res.status(404).json({
    error: `API route '${req.method} ${req.originalUrl}' not found. Available endpoints: POST /api/impact-analysis, POST /api/pre-review, GET /api/repositories/files`,
  });
});

export default router;