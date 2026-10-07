/**
 * api/axiosInstance.js
 *
 * Configured Axios instance shared across all API calls.
 *
 * Request interceptor: attaches "Authorization: Bearer <accessToken>" from Redux.
 *
 * Response interceptor (silent refresh):
 *   On a 401, call /auth/refresh-token once using the httpOnly cookie.
 *   If that succeeds, update the store and retry the original request.
 *   If it also returns 401, dispatch logout and do NOT retry again (no infinite loop).
 *   Concurrent 401s are queued so only one refresh call is made.
 */
import axios from 'axios';
import { store } from '../app/store';
import { setAccessToken, logout } from '../features/authSlice';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  withCredentials: true, // sends the httpOnly refreshToken cookie on cross-origin requests
});

// ── Request interceptor ───────────────────────────────────────────────────────
axiosInstance.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Refresh queue ─────────────────────────────────────────────────────────────
// Prevents five simultaneous 401s from triggering five separate refresh calls.
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ── Response interceptor ──────────────────────────────────────────────────────
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh on 401 and only once per request (_retry flag)
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until the in-flight refresh resolves
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Use a plain axios call (not the intercepted instance) to avoid loops
        const { data } = await axios.post(
          `${axiosInstance.defaults.baseURL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );

        const newToken = data.data.accessToken;
        store.dispatch(setAccessToken(newToken));
        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh also failed — log the user out completely
        processQueue(refreshError, null);
        store.dispatch(logout());
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
