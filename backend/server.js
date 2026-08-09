import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import {
  registerUser,
  loginUser,
  getDashboardStats,
  requestPasswordReset,
  resetPassword
} from './controllers/authcontrollers.js';
import { uploadCodebase } from './controllers/repocontroller.js';
import {
  handleAnalyzeRequirement,
  getAnalysisHistory,
  deleteAnalysisHistoryItem,
  toggleStarHistoryItem
} from './controllers/agentController.js';

const app = express();

// Connect to MongoDB
connectDB();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/', (req, res) => {
  res.json({
    message: 'AI Code Intelligence Backend API is active',
    frontendUrl: 'http://localhost:3000',
    databaseStatus: mongoose.connection.readyState === 1 ? 'MongoDB Connected' : 'Running in In-Memory Dev Mode',
    endpoints: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'POST /api/auth/forgot-password',
      'POST /api/auth/reset-password',
      'GET /api/dashboard/stats',
      'POST /api/codebase/upload',
      'POST /api/agent/analyze',
      'GET /api/agent/history',
      'DELETE /api/agent/history/:id',
      'PATCH /api/agent/history/:id/star',
      'GET /api/health'
    ]
  });
});

app.get('/api/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.json({
    status: 'ok',
    database: isDbConnected ? 'connected' : 'in-memory-dev-mode',
    databaseHost: isDbConnected ? mongoose.connection.host : 'local memory cache',
    timestamp: new Date().toISOString()
  });
});

// Auth Routes
app.post('/api/auth/register', registerUser);
app.post('/api/auth/login', loginUser);
app.post('/api/auth/forgot-password', requestPasswordReset);
app.post('/api/auth/reset-password', resetPassword);
app.get('/api/dashboard/stats', getDashboardStats);

// Codebase & Agent Analysis Routes
app.post('/api/codebase/upload', uploadCodebase);
app.post('/api/agent/analyze', handleAnalyzeRequirement);
app.get('/api/agent/history', getAnalysisHistory);
app.delete('/api/agent/history/:id', deleteAnalysisHistoryItem);
app.patch('/api/agent/history/:id/star', toggleStarHistoryItem);

// Catch-all for undefined backend routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found on backend server.',
    path: req.originalUrl,
    hint: 'Open http://localhost:3000 to view the frontend application UI.'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));