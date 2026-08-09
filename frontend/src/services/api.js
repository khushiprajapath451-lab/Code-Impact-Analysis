import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercept requests to attach auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  register: async (username, email, password) => {
    const res = await api.post('/auth/register', { 
      username, 
      name: username, 
      email, 
      password 
    });
    return res.data;
  },
  forgotPassword: async (email) => {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  },
  resetPassword: async (email, resetCode, newPassword) => {
    const res = await api.post('/auth/reset-password', { email, resetCode, newPassword });
    return res.data;
  },
  getStats: async () => {
    const res = await api.get('/dashboard/stats');
    return res.data;
  },
  checkHealth: async () => {
    const res = await api.get('/health');
    return res.data;
  }
};

export const repoAPI = {
  uploadCodebase: async (repoName, files) => {
    const res = await api.post('/codebase/upload', { repoName, files });
    return res.data;
  }
};

export const agentAPI = {
  analyzeRequirement: async (brdText, repoName, files = [], title = '') => {
    const res = await api.post('/agent/analyze', { brdText, repoName, files, title });
    return res.data;
  },
  getHistory: async () => {
    const res = await api.get('/agent/history');
    return res.data;
  },
  deleteHistoryItem: async (id) => {
    const res = await api.delete(`/agent/history/${id}`);
    return res.data;
  },
  toggleStar: async (id) => {
    const res = await api.patch(`/agent/history/${id}/star`);
    return res.data;
  }
};

export default api;
