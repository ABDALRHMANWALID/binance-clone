import axios from 'axios';

// instance واحدة لكل الـ requests: الـ baseURL والـ token بيتحطوا تلقائياً
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token'); // نفس المفتاح اللي بتخزن بيه عند الـ login
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
