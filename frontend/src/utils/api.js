import axios from "axios";

const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

const API_BASE = isLocal ? "http://localhost:8000" : "";

const api = axios.create({
  baseURL: `${API_BASE}/gis`,
});

export default api;
