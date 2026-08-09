import mongoose from 'mongoose';
import { Repository } from '../models/Repository.js';

// In-memory fallback store for development when MongoDB is not connected
export const memoryRepoStore = new Map();

export const uploadCodebase = async (req, res) => {
  try {
    const { repoName, files } = req.body;
    if (!repoName || !files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'repoName and files array are required' });
    }

    // Always update in-memory store
    memoryRepoStore.set(repoName, { repoName, files, updatedAt: new Date() });

    // If MongoDB is connected, also save to MongoDB
    if (mongoose.connection.readyState === 1) {
      try {
        let repo = await Repository.findOne({ repoName });
        if (repo) {
          repo.files = files;
          repo.updatedAt = Date.now();
          await repo.save();
        } else {
          repo = new Repository({ repoName, files });
          await repo.save();
        }
      } catch (dbErr) {
        console.warn('MongoDB save failed, retained in memory:', dbErr.message);
      }
    }

    res.json({
      message: 'Codebase indexed successfully',
      totalFiles: files.length,
      storage: mongoose.connection.readyState === 1 ? 'mongodb' : 'in-memory'
    });
  } catch (err) {
    console.error('Error in uploadCodebase:', err);
    res.status(500).json({ error: err.message });
  }
};