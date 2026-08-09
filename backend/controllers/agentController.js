import mongoose from 'mongoose';
import { Repository } from '../models/Repository.js';
import { AnalysisHistory } from '../models/AnalysisHistory.js';
import { generateImpactPrimer } from '../Services/geminiServices.js';
import { memoryRepoStore } from './repocontroller.js';

// In-memory fallback history store
export const memoryHistoryStore = [];

const calculateRiskScore = (analysisText, codebaseFiles) => {
  const lower = analysisText.toLowerCase();
  if (lower.includes('critical') || lower.includes('breaking') || lower.includes('schema migration')) {
    return 'HIGH';
  }
  if (lower.includes('upstream') || lower.includes('payment') || lower.includes('security')) {
    return 'MEDIUM';
  }
  return 'LOW';
};

export const handleAnalyzeRequirement = async (req, res) => {
  try {
    const { brdText, repoName, files, userId, title } = req.body;
    if (!brdText) {
      return res.status(400).json({ error: 'brdText is required' });
    }

    let codebaseFiles = [];

    // 1. If files were passed directly in the request
    if (files && Array.isArray(files) && files.length > 0) {
      codebaseFiles = files;
    }
    // 2. Check in-memory store
    else if (repoName && memoryRepoStore.has(repoName)) {
      codebaseFiles = memoryRepoStore.get(repoName).files || [];
    }
    // 3. Check MongoDB if connected
    else if (repoName && mongoose.connection.readyState === 1) {
      try {
        const repo = await Repository.findOne({ repoName });
        if (repo && repo.files) {
          codebaseFiles = repo.files;
        }
      } catch (dbErr) {
        console.warn('MongoDB lookup failed:', dbErr.message);
      }
    }

    const analysis = await generateImpactPrimer(brdText, codebaseFiles);
    const riskScore = calculateRiskScore(analysis, codebaseFiles);
    const itemTitle = title || brdText.split('\n')[0].replace(/^[#\s*-]+/, '').substring(0, 60) || 'Impact Analysis';

    const historyItem = {
      id: 'hist_' + Date.now(),
      userId: userId || 'anonymous',
      title: itemTitle,
      brdText,
      repoName: repoName || 'default-repo',
      analysis,
      riskScore,
      starred: false,
      createdAt: new Date().toISOString()
    };

    // Save to memory
    memoryHistoryStore.unshift(historyItem);

    // Save to MongoDB if connected
    if (mongoose.connection.readyState === 1) {
      try {
        const dbRecord = new AnalysisHistory({
          userId: userId || 'anonymous',
          title: itemTitle,
          brdText,
          repoName: repoName || 'default-repo',
          analysis,
          riskScore,
          starred: false
        });
        await dbRecord.save();
        historyItem._id = dbRecord._id;
      } catch (err) {
        console.warn('Could not persist to MongoDB history:', err.message);
      }
    }

    res.json({
      analysis,
      riskScore,
      historyItem
    });
  } catch (err) {
    console.error('Error in handleAnalyzeRequirement:', err);
    res.status(500).json({ error: err.message });
  }
};

export const getAnalysisHistory = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      try {
        const dbItems = await AnalysisHistory.find().sort({ createdAt: -1 }).limit(50);
        return res.json({ history: dbItems });
      } catch (e) {
        console.warn('MongoDB find failed, falling back to in-memory:', e.message);
      }
    }
    res.json({ history: memoryHistoryStore });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteAnalysisHistoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const index = memoryHistoryStore.findIndex(item => item.id === id || item._id === id);
    if (index !== -1) {
      memoryHistoryStore.splice(index, 1);
    }

    if (mongoose.connection.readyState === 1) {
      try {
        if (mongoose.Types.ObjectId.isValid(id)) {
          await AnalysisHistory.findByIdAndDelete(id);
        }
      } catch (e) {
        console.warn('MongoDB delete failed:', e.message);
      }
    }

    res.json({ message: 'History item removed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const toggleStarHistoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    let updatedItem = null;

    const memoryItem = memoryHistoryStore.find(item => item.id === id || item._id === id);
    if (memoryItem) {
      memoryItem.starred = !memoryItem.starred;
      updatedItem = memoryItem;
    }

    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(id)) {
      const record = await AnalysisHistory.findById(id);
      if (record) {
        record.starred = !record.starred;
        await record.save();
        updatedItem = record;
      }
    }

    res.json({ message: 'Updated star status', item: updatedItem });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};