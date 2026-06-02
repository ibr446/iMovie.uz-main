
import React, { useState, useEffect } from 'react';
import { Play, Download, Share2, Plus, Star, Calendar, Clock, Globe, Send, Trash2, X, Check, Pencil, CornerDownRight, BookmarkPlus, BookmarkCheck } from 'lucide-react';
import { Movie, Comment } from '../types';
import GlassButton from '../components/GlassButton';
import MovieCard from '../components/MovieCard';
import { useMovies } from '../context/MovieContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { apiGet, apiPost, apiPut, apiDelete } from '../api';

interface MovieDetailsProps {
  movie: Movie;
  onWatch: (id: string) => void;
  onNavigate: (page: string) => void;
}

const MovieDetails: React.FC<MovieDetailsProps> = ({ movie, onWatch, onNavigate }) => {
  const { lang, t } = useTranslation();
  const { movies } = useMovies();
  const { user, isAdmin } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentRating, setCommentRating] = useState(5);
  const [loadingComments, setLoadingComments] = useState(false);
  
  // Reply state
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  
  // Save state
  const [isSaved, setIsSaved] = useState(false);
  const [savingMovie, setSavingMovie] = useState(false);
  
  // Share/Download feedback
  const [shareMsg, setShareMsg] = useState('');
  
  const similarMovies = movies.filter(m => m.id !== movie.id && m.genre.some(g => movie.genre.includes(g))).slice(0, 4);

  // Check if movie is saved
  useEffect(() => {
    if (!user) return;
    setIsSaved(user.savedMovies?.includes(movie.id) || false);
  }, [user, movie.id]);

  // Fetch comments from API
  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoadingComments(true);
        const data = await apiGet<Comment[]>(`/movies/${movie.id}/comments`);
        setComments(data);
      } catch (err) {
        console.error('Failed to load comments:', err);
      } finally {
        setLoadingComments(false);
      }
    };
    fetchComments();
  }, [movie.id]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;
    try {
      const comment = await apiPost<Comment>(`/movies/${movie.id}/comments`, {
        text: newComment,
        rating: commentRating,
      });
      setComments(prev => [comment, ...prev]);
      setNewComment('');
      setCommentRating(5);
    } catch (err) {
      console.error('Failed to post comment:', err);
    }
  };

  const handleReply = async (parentId: string) => {
    if (!replyText.trim() || !user) return;
    try {
      const reply = await apiPost<Comment>(`/movies/${movie.id}/comments`, {
        text: replyText,
        rating: 0,
        parentId: parentId,
      });
      // Add reply into the parent comment's replies array
      setComments(prev => prev.map(c => {
        if (c.id === parentId) {
          return { ...c, replies: [...(c.replies || []), reply] };
        }
        return c;
      }));
      setReplyingTo(null);
      setReplyText('');
    } catch (err) {
      console.error('Failed to post reply:', err);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editText.trim()) return;
    try {
      const updated = await apiPut<Comment>(`/movies/${movie.id}/comments/${commentId}`, {
        text: editText,
      });
      // Update in top-level or nested
      setComments(prev => prev.map(c => {
        if (c.id === commentId) return { ...c, text: updated.text, isEdited: true };
        if (c.replies) {
          return { ...c, replies: c.replies.map(r => r.id === commentId ? { ...r, text: updated.text, isEdited: true } : r) };
        }
        return c;
      }));
      setEditingId(null);
      setEditText('');
    } catch (err) {
      console.error('Failed to edit comment:', err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await apiDelete(`/movies/${movie.id}/comments/${commentId}`);
      // Remove from top-level or nested
      setComments(prev => prev
        .filter(c => c.id !== commentId)
        .map(c => ({
          ...c,
          replies: (c.replies || []).filter(r => r.id !== commentId),
        }))
      );
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  // Single comment component for reuse
  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => {
    const isOwner = user && comment.userId === user.id;
    const canDelete = isOwner || isAdmin;
    const isEditing = editingId === comment.id;

    return (
      <div className={`group hover:border-white/10 transition-all ${isReply ? 'ml-12 mt-3' : 'glass rounded-3xl p-6 border border-white/5'}`}>
        <div className={`flex items-start gap-4 ${isReply ? 'p-4 rounded-2xl bg-white/[0.02] border border-white/5' : ''}`}>
          <img src={comment.userAvatar} alt={comment.userName} className={`rounded-full object-cover border border-white/10 ${isReply ? 'w-8 h-8' : 'w-10 h-10'}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white text-sm">{comment.userName}</span>
                {!isReply && comment.rating > 0 && (
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star size={12} className="fill-current" />
                    <span className="text-xs font-bold">{comment.rating}</span>
                  </div>
                )}
                {comment.isEdited && (
                  <span className="text-[10px] text-zinc-600 italic">(edited)</span>
                )}
                <span className="text-xs text-zinc-600">{comment.date}</span>
              </div>
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Reply button */}
                {user && !isReply && (
                  <button 
                    onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyText(''); }}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                    title="Reply"
                  >
                    <CornerDownRight size={14} />
                  </button>
                )}
                {/* Edit button - only owner */}
                {isOwner && (
                  <button 
                    onClick={() => { setEditingId(isEditing ? null : comment.id); setEditText(comment.text); }}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-green-400 hover:bg-green-500/10 transition-all"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                )}
                {/* Delete button */}
                {canDelete && (
                  <button 
                    onClick={() => handleDeleteComment(comment.id)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Edit mode */}
            {isEditing ? (
              <div className="flex items-center gap-2 mt-2">
                <input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-600 transition-all"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleEditComment(comment.id)}
                />
                <button onClick={() => handleEditComment(comment.id)} className="p-2 rounded-xl bg-green-500/20 text-green-400 hover:bg-green-500/30">
                  <Check size={16} />
                </button>
                <button onClick={() => setEditingId(null)} className="p-2 rounded-xl bg-white/5 text-zinc-400 hover:bg-white/10">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <p className="text-sm text-zinc-400 leading-relaxed">{comment.text}</p>
            )}
          </div>
        </div>

        {/* Reply input */}
        {replyingTo === comment.id && user && (
          <div className="mt-3 ml-14 flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
            <img src={user.avatar} alt="" className="w-7 h-7 rounded-full object-cover border border-white/10" />
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Reply to ${comment.userName}...`}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleReply(comment.id)}
            />
            <button onClick={() => handleReply(comment.id)} disabled={!replyText.trim()} className="p-2 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-30">
              <Send size={16} />
            </button>
            <button onClick={() => setReplyingTo(null)} className="p-2 rounded-xl bg-white/5 text-zinc-400 hover:bg-white/10">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-0">
            {comment.replies.map(reply => (
              <CommentItem key={reply.id} comment={reply} isReply />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white animate-in fade-in duration-700">
      {/* Hero Backdrop */}
      <div className="relative h-[60vh] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent z-10" />
        <img src={movie.backdrop} alt={movie.title[lang]} className="w-full h-full object-cover scale-105" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-64 relative z-20">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Poster */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="rounded-3xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10 aspect-[2/3]">
              <img src={movie.poster} alt={movie.title[lang]} className="w-full h-full object-cover" />
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4">
              <button 
                onClick={async () => {
                  if (!user) { alert('Please login first'); return; }
                  setSavingMovie(true);
                  try {
                    const res = await apiPost<{saved: boolean}>(`/users/saved/${movie.id}`);
                    setIsSaved(res.saved);
                  } catch (err) { console.error(err); }
                  setSavingMovie(false);
                }}
                disabled={savingMovie}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl glass transition-all ${isSaved ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' : 'hover:bg-white/10'}`}
              >
                {isSaved ? <BookmarkCheck size={20} /> : <BookmarkPlus size={20} />}
                <span className="text-xs font-medium">{isSaved ? 'Saved' : t('my_list')}</span>
              </button>
              <button 
                onClick={async () => {
                  const url = window.location.origin + '/#movie-' + movie.id;
                  const title = movie.title[lang];
                  if (navigator.share) {
                    try {
                      await navigator.share({ title, text: `Watch ${title} on iMovie.uz`, url });
                    } catch (e) { /* user cancelled */ }
                  } else {
                    await navigator.clipboard.writeText(url);
                    setShareMsg('Link copied!');
                    setTimeout(() => setShareMsg(''), 2000);
                  }
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl glass hover:bg-white/10 transition-colors relative"
              >
                <Share2 size={20} />
                <span className="text-xs font-medium">{shareMsg || t('share')}</span>
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 space-y-8">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-full border border-yellow-500/20">
                  <Star size={16} className="fill-current" />
                  <span className="font-bold">{movie.rating}</span>
                </div>
                <div className="flex items-center gap-1 text-zinc-400 text-sm">
                  <Calendar size={14} /> <span>{movie.year}</span>
                </div>
                <div className="flex items-center gap-1 text-zinc-400 text-sm">
                  <Clock size={14} /> <span>{movie.duration}</span>
                </div>
                <div className="flex items-center gap-1 text-zinc-400 text-sm">
                  <Globe size={14} /> <span>{movie.country}</span>
                </div>
              </div>

              <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">{movie.title[lang]}</h1>
              
              <div className="flex flex-wrap gap-2">
                {movie.genre.map(g => (
                  <span key={g} className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-zinc-300">
                    {g}
                  </span>
                ))}
              </div>
            </div>

            <p className="text-xl text-zinc-400 leading-relaxed max-w-3xl">
              {movie.description[lang]}
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <GlassButton onClick={() => onWatch(movie.id)} className="px-10 py-5 text-xl">
                <Play className="fill-current" size={24} /> {t('watch_now')}
              </GlassButton>
              <GlassButton 
                onClick={() => {
                  const videoUrl = movie.videoUrl.startsWith('/') ? `http://${window.location.hostname}:8000${movie.videoUrl}` : movie.videoUrl;
                  const a = document.createElement('a');
                  a.href = videoUrl;
                  a.download = `${movie.title[lang]}.mp4`;
                  a.target = '_blank';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }} 
                variant="secondary" 
                className="px-10 py-5 text-xl"
              >
                <Download size={24} /> {t('download')}
              </GlassButton>
            </div>

            {/* Additional info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 border-t border-white/5">
              <div>
                <h4 className="text-zinc-500 font-bold uppercase text-xs tracking-widest mb-4">Cast</h4>
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <img key={i} src={`https://picsum.photos/seed/${i + 100}/100/100`} className="w-12 h-12 rounded-full border-2 border-zinc-950 object-cover" alt="Cast" />
                  ))}
                  <div className="w-12 h-12 rounded-full border-2 border-zinc-950 bg-zinc-800 flex items-center justify-center text-xs font-bold">+12</div>
                </div>
              </div>
              <div>
                <h4 className="text-zinc-500 font-bold uppercase text-xs tracking-widest mb-4">Quality</h4>
                <p className="font-bold text-white">Ultra HD 4K, HDR10+</p>
              </div>
              <div>
                <h4 className="text-zinc-500 font-bold uppercase text-xs tracking-widest mb-4">Audio</h4>
                <p className="font-bold text-white">Dolby Atmos, 5.1 Surround</p>
              </div>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <section className="py-24 border-t border-white/5 mt-16">
          <h2 className="text-3xl font-black tracking-tight mb-8">{t('comments')} ({comments.length})</h2>
          
          {/* Add Comment */}
          {user ? (
            <div className="glass rounded-3xl p-6 border border-white/10 mb-8">
              <div className="flex items-start gap-4">
                <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full object-cover border border-white/10" />
                <div className="flex-1 space-y-4">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={t('add_comment')}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all resize-none min-h-[80px]"
                  />
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Rating:</span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(star => (
                          <button
                            key={star}
                            onClick={() => setCommentRating(star)}
                            className={`transition-all ${star <= commentRating ? 'text-yellow-500' : 'text-zinc-700'}`}
                          >
                            <Star size={16} className={star <= commentRating ? 'fill-current' : ''} />
                          </button>
                        ))}
                      </div>
                      <span className="text-sm font-bold text-yellow-500">{commentRating}/10</span>
                    </div>
                    <GlassButton onClick={handleAddComment} disabled={!newComment.trim()}>
                      <Send size={16} /> {t('post')}
                    </GlassButton>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass rounded-3xl p-8 border border-white/10 mb-8 text-center">
              <p className="text-zinc-500 font-medium">Login to leave a comment</p>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-4">
            {loadingComments ? (
              <div className="text-center py-12 text-zinc-500">Loading comments...</div>
            ) : comments.length > 0 ? (
              comments.map(comment => (
                <CommentItem key={comment.id} comment={comment} />
              ))
            ) : (
              <div className="text-center py-12 text-zinc-600">No comments yet. Be the first!</div>
            )}
          </div>
        </section>

        {/* Similar Movies */}
        {similarMovies.length > 0 && (
          <section className="py-24">
            <h2 className="text-3xl font-black tracking-tight mb-8">More Like This</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {similarMovies.map(m => (
                <MovieCard key={m.id} movie={m} onClick={(id) => onNavigate(`movie-${id}`)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default MovieDetails;
