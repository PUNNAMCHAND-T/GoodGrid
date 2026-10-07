/**
 * pages/Chat/ChatRoom.jsx
 *
 * Real-time chat room for a single chat at /chat/:id.
 *
 * Message bubbles per spec:
 *   Outgoing: bg-brand-500, white text, right-aligned, no avatar.
 *   Incoming: bg-slate-100 (light) / bg-surface-raised (dark), left-aligned, avatar + bold sender name + muted timestamp.
 *
 * Socket events used:
 *   join_chat / leave_chat     — on mount / unmount
 *   send_message               — send via socket (HTTP fallback if socket not connected)
 *   typing / stop_typing       — indicator while composing
 *   new_message                — incoming real-time messages
 *   user_typing / user_stop_typing — show typing indicator
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { chatService } from '../../api/services';
import * as socket from '../../api/socketService';
import Avatar from '../../components/common/Avatar';
import Spinner from '../../components/common/Spinner';
import toast from 'react-hot-toast';
import { shortTime } from '../../utils/formatDate';
import { cn } from '../../utils/cn';

const SOCKET_EVENTS = {
  JOIN_CHAT: 'join_chat',
  LEAVE_CHAT: 'leave_chat',
  SEND_MESSAGE: 'send_message',
  NEW_MESSAGE: 'new_message',
  TYPING: 'typing',
  STOP_TYPING: 'stop_typing',
  USER_TYPING: 'user_typing',
  USER_STOP_TYPING: 'user_stop_typing',
};

const ChatRoom = () => {
  const { id: chatId } = useParams();
  const { user } = useSelector((s) => s.auth);

  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [othersTyping, setOthersTyping] = useState(false);

  const bottomRef = useRef(null);
  const typingTimerRef = useRef(null);

  // Scroll to latest message
  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load history on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await chatService.getById(chatId, { page: 1, limit: 50 });
        setChat(res.data.data.chat);
        setMessages(res.data.data.messages);
      } catch {
        toast.error('Chat not found');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [chatId]);

  // Socket setup: join room + register listeners
  useEffect(() => {
    socket.emit(SOCKET_EVENTS.JOIN_CHAT, { chatId });

    const handleNewMessage = (msg) => {
      setMessages((prev) => {
        // Dedup: if message already in list (sent via HTTP fallback), skip
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    };

    const handleTyping = () => setOthersTyping(true);
    const handleStopTyping = () => setOthersTyping(false);

    socket.on(SOCKET_EVENTS.NEW_MESSAGE, handleNewMessage);
    socket.on(SOCKET_EVENTS.USER_TYPING, handleTyping);
    socket.on(SOCKET_EVENTS.USER_STOP_TYPING, handleStopTyping);

    return () => {
      socket.emit(SOCKET_EVENTS.LEAVE_CHAT, { chatId });
      socket.off(SOCKET_EVENTS.NEW_MESSAGE, handleNewMessage);
      socket.off(SOCKET_EVENTS.USER_TYPING, handleTyping);
      socket.off(SOCKET_EVENTS.USER_STOP_TYPING, handleStopTyping);
    };
  }, [chatId]);

  // Auto-scroll when messages update
  useEffect(() => { scrollToBottom(); }, [messages, othersTyping]);

  const handleTyping = () => {
    socket.emit(SOCKET_EVENTS.TYPING, { chatId });
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit(SOCKET_EVENTS.STOP_TYPING, { chatId });
    }, 2000);
  };

  const sendMessage = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    setSending(true);
    socket.emit(SOCKET_EVENTS.STOP_TYPING, { chatId });

    const sock = socket.getSocket();
    if (sock?.connected) {
      // Prefer socket path
      socket.emit(SOCKET_EVENTS.SEND_MESSAGE, { chatId, text: trimmed });
      setSending(false);
    } else {
      // HTTP fallback
      try {
        const res = await chatService.sendMessage(chatId, trimmed);
        setMessages((prev) => [...prev, res.data.data.message]);
      } catch {
        toast.error('Failed to send message');
        setText(trimmed); // restore text on failure
      } finally {
        setSending(false);
      }
    }
  }, [text, chatId]);

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) return <div className="flex justify-center mt-20"><Spinner size="lg" /></div>;

  const other = chat?.participants?.find((p) => p._id !== user._id);

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-7rem)]">
      {/* Header — back arrow + other user's avatar and name */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-white/[0.08] shrink-0">
        {/* Back arrow — slate-500 in light, zinc-400 in dark */}
        <Link to="/chat" className="text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <Avatar src={other?.avatar} name={other?.name} size="md" />
        <div>
          {/* Other user's name — slate-800 in light, white in dark */}
          <p className="font-semibold text-slate-800 dark:text-white">{other?.name}</p>
          {chat?.request && (
            <Link to={`/requests/${chat.request._id}`}
              className="text-xs text-slate-400 dark:text-zinc-500 hover:text-brand-500 transition-colors">
              Re: {chat.request.title}
            </Link>
          )}
        </div>
      </div>

      {/* Messages scroll area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-slate-400 dark:text-zinc-500 text-sm py-8">
            No messages yet. Say hello! 👋
          </p>
        )}

        {messages.map((msg) => {
          const isOwn = msg.sender?._id === user._id || msg.sender === user._id;
          return (
            <div key={msg._id} className={cn('flex gap-2', isOwn ? 'flex-row-reverse' : 'flex-row')}>
              {/* Avatar — only for incoming messages */}
              {!isOwn && (
                <Avatar
                  src={msg.sender?.avatar}
                  name={msg.sender?.name}
                  size="sm"
                  className="shrink-0 mt-1"
                />
              )}

              <div className={cn('max-w-[72%] space-y-1', isOwn ? 'items-end' : 'items-start', 'flex flex-col')}>
                {/* Sender name + timestamp — only for incoming */}
                {!isOwn && (
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-brand-400">
                      {msg.sender?.name}
                    </span>
                    {/* Timestamp — slate-400 in light, zinc-500 in dark */}
                    <span className="text-xs text-slate-400 dark:text-zinc-500">{shortTime(msg.createdAt)}</span>
                  </div>
                )}

                {/* Bubble —
                    Outgoing: brand-500 background, always white text.
                    Incoming: slate-100 (light) / surface-raised (dark) background. */}
                <div
                  className={cn(
                    'px-4 py-2.5 text-sm leading-relaxed',
                    isOwn
                      ? 'bg-brand-500 text-white rounded-2xl rounded-br-sm'
                      : 'bg-slate-100 dark:bg-surface-raised text-slate-900 dark:text-white rounded-2xl rounded-bl-sm'
                  )}
                >
                  {msg.text}
                </div>

                {/* Timestamp for outgoing — slate-400 in light, zinc-500 in dark */}
                {isOwn && (
                  <span className="text-xs text-slate-400 dark:text-zinc-500">{shortTime(msg.createdAt)}</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator — slate-100 bg in light, surface-raised in dark */}
        {othersTyping && (
          <div className="flex gap-2 items-center">
            <Avatar src={other?.avatar} name={other?.name} size="sm" />
            <div className="bg-slate-100 dark:bg-surface-raised px-4 py-2 rounded-2xl rounded-bl-sm">
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i}
                    className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="shrink-0 pt-3 border-t border-slate-200 dark:border-white/[0.08]">
        <div className="flex gap-2">
          {/* Textarea — explicit light bg/text so it doesn't look transparent */}
          <textarea
            id="chat-input"
            value={text}
            onChange={(e) => { setText(e.target.value); handleTyping(); }}
            onKeyDown={onKeyDown}
            rows={1}
            maxLength={1000}
            placeholder="Type a message…"
            className="flex-1 rounded-lg px-4 py-2.5 text-sm bg-white text-slate-800 placeholder:text-slate-400 border border-slate-200 dark:bg-surface-raised dark:border-white/[0.08] dark:text-white dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-brand-500 outline-none resize-none"
          />
          <button
            id="chat-send-btn"
            onClick={sendMessage}
            disabled={sending || !text.trim()}
            className="shrink-0 w-10 h-10 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        {/* Counter — slate-400 in light, zinc-600 in dark */}
        <p className="text-xs text-slate-400 dark:text-zinc-600 mt-1.5 text-right">{text.length}/1000 · Enter to send</p>
      </div>
    </div>
  );
};

export default ChatRoom;
