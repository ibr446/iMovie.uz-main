
import React, { useState, useEffect } from 'react';
import { User, Settings, Heart, Clock, Download, LogOut, ChevronRight, Shield, Bell, BookmarkCheck, History, Film } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { apiGet } from '../api';
import { Movie } from '../types';
import GlassButton from '../components/GlassButton';
import MovieCard from '../components/MovieCard';

interface ProfileProps {
  onNavigate: (page: string) => void;
}

const Profile: React.FC<ProfileProps> = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const { t, lang } = useTranslation();
  const [activeTab, setActiveTab] = useState<'saved' | 'history'>('saved');
  const [savedMovies, setSavedMovies] = useState<Movie[]>([]);
  const [watchHistory, setWatchHistory] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [saved, history] = await Promise.all([
          apiGet<Movie[]>('/users/saved'),
          apiGet<Movie[]>('/users/history'),
        ]);
        setSavedMovies(saved);
        setWatchHistory(history);
      } catch (err) {
        console.error('Failed to fetch user data:', err);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center text-zinc-500">
      Please login to view your profile.
    </div>
  );

  const currentList = activeTab === 'saved' ? savedMovies : watchHistory;

  return (
    <div className="min-h-screen bg-zinc-950 pt-32 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-center gap-8 p-10 rounded-[40px] glass border-white/10 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          
          <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl group/avatar">
            <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover transition-transform group-hover/avatar:scale-110" />
          </div>

          <div className="flex-1 text-center md:text-left space-y-3 relative z-10">
            <h1 className="text-4xl font-black tracking-tighter text-white">{user.name}</h1>
            <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">{user.email}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-2">
              <span className="px-4 py-1.5 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/30">
                {user.role === 'admin' ? 'System Administrator' : 'Premium Member'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Watch Time', value: `${watchHistory.length * 2}h`, icon: Clock, color: 'text-blue-500' },
            { label: 'Saved', value: String(savedMovies.length), icon: Heart, color: 'text-red-500' },
            { label: 'Watched', value: String(watchHistory.length), icon: Film, color: 'text-green-500' },
            { label: 'Reviews', value: '—', icon: User, color: 'text-purple-500' },
          ].map((stat, i) => (
            <div key={i} className="glass p-8 rounded-3xl border-white/5 flex flex-col items-center gap-3 hover:bg-white/5 transition-all group active:scale-95">
              <stat.icon size={24} className={`${stat.color} group-hover:scale-110 transition-transform`} />
              <span className="text-3xl font-black text-white">{stat.value}</span>
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* My List / Watch History Tabs */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setActiveTab('saved')}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${activeTab === 'saved' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'glass text-zinc-400 hover:text-white hover:bg-white/5'}`}
            >
              <BookmarkCheck size={18} /> My List ({savedMovies.length})
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'glass text-zinc-400 hover:text-white hover:bg-white/5'}`}
            >
              <History size={18} /> Watch History ({watchHistory.length})
            </button>
          </div>

          {/* Movie Grid */}
          {loading ? (
            <div className="text-center py-16 text-zinc-500">Loading...</div>
          ) : currentList.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {currentList.map(movie => (
                <MovieCard key={movie.id} movie={movie} onClick={(id) => onNavigate(`movie-${id}`)} />
              ))}
            </div>
          ) : (
            <div className="glass rounded-[40px] p-16 border-white/5 text-center space-y-4">
              {activeTab === 'saved' ? (
                <>
                  <BookmarkCheck size={48} className="mx-auto text-zinc-700" />
                  <h3 className="text-xl font-black text-zinc-400">Your list is empty</h3>
                  <p className="text-sm text-zinc-600">Save movies to watch later by clicking the bookmark icon</p>
                </>
              ) : (
                <>
                  <History size={48} className="mx-auto text-zinc-700" />
                  <h3 className="text-xl font-black text-zinc-400">No watch history</h3>
                  <p className="text-sm text-zinc-600">Movies you watch will appear here</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="space-y-6">
          <h2 className="text-2xl font-black text-white tracking-tighter px-4">Account Control</h2>
          <div className="glass rounded-[40px] overflow-hidden border-white/10 divide-y divide-white/5 shadow-2xl">
            {[
              { label: 'Security & Password', icon: Shield, sub: 'Manage your primary account security' },
              { label: 'Notifications', icon: Bell, sub: 'App updates and new release alerts' },
              { label: 'Streaming Quality', icon: Settings, sub: 'Manage data usage and resolution' },
            ].map((item, i) => (
              <button key={i} className="w-full flex items-center justify-between p-7 hover:bg-white/5 transition-all group">
                <div className="flex items-center gap-6">
                  <div className="p-4 rounded-2xl bg-white/5 text-zinc-400 group-hover:text-white group-hover:bg-white/10 transition-all">
                    <item.icon size={24} />
                  </div>
                  <div className="text-left">
                    <h4 className="font-black text-white tracking-tight">{item.label}</h4>
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{item.sub}</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-zinc-700 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={logout}
          className="w-full py-6 rounded-[40px] border border-red-500/10 text-red-500 font-black uppercase tracking-[0.2em] text-xs hover:bg-red-500/10 transition-all flex items-center justify-center gap-3 active:scale-95"
        >
          <LogOut size={20} /> Sign Out from iMovie.uz
        </button>
      </div>
    </div>
  );
};

export default Profile;
