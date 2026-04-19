import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true, // send session cookie
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      // Session expired / invalid — reload to trigger gatekeeper redirect
      if (!window.__blockReload) {
        window.__blockReload = true;
        setTimeout(() => window.location.reload(), 300);
      }
    }
    return Promise.reject(err);
  }
);
