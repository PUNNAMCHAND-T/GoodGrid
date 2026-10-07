/**
 * models/Chat.js
 *
 * A chat thread between the request owner and the accepted volunteer.
 * Created automatically when a volunteer application is accepted.
 * The unique index on `request` enforces one-chat-per-request at the DB level
 * so the accept flow can use find-or-create safely.
 */
const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
  {
    // The help request this chat is about
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request',
      required: [true, 'Chat must be linked to a request'],
      unique: true, // DB-level enforcement: one chat per request
    },
    // The two participants: [owner, volunteer]
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Denormalised pointer to the latest message — used to show
    // preview text in the chat list without fetching all messages
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Speeds up "fetch all chats this user is part of"
chatSchema.index({ participants: 1 });
// request unique index is declared inline on the field (unique:true) — no duplicate needed

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
