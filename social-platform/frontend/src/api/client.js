import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('shortverse-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function mediaUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${import.meta.env.VITE_API_ORIGIN || 'http://localhost:5000'}${path}`;
}

