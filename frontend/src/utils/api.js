import axios from 'axios';
const baseURL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');
const api = axios.create({ baseURL });
export default api;
