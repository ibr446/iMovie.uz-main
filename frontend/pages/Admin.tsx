
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, TrendingUp, Users, Film, X, Save } from 'lucide-react';
import { useMovies } from '../context/MovieContext';
import { Movie, Language } from '../../types';
import { useTranslation } from '../context/LanguageContext';
import GlassButton from '../components/GlassButton';
import { apiGet } from '../../api';

interface StatsData {
  totalMovies: number;
  totalUsers: number;
  totalViews: number;
  avgRating: number;
}

const AdminPanel: React.FC = () => {
  const { t, lang } = useTranslation();
  const { movies, addMovie, updateMovie, deleteMovie } = useMovies();
  const [activeTab, setActiveTab] = useState('movies');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMovieId, setEditingMovieId] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [saving, setSaving] = useState(false);
  
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
    videoUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
    duration: '1h 30m',
    country: 'USA'
  });

  const [newMovie, setNewMovie] = useState<Partial<Movie>>(createEmptyMovieForm);

  // Fetch stats from API
  useEffect(() => {
    apiGet<StatsData>('/users/stats')
      .then(setStats)
      .catch(err => console.error('Failed to load stats:', err));
  }, [movies]);

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
    try {
      const movieToSave = {
        title: newMovie.title!,
        description: newMovie.description!,
        poster: newMovie.poster || '',
        backdrop: newMovie.backdrop || '',
        videoUrl: newMovie.videoUrl || '',
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
        await addMovie(movieToSave as any);
      }
      closeMovieModal();
    } catch (err) {
      console.error('Save failed:', err);
      alert(`Failed to ${editingMovieId ? 'update' : 'save'} movie. Make sure you are logged in as admin.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 pt-32 pb-20 px-4">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter">{t('admin_panel')}</h1>
            <p className="text-zinc-500 mt-1">Manage your cinema ecosystem</p>
          </div>
          <div className="flex gap-4">
            <GlassButton variant="secondary" onClick={openAddModal}>
              <Plus size={20} /> Add New Content
            </GlassButton>
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
            {['movies', 'users', 'comments', 'shorts'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-5 text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeTab === tab ? 'text-white border-b-2 border-blue-600 bg-white/5' : 'text-zinc-500 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-4 overflow-x-auto">
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
                {movies.map(movie => (
                  <tr key={movie.id} className="group hover:bg-white/5 transition-all">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <img src={movie.poster} className="w-12 h-16 rounded-lg object-cover bg-zinc-800" />
                        <div>
                          <p className="font-bold text-white text-sm">{movie.title[lang]}</p>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{movie.genre.join(', ')}</p>
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

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Video URL (Direct link)</label>
                <input 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  value={newMovie.videoUrl}
                  onChange={e => setNewMovie({ ...newMovie, videoUrl: e.target.value })}
                />
              </div>

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
    </div>
  );
};

export default AdminPanel;
