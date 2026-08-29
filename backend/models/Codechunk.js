// here we will store our code bases :-
import mongoose from 'mongoose';
const codeChunkSchema = new mongoose.Schema({
  filePath: { type: String, required: true },
  startLine: { type: Number, required: true },
  endLine: { type: Number, required: true },
  content: { type: String, required: true },
  embedding: { type: [Number], default: [] },
  updatedAt: { type: Date, default: Date.now }
});

export const CodeChunk = mongoose.model('CodeChunk', codeChunkSchema);