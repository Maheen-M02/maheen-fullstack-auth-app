import axios from 'axios';

const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const register = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const login = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

// Elections
export const getElections = async (filter) => {
  const response = await api.get('/elections', { params: { filter } });
  return response.data;
};

export const getElection = async (id) => {
  const response = await api.get(`/elections/${id}`);
  return response.data;
};

export const castVote = async (electionId, voteData) => {
  const response = await api.post(`/elections/${electionId}/vote`, voteData);
  return response.data;
};

export const getResults = async (electionId) => {
  const response = await api.get(`/elections/${electionId}/results`);
  return response.data;
};

export const getVoteStatus = async (electionId) => {
  const response = await api.get(`/elections/${electionId}/vote-status`);
  return response.data;
};

// Admin
export const createElection = async (electionData) => {
  const response = await api.post('/admin/elections', electionData);
  return response.data;
};

export const updateElection = async (id, electionData) => {
  const response = await api.put(`/admin/elections/${id}`, electionData);
  return response.data;
};

export const deleteElection = async (id) => {
  const response = await api.delete(`/admin/elections/${id}`);
  return response.data;
};

export const closeElection = async (id) => {
  const response = await api.post(`/admin/elections/${id}/close`);
  return response.data;
};

export const getAuditLogs = async (params) => {
  const response = await api.get('/admin/audit', { params });
  return response.data;
};