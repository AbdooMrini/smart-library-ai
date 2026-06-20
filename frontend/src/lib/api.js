import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 35000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("smart-library-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalized = new Error(error.response?.data?.message || "Une erreur est survenue.");
    normalized.code = error.response?.data?.code;
    normalized.status = error.response?.status;
    return Promise.reject(normalized);
  },
);

export default api;
