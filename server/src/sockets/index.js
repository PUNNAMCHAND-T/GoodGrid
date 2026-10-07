/**
 * sockets/index.js
 *
 * Initialises Socket.IO and registers all real-time event handlers.
 *
 * Auth handshake:
 *   The client sends { auth: { token: "<accessToken>" } } when connecting.
 *   We verify this using the same verifyAccessToken function used by the HTTP
 *   authenticate middleware — NOT a duplicated copy of the logic. If the token
 *   is missing or invalid, the connection is rejected before any handler runs.
 *
 * Rooms:
 *   socket.userId     — personal room; used to push notifications to one user
 *   chat:<chatId>     — shared room; used for messages + typing events
 *
 * Events (client → server):
 *   join_chat  { chatId }        — join a chat room
 *   leave_chat { chatId }        — leave a chat room
 *   send_message { chatId, text } — persist + broadcast a message
 *   typing { chatId }            — broadcast typing indicator
 *   stop_typing { chatId }       — broadcast stop-typing indicator
 *
 * Events (server → client):
 *   new_message <messageObject>  — new message in a room
 *   user_typing { userId }       — someone is typing
 *   user_stop_typing { userId }  — someone stopped typing
 *   notification (fetch trigger) — tells the client to re-fetch unread count
 *   error { message }            — something went wrong
 */
const { Server } = require('socket.io');
const { CLIENT_URL } = require('../config/env');
const { verifyAccessToken } = require('../services/tokenService');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const { SOCKET_EVENTS } = require('../utils/constants');

const initSockets = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: CLIENT_URL,
      credentials: true,
    },
  });

  // ── Auth middleware (runs before any event handler) ───────────────────────
  // Rejects the connection if the access token is missing or invalid.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error('Authentication token missing. Connection refused.'));
      }

      // Uses the shared verifyAccessToken — same logic as HTTP authenticate middleware
      const decoded = verifyAccessToken(token);

      const user = await User.findById(decoded.userId);
      if (!user) return next(new Error('User not found. Connection refused.'));
      if (user.isBanned) return next(new Error('Account banned. Connection refused.'));

      // Attach the user to the socket so handlers can access it without re-fetching
      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token. Connection refused.'));
    }
  });

  // ── Connection handler ────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.user.name} (${socket.userId})`);

    // Join the user's personal room — used for pushing notifications
    socket.join(socket.userId);

    // ── join_chat ─────────────────────────────────────────────────────────
    socket.on(SOCKET_EVENTS.JOIN_CHAT, async ({ chatId }) => {
      try {
        // Verify the user is a participant in this chat before joining the room
        const chat = await Chat.findById(chatId);
        if (!chat) {
          return socket.emit(SOCKET_EVENTS.ERROR, { message: 'Chat not found.' });
        }

        const isParticipant = chat.participants.some(
          (p) => p.toString() === socket.userId
        );
        if (!isParticipant) {
          return socket.emit(SOCKET_EVENTS.ERROR, { message: 'Not a participant in this chat.' });
        }

        socket.join(`chat:${chatId}`);
        console.log(`[Socket] ${socket.user.name} joined chat:${chatId}`);
      } catch (err) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to join chat.' });
      }
    });

    // ── leave_chat ────────────────────────────────────────────────────────
    socket.on(SOCKET_EVENTS.LEAVE_CHAT, ({ chatId }) => {
      socket.leave(`chat:${chatId}`);
      console.log(`[Socket] ${socket.user.name} left chat:${chatId}`);
    });

    // ── send_message ──────────────────────────────────────────────────────
    // Validates sender is a participant, persists to DB, broadcasts to room.
    // The HTTP fallback (POST /chats/:id/messages) does the same thing so
    // the two paths stay in sync.
    socket.on(SOCKET_EVENTS.SEND_MESSAGE, async ({ chatId, text }) => {
      try {
        if (!chatId || !text || !text.trim()) {
          return socket.emit(SOCKET_EVENTS.ERROR, { message: 'chatId and text are required.' });
        }

        if (text.trim().length > 1000) {
          return socket.emit(SOCKET_EVENTS.ERROR, { message: 'Message cannot exceed 1000 characters.' });
        }

        const chat = await Chat.findById(chatId);
        if (!chat) {
          return socket.emit(SOCKET_EVENTS.ERROR, { message: 'Chat not found.' });
        }

        // Validate sender is a participant — don't trust the client
        const isParticipant = chat.participants.some(
          (p) => p.toString() === socket.userId
        );
        if (!isParticipant) {
          return socket.emit(SOCKET_EVENTS.ERROR, { message: 'Not a participant in this chat.' });
        }

        const message = await Message.create({
          chat: chatId,
          sender: socket.userId,
          text: text.trim(),
        });

        // Update chat's lastMessage pointer for the chat-list preview
        await Chat.findByIdAndUpdate(chatId, {
          lastMessage: message._id,
          lastMessageAt: message.createdAt,
        });

        await message.populate('sender', 'name avatar');

        // Broadcast to everyone in the room (including the sender so they get
        // confirmation that the message was persisted)
        io.to(`chat:${chatId}`).emit(SOCKET_EVENTS.NEW_MESSAGE, message);
      } catch (err) {
        console.error('[Socket] send_message error:', err.message);
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to send message.' });
      }
    });

    // ── typing ────────────────────────────────────────────────────────────
    // Broadcasts to other participants that this user is typing.
    // Does not hit the DB — purely ephemeral real-time state.
    socket.on(SOCKET_EVENTS.TYPING, ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit(SOCKET_EVENTS.USER_TYPING, { userId: socket.userId });
    });

    // ── stop_typing ───────────────────────────────────────────────────────
    socket.on(SOCKET_EVENTS.STOP_TYPING, ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit(SOCKET_EVENTS.USER_STOP_TYPING, { userId: socket.userId });
    });

    // ── disconnect ────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: ${socket.user.name} — reason: ${reason}`);
    });
  });

  return io;
};

module.exports = initSockets;
