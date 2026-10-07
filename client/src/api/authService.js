/**
 * api/authService.js
 * All auth-related API calls. Called by authSlice thunks.
 */
import axiosInstance from './axiosInstance';

export const authService = {
  register: (data) => axiosInstance.post('/auth/register', data),
  login: (data) => axiosInstance.post('/auth/login', data),
  logout: () => axiosInstance.post('/auth/logout'),
  refreshToken: () => axiosInstance.post('/auth/refresh-token'),
  getMe: () => axiosInstance.get('/auth/me'),
  forgotPassword: (email) => axiosInstance.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) =>
    axiosInstance.patch(`/auth/reset-password/${token}`, { password }),
  verifyEmail: (token) => axiosInstance.get(`/auth/verify-email/${token}`),
};
