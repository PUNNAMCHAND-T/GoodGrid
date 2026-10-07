/**
 * features/uiSlice.js
 *
 * UI-level state shared across the whole app:
 *   - sidebar open/closed (mobile)
 *   - dark/light mode toggle (persisted to localStorage)
 *   - active modal name
 *   - notification unread count (navbar badge)
 *
 * Theme persistence: the user's dark/light preference is stored in
 * localStorage under "goodgrid-theme" so it survives page refreshes.
 * Light mode is the default if no preference is saved.
 */
import { createSlice } from '@reduxjs/toolkit';

// Read saved theme preference, default to light mode if nothing is stored.
// This runs once at import time before React renders, so the initial Redux
// state matches what the user saw last time.
const savedDarkMode = localStorage.getItem('goodgrid-theme') === 'dark';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    isSidebarOpen: false,
    isDarkMode: savedDarkMode,
    activeModal: null,
    notifications: {
      unreadCount: 0,
    },
  },
  reducers: {
    toggleSidebar(state) {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    toggleDarkMode(state) {
      state.isDarkMode = !state.isDarkMode;
      // Apply or remove the "dark" class on <html> and persist to localStorage
      if (state.isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('goodgrid-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('goodgrid-theme', 'light');
      }
    },
    openModal(state, action) {
      state.activeModal = action.payload;
    },
    closeModal(state) {
      state.activeModal = null;
    },
    setUnreadCount(state, action) {
      state.notifications.unreadCount = action.payload;
    },
    incrementUnreadCount(state) {
      state.notifications.unreadCount += 1;
    },
    resetUnreadCount(state) {
      state.notifications.unreadCount = 0;
    },
  },
});

export const {
  toggleSidebar,
  toggleDarkMode,
  openModal,
  closeModal,
  setUnreadCount,
  incrementUnreadCount,
  resetUnreadCount,
} = uiSlice.actions;

export default uiSlice.reducer;

