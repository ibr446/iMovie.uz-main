import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Eye, TrendingUp, Users, Film, X, Save, MessageCircle, Video } from 'lucide-react';
import { useMovies } from '../context/MovieContext';
import { Movie, Language } from '../../types';
import { useTranslation } from '../context/LanguageContext';
import GlassButton from '../components/GlassButton';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api';

interface StatsData {
  totalMovies: number;
  totalUsers: number;
  totalViews: number;
  avgRating: number;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  created_at: string | null;
}

interface AdminComment {
  id: string;
  movieId: string;
  movieTitle: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  date: string;
  rating: number;
}

interface ShortItem {
  id: string;
  movieId?: string | null;
  author: string;
  name: string;
  avatar: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  videoUrl: string;
  caption: string;
  audio: string;
  location: string;
  tags: string[];
  isLiked?: boolean;
  isSaved?: boolean;
}

const AdminPanel: React.FC = () => {
  const { t, lang } = useTranslation();
  const { movies, addMovie, updateMovie, deleteMovie, refreshMovies } = useMovies();
  const [activeTab, setActiveTab] = useState('movies');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMovieId, setEditingMovieId] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [saving, setSaving] = useState(false);

  // Users state
  const [usersList, setUsersList] = useState<AdminUser[]>([]);

  // Comments state
  const [commentsList, setCommentsList] = useState<AdminComment[]>([]);

  // Shorts state
  const [shortsList, setShortsList] = useState<ShortItem[]>([]);
  const [showShortModal, setShowShortModal] = useState(false);
  const [editingShortId, setEditingShortId] = useState<string | null>(null);
  const [shortForm, setShortForm] = useState({
    videoUrl: '',
    caption: '',
    author: '@imovie_official',
    name: 'iMovie.uz',
    avatar: '',
    audio: '',
    location: '',
    tags: '',
  });

  const createEmptyMovieForm = (): Partial<Movie> => ({
    id: '',
    title: { en: '', ru: '', uz: '' },
    description: { en: '', ru: '', uz: '' },
    genre: [],
    year: new Date().getFullYear(),
    rating: 0,
    views: 0,
    poster: '',
    backdrop: '',
    videoUrl: '',
    contentType: 'movie',
    episodes: [],
    duration: '1h 30m',
    country: 'USA'
  });

  const [newMovie, setNewMovie] = useState<Partial<Movie>>(createEmptyMovieForm);

