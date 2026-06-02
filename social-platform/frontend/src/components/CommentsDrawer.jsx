import { AnimatePresence, motion } from 'framer-motion';
import { Send, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, mediaUrl } from '../api/client.js';
import { useAuth } from '../state/AuthContext.jsx';
import { useSocket } from '../state/SocketContext.jsx';

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export function CommentsDrawer({ open, onClose, video }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const { user } = useAuth();
  const { socket } = useSocket() || {};

  useEffect(() => {
    if (!open || !video?._id) return;
    api.get(`/comments/video/${video._id}`).then(({ data }) => setComments(data.comments));
    socket?.emit('video:join', video._id);
    const onCreate = ({ comment }) => setComments((items) => [comment, ...items]);
    const onDelete = ({ commentId }) => setComments((items) => items.filter((item) => item._id !== commentId));
    socket?.on('comment:created', onCreate);
    socket?.on('comment:deleted', onDelete);
    return () => {
      socket?.emit('video:leave', video._id);
      socket?.off('comment:created', onCreate);
      socket?.off('comment:deleted', onDelete);
    };
  }, [open, video?._id, socket]);

  const addComment = async () => {
    if (!text.trim()) return;
    await api.post(`/comments/video/${video._id}`, { text });
    setText('');
  };

  const deleteComment = async (id) => api.delete(`/comments/${id}`);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[78vh] max-w-xl rounded-t-[30px] bg-zinc-950 p-5 text-white shadow-2xl md:bottom-8 md:rounded-[30px] md:border md:border-white/10" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black">Comments</h3>
              <p className="text-xs font-bold text-zinc-500">{comments.length} comments</p>
            </div>
            <button onClick={onClose} className="rounded-full bg-white/10 p-2"><X size={18} /></button>
          </div>
          <div className="hide-scrollbar max-h-[45vh] space-y-5 overflow-y-auto">
            {comments.map((comment) => (
              <div key={comment._id} className="flex gap-3">
                <img src={mediaUrl(comment.userId?.avatar)} className="h-9 w-9 rounded-full object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black">{comment.userId?.username}</p>
                    <span className="text-xs text-zinc-500">{timeAgo(comment.createdAt)}</span>
                  </div>
                  <p className="text-sm text-zinc-200">{comment.text}</p>
                </div>
                {(comment.userId?._id === user?._id || user?.role === 'admin') && (
                  <button onClick={() => deleteComment(comment._id)} className="text-zinc-500 hover:text-red-400"><Trash2 size={16} /></button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
            <input value={text} onChange={(e) => setText(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Add a comment..." />
            <button onClick={addComment} className="text-blue-400"><Send size={18} /></button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

