import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name:           { type: String, required: true },
  email:          { type: String, required: true, unique: true },
  password:       { type: String, required: true },
  role:           { type: String, default: 'Senior Developer' },
  avatar:         { type: String, default: '' },

  // ── Integration Usernames ──────────────────────────────────────────────────
  // These link a registered ImpactIQ user to their external platform identities.
  // Webhook events use these fields to look up the correct email recipient.
  githubUsername: { type: String, default: '' }, // e.g. "john-doe" on GitHub
  jiraUsername:   { type: String, default: '' }, // e.g. "john.doe" on Jira

  createdAt:      { type: Date, default: Date.now },
});

export const User = mongoose.model('User', userSchema);