const buildEpisodes = (count: number, current = newMovie.episodes || [], fallbackVideoUrl = '') => (
    Array.from({ length: Math.max(1, count) }, (_, index) => {
      const number = index + 1;
      const existing = current.find(episode => episode.number === number) || current[index];
      return {
        number,
        title: existing?.title || `${number}-seriya`,
        videoUrl: existing?.videoUrl || fallbackVideoUrl,
      };
    })
  );

  const setEpisodeCount = (count: number) => {
    setNewMovie(prev => ({
      ...prev,
      contentType: 'series',
      episodes: buildEpisodes(count, prev.episodes || [], ''),
    }));
  };


  const updateEpisode = (number: number, field: 'title' | 'videoUrl', value: string) => {
    setNewMovie(prev => ({
      ...prev,
      episodes: buildEpisodes(prev.episodes?.length || 1, prev.episodes || [], '').map(episode => (
        episode.number === number ? { ...episode, [field]: value } : episode
      )),
    }));
  };

  // Fetch stats from API
  useEffect(() => {
    apiGet<StatsData>('/users/stats')
      .then(setStats)
      .catch(err => console.error('Failed to load stats:', err));
  }, [movies]);

  // Fetch users
  const fetchUsers = useCallback(() => {
    apiGet<AdminUser[]>('/users/all')
      .then(setUsersList)
      .catch(err => console.error('Failed to load users:', err));
  }, []);

  // Fetch comments
  const fetchComments = useCallback(() => {
    apiGet<AdminComment[]>('/movies/comments/all')
      .then(setCommentsList)
      .catch(err => console.error('Failed to load comments:', err));
  }, []);

  // Fetch shorts
  const fetchShorts = useCallback(() => {
    apiGet<ShortItem[]>('/shorts')
      .then(data => {
        if (data.length > 0) setShortsList(data);
      })
      .catch(err => console.error('Failed to load shorts:', err));
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'comments') fetchComments();
    if (activeTab === 'shorts') fetchShorts();
  }, [activeTab, fetchUsers, fetchComments, fetchShorts]);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this movie?')) {
      try {
        await deleteMovie(id);
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
  };

  const openAddModal = () => { 
    setEditingMovieId(null);
    setNewMovie(createEmptyMovieForm());
    setShowAddModal(true);
  };

  const openEditModal = (movie: Movie) => {
    setEditingMovieId(movie.id);
    setNewMovie({
      ...movie,
      title: { ...movie.title },
      description: { ...movie.description },
      genre: [...movie.genre],
      contentType: movie.contentType ?? "movie",
      episodes: movie.episodes ? movie.episodes.map(episode => ({ ...episode })) : [],
    });
    setShowAddModal(true);
  };

  const closeMovieModal = () => {
    setShowAddModal(false);
    setEditingMovieId(null);
    setSaving(false);
    setNewMovie(createEmptyMovieForm());
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    console.log("NEW MOVIE STATE:", newMovie)
    try {
      const contentType = newMovie.contentType === 'series' ? 'series' : 'movie';
      const episodes = contentType === 'series'
        ? buildEpisodes(newMovie.episodes?.length || 1, newMovie.episodes || [], '')
        : [];

      console.log('FINAL DATA:', {
        contentType,
        episodes,
        newMovie
      })
      const movieToSave = {
        ...newMovie,
        contentType,
        episodes: contentType === "series" ? episodes : [],
        title: newMovie.title!,
        description: newMovie.description!,
        poster: newMovie.poster || '',
        backdrop: newMovie.backdrop || '',
        videoUrl: contentType === 'series' ? '' : (newMovie.videoUrl || ''),
        year: newMovie.year || new Date().getFullYear(),
        genre: newMovie.genre || [],
        rating: newMovie.rating || 0,
        duration: newMovie.duration || '',
        country: newMovie.country || '',
        isTrending: newMovie.isTrending ?? false,
        isNew: newMovie.isNew ?? true,
      };

      if (editingMovieId) {
        await updateMovie({
          ...(movieToSave as Omit<Movie, 'id' | 'views'>),
          id: editingMovieId,
          views: newMovie.views ?? 0,
        });
      } else {
        await addMovie(movieToSave);
      }
      await refreshMovies();
      closeMovieModal();
    } catch (err) {
      console.error('Save failed:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to ${editingMovieId ? 'update' : 'save'} movie: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  // Shorts CRUD
  const resetShortForm = () => {
    setShortForm({
      videoUrl: '',
      caption: '',
      author: '@imovie_official',
      name: 'iMovie.uz',
      avatar: '',
      audio: '',
      location: '',
      tags: '',
    });
  };

  const openAddShortModal = () => {
    setEditingShortId(null);
    resetShortForm();
    setShowShortModal(true);
  };

  const openEditShortModal = (short: ShortItem) => {
    setEditingShortId(short.id);
    setShortForm({
      videoUrl: short.videoUrl,
      caption: short.caption,
      author: short.author,
      name: short.name,
      avatar: short.avatar,
      audio: short.audio,
      location: short.location,
      tags: short.tags.join(', '),
    });
    setShowShortModal(true);
  };

  const handleShortSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const tagsArray = shortForm.tags.split(',').map(t => t.trim()).filter(Boolean);
      const payload = {
        videoUrl: shortForm.videoUrl,
        caption: shortForm.caption,
        author: shortForm.author,
        name: shortForm.name,
        avatar: shortForm.avatar || `https://picsum.photos/seed/${shortForm.name.toLowerCase().replace(/\s+/g, '-')}/96/96`,
        audio: shortForm.audio,
        location: shortForm.location,
        tags: tagsArray,
      };

      if (editingShortId) {
        await apiPut(`/shorts/${editingShortId}`, payload);
      } else {
        await apiPost('/shorts', payload);
      }
      await fetchShorts();
      setShowShortModal(false);
      setEditingShortId(null);
      resetShortForm();
    } catch (err) {
      console.error('Short save failed:', err);
      alert(`Failed to ${editingShortId ? 'update' : 'save'} short`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteShort = async (shortId: string) => {
    if (confirm('Are you sure you want to delete this short?')) {
      try {
        await apiDelete(`/shorts/${shortId}`);
        await fetchShorts();
      } catch (err) {
        console.error('Delete short failed:', err);
      }
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user? All their data will be removed.')) {
      try {
        await apiDelete(`/auth/users/${userId}`);
        fetchUsers();
      } catch (err) {
        console.error('Delete user failed:', err);
        alert('Failed to delete user. Admin users cannot be deleted.');
      }
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (confirm('Are you sure you want to delete this comment?')) {
      try {
        await apiDelete(`/movies/comments/all/${commentId}`);
        fetchComments();
      } catch (err) {
        console.error('Delete comment failed:', err);
      }
    }
  };

  // ── Render management table based on active tab ──
  const renderTable = () => {
    switch (activeTab) {
      case 'users':
        return renderUsersTable();
      case 'comments':
        return renderCommentsTable();
      case 'shorts':
        return renderShortsTable();
      default:
        return renderMoviesTable();
    }
  };

  const renderUsersTable = () => (
    <table className="w-full text-left border-separate border-spacing-y-2 min-w-[600px]">
      <thead>
        <tr className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
          <th className="px-6 py-4">{t('name')}</th>
          <th className="px-6 py-4">{t('email')}</th>
          <th className="px-6 py-4">{t('role')}</th>
          <th className="px-6 py-4">{t('joined')}</th>
          <th className="px-6 py-4 text-right">{t('actions')}</th>
        </tr>
      </thead>
      <tbody>
        {usersList.length === 0 ? (
          <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-500 text-sm">{t('no_users')}</td></tr>
        ) : (
          usersList.map(user => (
            <tr key={user.id} className="group hover:bg-white/5 transition-all">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <img src={user.avatar || `https://picsum.photos/seed/${user.id}/48/48`} className="w-9 h-9 rounded-full object-cover bg-zinc-800" />
                  <div>
                    <p className="font-bold text-white text-sm">{user.name}</p>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{user.id}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-sm font-medium text-zinc-300">{user.email}</td>
              <td className="px-6 py-4">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  {user.role}
                </span>
              </td>
              <td className="px-6 py-4 text-sm font-medium text-zinc-300">{user.created_at || '—'}</td>
              <td className="px-6 py-4 text-right">
                {user.role !== 'admin' && (
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleDeleteUser(user.id)} className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:text-red-300 transition-all"><Trash2 size={16} /></button>
                  </div>
                )}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );

  const renderCommentsTable = () => (
    <table className="w-full text-left border-separate border-spacing-y-2 min-w-[600px]">
      <thead>
        <tr className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
          <th className="px-6 py-4">{t('name')}</th>
          <th className="px-6 py-4">{t('movie_title')}</th>
          <th className="px-6 py-4">{t('text')}</th>
          <th className="px-6 py-4">{t('date')}</th>
          <th className="px-6 py-4 text-right">{t('actions')}</th>
        </tr>
      </thead>
      <tbody>
        {commentsList.length === 0 ? (
          <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-500 text-sm">{t('no_comments')}</td></tr>
        ) : (
          commentsList.map(comment => (
            <tr key={comment.id} className="group hover:bg-white/5 transition-all">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <img src={comment.userAvatar || `https://picsum.photos/seed/${comment.userId}/36/36`} className="w-8 h-8 rounded-full object-cover bg-zinc-800" />
                  <div>
                    <p className="font-bold text-white text-sm">{comment.userName}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-sm font-medium text-zinc-300 max-w-[150px] truncate">{comment.movieTitle || comment.movieId}</td>
              <td className="px-6 py-4 text-sm font-medium text-zinc-300 max-w-[250px] truncate">{comment.text}</td>
              <td className="px-6 py-4 text-sm font-medium text-zinc-300 whitespace-nowrap">{comment.date}</td>
              <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleDeleteComment(comment.id)} className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:text-red-300 transition-all"><Trash2 size={16} /></button>
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );

  const renderShortsTable = () => (
    <table className="w-full text-left border-separate border-spacing-y-2 min-w-[600px]">
      <thead>
        <tr className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
          <th className="px-6 py-4">Video</th>
          <th className="px-6 py-4">{t('short_caption')}</th>
          <th className="px-6 py-4">{t('short_author')}</th>
          <th className="px-6 py-4">Views</th>
          <th className="px-6 py-4">Likes</th>
          <th className="px-6 py-4 text-right">{t('actions')}</th>
        </tr>
      </thead>
      <tbody>
        {shortsList.length === 0 ? (
          <tr><td colSpan={6} className="px-6 py-12 text-center text-zinc-500 text-sm">{t('no_shorts')}</td></tr>
        ) : (
          shortsList.map(short => (
            <tr key={short.id} className="group hover:bg-white/5 transition-all">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-16 rounded-lg bg-zinc-800 flex items-center justify-center">
                    <Video size={20} className="text-zinc-500" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm truncate max-w-[150px]">{short.name}</p>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{short.id}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-sm font-medium text-zinc-300 max-w-[200px] truncate">{short.caption || '—'}</td>
              <td className="px-6 py-4 text-sm font-medium text-zinc-300">{short.author}</td>
              <td className="px-6 py-4 text-sm font-medium text-zinc-300">{(short.views / 1000).toFixed(1)}K</td>
              <td className="px-6 py-4 text-sm font-medium text-zinc-300">{short.likes}</td>
              <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditShortModal(short)} className="p-2 rounded-xl bg-white/5 text-zinc-400 hover:text-white transition-all"><Edit2 size={16} /></button>
                  <button onClick={() => handleDeleteShort(short.id)} className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:text-red-300 transition-all"><Trash2 size={16} /></button>
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );

  const renderMoviesTable = () => (
    <table className="w-full text-left border-separate border-spacing-y-2 min-w-[600px]">
      <thead>
        <tr className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
          <th className="px-6 py-4">Movie</th>
          <th className="px-6 py-4">Release</th>
          <th className="px-6 py-4">Views</th>
          <th className="px-6 py-4 text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {(activeTab === 'series'
          ? movies.filter(m => m.contentType === "series")
          : activeTab === 'movies'
            ? movies.filter(m => m.contentType === "movie")
            : movies
        ).map(movie => (
          <tr key={movie.id} className="group hover:bg-white/5 transition-all">
            <td className="px-6 py-4">
              <div className="flex items-center gap-4">
                <img src={movie.poster} className="w-12 h-16 rounded-lg object-cover bg-zinc-800" />
                <div>
                  <p className="font-bold text-white text-sm">{movie.title[lang]}</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{movie.genre.join(', ')}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-blue-400">
                    {(movie.contentType || 'movie') === 'series' ? `${movie.episodes?.length || 0} episodes` : 'Movie'}
                  </p>
                </div>
              </div>
            </td>
            <td className="px-6 py-4 text-sm font-medium text-zinc-300">{movie.year}</td>
            <td className="px-6 py-4 text-sm font-medium text-zinc-300">{(movie.views / 1000).toFixed(1)}K</td>
            <td className="px-6 py-4 text-right">
              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEditModal(movie)} className="p-2 rounded-xl bg-white/5 text-zinc-400 hover:text-white transition-all"><Edit2 size={16} /></button>
                <button onClick={() => handleDelete(movie.id)} className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:text-red-300 transition-all"><Trash2 size={16} /></button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const tabActionButton = () => {
    if (activeTab === 'shorts') {
      return (
        <GlassButton variant="secondary" onClick={openAddShortModal}>
          <Plus size={20} /> {t('add_short')}
        </GlassButton>
      );
    }
    if (activeTab === 'movies' || activeTab === 'series') {
      return (
        <GlassButton variant="secondary" onClick={openAddModal}>
          <Plus size={20} /> Add New Content
        </GlassButton>
      );
    }
    return null;
  };

  return (
<div className="min-h-screen pt-32 pb-20 px-4">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter">{t('admin_panel')}</h1>
            <p className="text-zinc-500 mt-1">Manage your cinema ecosystem</p>
          </div>
          <div className="flex gap-4">
            {tabActionButton()}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Total Movies', value: stats?.totalMovies ?? movies.length, icon: Film, color: 'text-blue-500' },
            { label: 'Total Users', value: stats?.totalUsers ?? '—', icon: Users, color: 'text-purple-500' },
            { label: 'Platform Views', value: stats ? `${(stats.totalViews / 1000).toFixed(1)}K` : '—', icon: Eye, color: 'text-green-500' },
            { label: 'Avg Rating', value: stats?.avgRating ?? '—', icon: TrendingUp, color: 'text-yellow-500' },
          ].map((stat, i) => (
            <div key={i} className="glass p-6 rounded-3xl border-white/5 flex items-center gap-4">
              <div className={`p-4 rounded-2xl bg-white/5 ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">{stat.label}</p>
                <p className="text-3xl font-black text-white">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Management Table */}
        <div className="glass rounded-[40px] border border-white/10 overflow-hidden shadow-2xl">
          <div className="flex border-b border-white/5 overflow-x-auto no-scrollbar">
                {['movies', 'series', 'users', 'comments', 'shorts'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-5 text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeTab === tab ? 'text-white border-b-2 border-blue-600 bg-white/5' : 'text-zinc-500 hover:text-white'
                }`}
              >
                {tab === 'users' ? t('users') : tab === 'comments' ? t('comments_title') : tab === 'shorts' ? t('shorts_nav') : tab}
              </button>
            ))}
          </div>

          <div className="p-4 overflow-x-auto">
            {renderTable()}
          </div>
        </div>
      </div>

      {/* Add/Edit Movie Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[40px] p-8 border border-white/10 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-black text-white tracking-tighter">{editingMovieId ? 'Edit Movie' : 'Add Movie'}</h2>
              <button onClick={closeMovieModal} className="p-2 rounded-full hover:bg-white/10 text-zinc-400">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['en', 'ru', 'uz'].map(l => (
                  <div key={l} className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Title ({l})</label>
                    <input 
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                      value={newMovie.title?.[l as Language] || ''}
                      onChange={e => setNewMovie({ ...newMovie, title: { ...newMovie.title!, [l]: e.target.value } })}
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['en', 'ru', 'uz'].map(l => (
                  <div key={l} className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Description ({l})</label>
                    <textarea 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[80px] resize-none"
                      value={newMovie.description?.[l as Language] || ''}
                      onChange={e => setNewMovie({ ...newMovie, description: { ...newMovie.description!, [l]: e.target.value } })}
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Year</label>
                  <input 
                    type="number"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    value={newMovie.year}
                    onChange={e => setNewMovie({ ...newMovie, year: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Rating</label>
                  <input 
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    value={newMovie.rating}
                    onChange={e => setNewMovie({ ...newMovie, rating: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Country</label>
                  <input 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    value={newMovie.country}
                    onChange={e => setNewMovie({ ...newMovie, country: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Badges</label>
                  <div className="flex h-[46px] items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4">
                    <label className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                      <input type="checkbox" checked={!!newMovie.isTrending} onChange={e => setNewMovie({ ...newMovie, isTrending: e.target.checked })} />
                      Trending
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                      <input type="checkbox" checked={!!newMovie.isNew} onChange={e => setNewMovie({ ...newMovie, isNew: e.target.checked })} />
                      New
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Genre (comma separated)</label>
                  <input 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Action, Drama, Sci-Fi"
                    value={(newMovie.genre || []).join(', ')}
                    onChange={e => setNewMovie({ ...newMovie, genre: e.target.value.split(',').map(g => g.trim()).filter(Boolean) })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Duration</label>
                  <input 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="2h 15m"
                    value={newMovie.duration}
                    onChange={e => setNewMovie({ ...newMovie, duration: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Content type</label>
                  <select
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    value={newMovie.contentType || 'movie'}
                    onChange={e => {
                      const contentType = e.target.value as Movie['contentType'];
                      setNewMovie(prev => ({
                        ...prev,
                        contentType,
                        videoUrl: contentType === 'series' ? '' : prev.videoUrl,
                        episodes: contentType === 'series' ? buildEpisodes(prev.episodes?.length || 1, prev.episodes || [], '') : [],
                      }));
                    }}
                  >
                    <option value="movie" className="bg-zinc-950">Movie</option>
                    <option value="series" className="bg-zinc-950">Series</option>
                  </select>
                </div>

                {(newMovie.contentType || 'movie') === 'series' ? (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Episode count</label>
                    <input
                      type="number"
                      min="1"
                      max="200"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                      value={newMovie.episodes?.length || 1}
                      onChange={e => setEpisodeCount(parseInt(e.target.value) || 1)}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Main video URL</label>
                    <input
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="Avengers.mp4 yoki https://example.com/movie.mp4"
                      value={newMovie.videoUrl}
                      onChange={e => setNewMovie({ ...newMovie, videoUrl: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {(newMovie.contentType || 'movie') === 'series' && (
                <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Episodes</label>
                    <span className="text-xs font-bold text-zinc-500">{newMovie.episodes?.length || 1} total</span>
                  </div>
                  <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                    {buildEpisodes(newMovie.episodes?.length || 1, newMovie.episodes || [], '').map(episode => (
                      <div key={episode.number} className="grid grid-cols-1 gap-2 rounded-xl border border-white/5 bg-black/20 p-3 md:grid-cols-[92px_1fr_1.6fr]">
                        <div className="flex items-center rounded-lg bg-white/5 px-3 text-xs font-black text-white">
                          {episode.number}-seriya
                        </div>
                        <input
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                          placeholder="Episode title"
                          value={episode.title || ''}
                          onChange={e => updateEpisode(episode.number, 'title', e.target.value)}
                        />
                        <input
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                          placeholder="Episode video URL"
                          value={episode.videoUrl || ''}
                          onChange={e => updateEpisode(episode.number, 'videoUrl', e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Poster URL</label>
                  <input 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Movie poster image URL"
                    value={newMovie.poster}
                    onChange={e => setNewMovie({ ...newMovie, poster: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Backdrop URL</label>
                  <input 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Optional wide movie image URL"
                    value={newMovie.backdrop}
                    onChange={e => setNewMovie({ ...newMovie, backdrop: e.target.value })}
                  />
                </div>
              </div>

              <GlassButton type="submit" className="w-full py-4 text-lg" disabled={saving}>
                <Save size={20} /> {saving ? 'Saving...' : editingMovieId ? 'Update Movie' : 'Save Movie'}
              </GlassButton>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Short Modal */}
      {showShortModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[40px] p-8 border border-white/10 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-black text-white tracking-tighter">{editingShortId ? t('edit_short') : t('add_short')}</h2>
              <button onClick={() => { setShowShortModal(false); setEditingShortId(null); resetShortForm(); }} className="p-2 rounded-full hover:bg-white/10 text-zinc-400">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleShortSave} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{t('short_video_url')} *</label>
                <input
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="videoplayback.mp4 or https://example.com/video.mp4"
                  value={shortForm.videoUrl}
                  onChange={e => setShortForm({ ...shortForm, videoUrl: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{t('short_caption')}</label>
                <textarea
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[70px] resize-none"
                  placeholder="Video description..."
                  value={shortForm.caption}
                  onChange={e => setShortForm({ ...shortForm, caption: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{t('short_author')}</label>
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="@imovie_official"
                    value={shortForm.author}
                    onChange={e => setShortForm({ ...shortForm, author: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{t('short_name')}</label>
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="iMovie.uz"
                    value={shortForm.name}
                    onChange={e => setShortForm({ ...shortForm, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{t('short_avatar')}</label>
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="https://picsum.photos/seed/.../96/96"
                  value={shortForm.avatar}
                  onChange={e => setShortForm({ ...shortForm, avatar: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{t('short_audio')}</label>
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Original Sound"
                    value={shortForm.audio}
                    onChange={e => setShortForm({ ...shortForm, audio: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{t('short_location')}</label>
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="South Korea"
                    value={shortForm.location}
                    onChange={e => setShortForm({ ...shortForm, location: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{t('short_tags')}</label>
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="action, drama, thriller"
                  value={shortForm.tags}
                  onChange={e => setShortForm({ ...shortForm, tags: e.target.value })}
                />
              </div>

              <GlassButton type="submit" className="w-full py-4 text-lg" disabled={saving}>
                <Save size={20} /> {saving ? 'Saving...' : editingShortId ? t('edit_short') : t('add_short')}
              </GlassButton>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;