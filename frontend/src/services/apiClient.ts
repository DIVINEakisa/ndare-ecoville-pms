import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('hms.accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
