import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export const getFileUrl = (filePath) => {
  if (!filePath) return '';
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
  const baseUrl = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
  const cleanPath = filePath.replace(/^\//, '');
  return baseUrl ? `${baseUrl}/${cleanPath}` : `/${cleanPath}`;
};

export const errMsg = e => e.response?.data?.message || e.message || 'Something went wrong';
export default api;

