// Frontend API Services Client

const getAuthHeaders = () => {
  const token = localStorage.getItem('impactiq_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Auth APIs
export const loginUser = async (email, password) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Login failed');
  return data;
};

export const registerUser = async (name, email, password, role) => {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, role }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Registration failed');
  return data;
};

export const fetchCurrentUser = async () => {
  const response = await fetch('/api/auth/me', {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch user');
  return response.json();
};

// Repository & Telemetry APIs
export const fetchRepositories = async () => {
  const response = await fetch('/api/repositories', {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch repositories');
  return response.json();
};

export const scanRepository = async (repoId) => {
  const response = await fetch('/api/repositories/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ repoId }),
  });
  if (!response.ok) throw new Error('Failed to scan repository');
  return response.json();
};

export const fetchDashboardStats = async () => {
  const response = await fetch('/api/dashboard/stats', {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch dashboard stats');
  return response.json();
};

export const fetchHistory = async () => {
  const response = await fetch('/api/history', {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch history');
  return response.json();
};

import { synthesizeClientImpact, synthesizeClientPreReview } from './aiService';

// AI Core APIs
export const analyzeImpact = async (brdText, repoId = 'repo-1', requirementId = 'JIRA-241', customFiles = []) => {
  try {
    const response = await fetch('/api/impact-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ brdText, repoId, requirementId }),
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (err) {
    console.warn('Backend impact API request failed, activating client AI fallback engine:', err.message);
  }

  // Graceful client-side AI fallback engine
  return synthesizeClientImpact(brdText, customFiles, requirementId);
};

export const preReviewCode = async (rawGitDiff, requirementId = 'JIRA-241') => {
  try {
    const response = await fetch('/api/pre-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ rawGitDiff, requirementId }),
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (err) {
    console.warn('Backend review API request failed, activating client AI fallback engine:', err.message);
  }

  // Graceful client-side AI review fallback engine
  return synthesizeClientPreReview(rawGitDiff, requirementId);
};

// Explicit Code Files APIs
export const fetchRepoFiles = async (repoId = 'repo-1') => {
  const response = await fetch(`/api/repositories/files?repoId=${encodeURIComponent(repoId)}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch codebase files');
  return response.json();
};

export const addExplicitFile = async (payload) => {
  const response = await fetch('/api/repositories/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to add codebase file');
  return data;
};

export const batchAddExplicitFiles = async (repoId = 'repo-1', files = []) => {
  const response = await fetch('/api/repositories/files/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ repoId, files }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to batch add files');
  return data;
};

export const deleteExplicitFile = async (fileIdentifier, repoId = 'repo-1') => {
  const response = await fetch(`/api/repositories/files/${encodeURIComponent(fileIdentifier)}?repoId=${encodeURIComponent(repoId)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to delete file');
  return data;
};

