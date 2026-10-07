/**
 * api/socketService.js
 *
 * Socket.IO client singleton. Connects once on login with the access token
 * and disconnects on logout. Using a singleton prevents multiple socket
 * connections being opened across page navigations.
 */
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:5000';

let socket = null;

/**
 * connect
 * Creates the socket and connects with the given access token.
 * If a socket is already open, does nothing (prevents duplicate connections).
 */
export const connect = (accessToken) => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token: accessToken },
    transports: ['websocket'],
    autoConnect: true,
  });

  socket.on('connect', () => console.log('[Socket] Connected:', socket.id));
  socket.on('disconnect', (reason) => console.log('[Socket] Disconnected:', reason));
  socket.on('connect_error', (err) => console.error('[Socket] Connection error:', err.message));

  return socket;
};

/**
 * disconnect
 * Cleanly disconnects and nullifies the singleton on logout.
 */
export const disconnect = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/** Returns the current socket instance (may be null if not connected). */
export const getSocket = () => socket;

/** Emits an event if the socket is connected. */
export const emit = (event, data) => {
  if (socket?.connected) {
    socket.emit(event, data);
  }
};

/** Registers a listener; caller should clean up with off() in useEffect cleanup. */
export const on = (event, handler) => {
  socket?.on(event, handler);
};

export const off = (event, handler) => {
  socket?.off(event, handler);
};
