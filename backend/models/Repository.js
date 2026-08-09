import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  filePath: { type: String, required: true },
  content: { type: String, required: true }
});

const repositorySchema = new mongoose.Schema({
  repoName: { type: String, required: true, unique: true },
  files: [fileSchema],
  updatedAt: { type: Date, default: Date.now }
});

export const Repository = mongoose.model('Repository', repositorySchema);
