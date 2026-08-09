import mongoose from 'mongoose';

const analysisHistorySchema = new mongoose.Schema({
  userId: { type: String, default: 'anonymous' },
  title: { type: String, required: true },
  brdText: { type: String, required: true },
  repoName: { type: String, required: true },
  analysis: { type: String, required: true },
  riskScore: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
  starred: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export const AnalysisHistory = mongoose.model('AnalysisHistory', analysisHistorySchema);
