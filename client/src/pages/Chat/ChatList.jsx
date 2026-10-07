/**
 * pages/Chat/ChatList.jsx
 * List of all chats the user participates in — at /chat.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { chatService } from '../../api/services';
import Avatar from '../../components/common/Avatar';
import Spinner from '../../components/common/Spinner';
import { timeAgo } from '../../utils/formatDate';
import { useSelector } from 'react-redux';

const ChatList = () => {
  const { user } = useSelector((s) => s.auth);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chatService.list()
      .then((r) => setChats(r.data.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center mt-20"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Heading — slate-800 in light, white in dark */}
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Messages</h1>

      {chats.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-4xl">💬</p>
          {/* Empty state text — slate-500 in light, zinc-400 in dark */}
          <p className="text-slate-500 dark:text-zinc-400">No conversations yet.</p>
          <p className="text-sm text-slate-400 dark:text-zinc-500">Chats open when you accept a volunteer on a request.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {chats.map((chat) => {
            // The other participant (not current user)
            const other = chat.participants.find((p) => p._id !== user._id);
            return (
              <li key={chat._id}>
                <Link
                  to={`/chat/${chat._id}`}
                  className="card p-4 flex items-center gap-3 hover:border-brand-500/50 transition-colors block"
                >
                  <Avatar src={other?.avatar} name={other?.name} size="md" className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      {/* Other user's name — slate-800 in light, white in dark */}
                      <p className="font-medium text-slate-800 dark:text-white truncate">{other?.name || 'Unknown'}</p>
                      {chat.lastMessageAt && (
                        /* Timestamp — slate-400 in light, zinc-500 in dark */
                        <span className="text-xs text-slate-400 dark:text-zinc-500 shrink-0 ml-2">{timeAgo(chat.lastMessageAt)}</span>
                      )}
                    </div>
                    {/* Request subtitle — slate-500 in light, zinc-400 in dark */}
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
                      Re: {chat.request?.title || 'Deleted request'}
                    </p>
                    {chat.lastMessage && (
                      /* Last message preview — slate-400 in light, zinc-500 in dark */
                      <p className="text-xs text-slate-400 dark:text-zinc-500 truncate mt-0.5">
                        {chat.lastMessage.text}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ChatList;
