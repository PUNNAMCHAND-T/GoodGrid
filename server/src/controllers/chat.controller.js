/**
 * controllers/chat.controller.js
 *
 * Handles the HTTP side of chat:
 *   GET  /chats            — list all chats the current user is part of
 *   GET  /chats/:id        — get a single chat with paginated messages
 *   POST /chats/:id/messages — HTTP fallback for sending a message
 *                             (used when the socket is temporarily unavailable)
 *
 * Real-time messaging (send_message socket event) is handled in sockets/index.js.
 * Both paths write to the same Message collection so there's no duplication
 * of data between HTTP and socket paths.
 */
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { PAGINATION } = require('../utils/constants');

/**
 * getMyChats
 * GET /chats  [auth required]
 * Returns all chats the authenticated user participates in,
 * sorted by most recent message first.
 */
const getMyChats = async (req, res) => {
  const chats = await Chat.find({ participants: req.user._id })
    .sort({ lastMessageAt: -1 })
    .populate('participants', 'name avatar')
    .populate('request', 'title status')
    .populate('lastMessage', 'text sender createdAt');

  res.status(200).json(new ApiResponse(200, { data: chats }, 'Chats fetched'));
};

/**
 * getChatById
 * GET /chats/:id  [auth required]
 * Returns the chat details plus paginated messages (oldest first within the page).
 * Verifies the requesting user is a participant — non-participants get a 403.
 */
const getChatById = async (req, res) => {
  const chat = await Chat.findById(req.params.id)
    .populate('participants', 'name avatar')
    .populate('request', 'title status');

  if (!chat) throw new ApiError(404, 'Chat not found.');

  // Ensure the user is actually a participant in this chat
  const isParticipant = chat.participants.some(
    (p) => p._id.toString() === req.user._id.toString()
  );
  if (!isParticipant) throw new ApiError(403, 'You are not a participant in this chat.');

  // Paginate messages — newest page is last (ascending createdAt for display)
  const page = Math.max(1, parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(parseInt(req.query.limit) || 30, 100);
  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    Message.find({ chat: req.params.id })
      .sort({ createdAt: 1 }) // oldest first so the UI renders top-to-bottom
      .skip(skip)
      .limit(limit)
      .populate('sender', 'name avatar'),
    Message.countDocuments({ chat: req.params.id }),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      { chat, messages, page, limit, total, totalPages: Math.ceil(total / limit) },
      'Chat fetched'
    )
  );
};

/**
 * sendMessage
 * POST /chats/:id/messages  [auth required]
 * HTTP fallback for sending a message — identical logic to the socket
 * send_message handler. If the socket is alive the frontend should prefer
 * the socket path, but this endpoint guarantees delivery if the socket drops.
 *
 * After saving, if the io instance is available (it's attached to app in
 * server.js), emits the new_message event to the chat room so other
 * participants get it in real-time even if this message came over HTTP.
 */
const sendMessage = async (req, res) => {
  const chat = await Chat.findById(req.params.id);
  if (!chat) throw new ApiError(404, 'Chat not found.');

  // Verify sender is a participant — don't trust the client
  const isParticipant = chat.participants.some(
    (p) => p.toString() === req.user._id.toString()
  );
  if (!isParticipant) throw new ApiError(403, 'You are not a participant in this chat.');

  const message = await Message.create({
    chat: chat._id,
    sender: req.user._id,
    text: req.body.text,
  });

  // Update the chat's lastMessage pointer for the chat-list preview
  await Chat.findByIdAndUpdate(chat._id, {
    lastMessage: message._id,
    lastMessageAt: message.createdAt,
  });

  // Populate sender for the response / socket emit
  await message.populate('sender', 'name avatar');

  // Emit via Socket.IO if available (attached to req.app by server.js)
  const io = req.app.get('io');
  if (io) {
    io.to(`chat:${chat._id}`).emit('new_message', message);
  }

  res.status(201).json(new ApiResponse(201, { message }, 'Message sent'));
};

module.exports = { getMyChats, getChatById, sendMessage };
