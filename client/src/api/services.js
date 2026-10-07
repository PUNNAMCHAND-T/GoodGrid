/**
 * api/services.js
 * Every non-auth API call, grouped by resource.
 * Pages call these directly and hold results in local component state
 * (not Redux) per the spec — Redux is only for auth + UI state.
 */
import axiosInstance from './axiosInstance';

// ── Users ─────────────────────────────────────────────────────────────────────
export const userService = {
  getMe: () => axiosInstance.get('/users/me'),
  updateMe: (data) => axiosInstance.patch('/users/me', data),
  updateAvatar: (formData) =>
    axiosInstance.patch('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getUserById: (id) => axiosInstance.get(`/users/${id}`),
  getUserRequests: (id, params) => axiosInstance.get(`/users/${id}/requests`, { params }),
};

// ── Requests ──────────────────────────────────────────────────────────────────
export const requestService = {
  list: (params) => axiosInstance.get('/requests', { params }),
  nearby: (params) => axiosInstance.get('/requests/nearby', { params }),
  myRequests: (params) => axiosInstance.get('/requests/my', { params }),
  myApplications: (params) => axiosInstance.get('/requests/my/applications', { params }),
  create: (formData) =>
    axiosInstance.post('/requests', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getById: (id) => axiosInstance.get(`/requests/${id}`),
  update: (id, data) => axiosInstance.patch(`/requests/${id}`, data),
  delete: (id) => axiosInstance.delete(`/requests/${id}`),
  close: (id) => axiosInstance.patch(`/requests/${id}/close`),
  complete: (id) => axiosInstance.patch(`/requests/${id}/complete`),
  applyVolunteer: (id, message) =>
    axiosInstance.post(`/requests/${id}/volunteer`, { message }),
  getVolunteers: (id) => axiosInstance.get(`/requests/${id}/volunteers`),
  acceptVolunteer: (id, appId) =>
    axiosInstance.patch(`/requests/${id}/volunteers/${appId}/accept`),
};

// ── Chats ─────────────────────────────────────────────────────────────────────
export const chatService = {
  list: () => axiosInstance.get('/chats'),
  getById: (id, params) => axiosInstance.get(`/chats/${id}`, { params }),
  sendMessage: (id, text) => axiosInstance.post(`/chats/${id}/messages`, { text }),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationService = {
  list: (params) => axiosInstance.get('/notifications', { params }),
  unreadCount: () => axiosInstance.get('/notifications/unread-count'),
  markAllRead: () => axiosInstance.patch('/notifications/read-all'),
  markOneRead: (id) => axiosInstance.patch(`/notifications/${id}/read`),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminService = {
  stats: () => axiosInstance.get('/admin/stats'),
  listUsers: (params) => axiosInstance.get('/admin/users', { params }),
  banUser: (id, reason) => axiosInstance.patch(`/admin/users/${id}/ban`, { reason }),
  unbanUser: (id) => axiosInstance.patch(`/admin/users/${id}/unban`),
  changeRole: (id, role) => axiosInstance.patch(`/admin/users/${id}/role`, { role }),
  listRequests: (params) => axiosInstance.get('/admin/requests', { params }),
  deleteRequest: (id) => axiosInstance.delete(`/admin/requests/${id}`),
};
