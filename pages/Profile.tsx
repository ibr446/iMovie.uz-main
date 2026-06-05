import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BookmarkCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  Film,
  Heart,
  History,
  KeyRound,
  LogOut,
  Pencil,
  Settings,
  Shield,
  Trash2,
  User,
  XCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { apiDelete, apiGet, apiPut } from '../api';
import { Movie } from '../types';
import MovieCard from '../components/MovieCard';

interface ProfileProps {
  onNavigate: (page: string) => void;
}

type ActiveTab = 'saved' | 'history';
type AccountPanel = 'profile' | 'security' | 'notifications' | 'quality' | null;

const Profile: React.FC<ProfileProps> = ({ onNavigate }) => {
  const { user, logout, updateProfile, refreshUser } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ActiveTab>('saved');
  const [accountPanel, setAccountPanel] = useState<AccountPanel>(null);
  const [savedMovies, setSavedMovies] = useState<Movie[]>([]);
  const [watchHistory, setWatchHistory] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [profileForm, setProfileForm] = useState({ name: '', avatar: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [notifications, setNotifications] = useState(() => ({
    newReleases: localStorage.getItem('imovie-notify-new') !== 'false',
    savedUpdates: localStorage.getItem('imovie-notify-saved') !== 'false',
  }));
  const [quality, setQuality] = useState(() => localStorage.getItem('imovie-quality') || 'auto');

  useEffect(() => {
    if (!user) return;
    setProfileForm({ name: user.name, avatar: user.avatar });
  }, [user]);

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
        await refreshUser().catch(() => {});
      } catch (err) {
        console.error('Failed to fetch profile data:', err);
        setMessage({ type: 'error', text: 'Profile data could not be loaded.' });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const currentList = activeTab === 'saved' ? savedMovies : watchHistory;
  const watchTime = useMemo(() => `${watchHistory.length * 2}h`, [watchHistory.length]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    window.setTimeout(() => setMessage(null), 2500);
  };

  const handleSaveProfile = async () => {
    if (!profileForm.name.trim()) {
      showMessage('error', 'Name is required.');
      return;
    }

    const ok = await updateProfile(profileForm.name.trim(), profileForm.avatar.trim());
    showMessage(ok ? 'success' : 'error', ok ? 'Profile updated.' : 'Profile could not be updated.');
    if (ok) setAccountPanel(null);
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword.length < 8) {
      showMessage('error', 'New password must be at least 8 characters.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showMessage('error', 'Password confirmation does not match.');
      return;
    }

    try {
      await apiPut('/users/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setAccountPanel(null);
      showMessage('success', 'Password updated.');
    } catch (err) {
      console.error('Password update failed:', err);
      showMessage('error', err instanceof Error ? err.message : 'Password could not be updated.');
    }
  };

  const handleSaveNotifications = () => {
    localStorage.setItem('imovie-notify-new', String(notifications.newReleases));
    localStorage.setItem('imovie-notify-saved', String(notifications.savedUpdates));
    setAccountPanel(null);
    showMessage('success', 'Notification settings saved.');
  };

  const handleSaveQuality = () => {
    localStorage.setItem('imovie-quality', quality);
    setAccountPanel(null);
    showMessage('success', 'Playback quality saved.');
  };

  const removeMovie = async (movieId: string) => {
    try {
      if (activeTab === 'saved') {
        await apiDelete(`/users/saved/${movieId}`);
        setSavedMovies(prev => prev.filter(movie => movie.id !== movieId));
      } else {
        await apiDelete(`/users/history/${movieId}`);
        setWatchHistory(prev => prev.filter(movie => movie.id !== movieId));
      }
      await refreshUser().catch(() => {});
      showMessage('success', activeTab === 'saved' ? 'Removed from list.' : 'Removed from history.');
    } catch (err) {
      console.error('Remove failed:', err);
      showMessage('error', 'Could not remove this movie.');
    }
  };

  const clearHistory = async () => {
    try {
      await apiDelete('/users/history');
      setWatchHistory([]);
      await refreshUser().catch(() => {});
      showMessage('success', 'Watch history cleared.');
    } catch (err) {
      console.error('Clear history failed:', err);
      showMessage('error', 'Could not clear watch history.');
    }
  };

  const handleLogout = () => {
    logout();
    onNavigate('home');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 pt-32 pb-20 px-4">
        <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-zinc-900/70 p-8 text-center">
          <User size={40} className="mx-auto text-zinc-500" />
          <h1 className="mt-4 text-2xl font-black text-white">Login required</h1>
          <p className="mt-2 text-sm text-zinc-500">Sign in to see your list, history, and account settings.</p>
          <button
            type="button"
            onClick={() => onNavigate('auth')}
            className="mt-6 rounded-full bg-white px-6 py-3 text-sm font-black text-black transition hover:bg-zinc-200"
          >
            {t('login')}
          </button>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Watch Time', value: watchTime, icon: Clock, color: 'text-blue-500' },
    { label: 'Saved', value: String(savedMovies.length), icon: Heart, color: 'text-red-500' },
    { label: 'Watched', value: String(watchHistory.length), icon: Film, color: 'text-green-500' },
    { label: 'Account', value: user.role === 'admin' ? 'Admin' : 'User', icon: Shield, color: 'text-yellow-500' },
  ];

  const accountRows = [
    { panel: 'profile' as const, label: 'Profile', icon: Pencil, sub: 'Update name and avatar' },
    { panel: 'security' as const, label: 'Security & Password', icon: KeyRound, sub: 'Change your account password' },
    { panel: 'notifications' as const, label: 'Notifications', icon: Bell, sub: 'Choose app alert preferences' },
    { panel: 'quality' as const, label: 'Playback Quality', icon: Settings, sub: 'Default streaming quality' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 pt-32 pb-20">
      <div className="mx-auto max-w-6xl space-y-10 px-4 sm:px-6 lg:px-8">
        {message && (
          <div className={`fixed right-4 top-24 z-[60] flex items-center gap-3 rounded-2xl border px-5 py-4 text-sm font-bold shadow-2xl ${
            message.type === 'success'
              ? 'border-green-500/20 bg-green-500/15 text-green-300'
              : 'border-red-500/20 bg-red-500/15 text-red-300'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            {message.text}
          </div>
        )}

        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/70 p-6 md:p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-rose-500/10" />
          <div className="relative flex flex-col items-center gap-6 md:flex-row md:items-center">
            <img
              src={user.avatar}
              alt={user.name}
              className="h-28 w-28 rounded-full border-4 border-white/10 object-cover shadow-2xl md:h-36 md:w-36"
            />
            <div className="min-w-0 flex-1 text-center md:text-left">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <h1 className="truncate text-4xl font-black tracking-tight text-white">{user.name}</h1>
                <span className="mx-auto rounded-full bg-blue-600 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-white md:mx-0">
                  {user.role === 'admin' ? 'System Administrator' : 'Member'}
                </span>
              </div>
              <p className="mt-2 break-all text-sm font-bold uppercase tracking-widest text-zinc-500">{user.email}</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3 md:justify-start">
                <button
                  type="button"
                  onClick={() => setAccountPanel('profile')}
                  className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-black transition hover:bg-zinc-200"
                >
                  Edit Profile
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full border border-red-500/20 px-5 py-2.5 text-sm font-black text-red-400 transition hover:bg-red-500/10"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5 text-center">
              <stat.icon size={24} className={`mx-auto ${stat.color}`} />
              <span className="mt-3 block text-2xl font-black text-white">{stat.value}</span>
              <span className="mt-1 block text-[10px] font-black uppercase tracking-widest text-zinc-500">{stat.label}</span>
            </div>
          ))}
        </section>

        <section className="space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setActiveTab('saved')}
                className={`flex items-center gap-2 whitespace-nowrap rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-widest transition ${
                  activeTab === 'saved' ? 'bg-blue-600 text-white' : 'border border-white/10 bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                <BookmarkCheck size={18} /> My List ({savedMovies.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 whitespace-nowrap rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-widest transition ${
                  activeTab === 'history' ? 'bg-blue-600 text-white' : 'border border-white/10 bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                <History size={18} /> Watch History ({watchHistory.length})
              </button>
            </div>

            {activeTab === 'history' && watchHistory.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-red-500/20 px-4 py-2 text-xs font-black uppercase tracking-widest text-red-400 transition hover:bg-red-500/10"
              >
                <Trash2 size={15} /> Clear History
              </button>
            )}
          </div>

          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-zinc-900/70 py-16 text-center text-zinc-500">Loading profile...</div>
          ) : currentList.length > 0 ? (
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {currentList.map(movie => (
                <div key={movie.id} className="group relative">
                  <MovieCard movie={movie} onClick={(id) => onNavigate(`movie-${id}`)} />
                  <button
                    type="button"
                    onClick={() => removeMovie(movie.id)}
                    className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/70 text-zinc-300 opacity-0 backdrop-blur transition hover:bg-red-500 hover:text-white group-hover:opacity-100"
                    title={activeTab === 'saved' ? 'Remove from list' : 'Remove from history'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-zinc-900/70 p-12 text-center">
              {activeTab === 'saved' ? <BookmarkCheck size={46} className="mx-auto text-zinc-700" /> : <History size={46} className="mx-auto text-zinc-700" />}
              <h3 className="mt-4 text-xl font-black text-white">
                {activeTab === 'saved' ? 'Your list is empty' : 'No watch history yet'}
              </h3>
              <p className="mt-2 text-sm text-zinc-500">
                {activeTab === 'saved' ? 'Save movies from the details page.' : 'Movies appear here after you start watching.'}
              </p>
              <button
                type="button"
                onClick={() => onNavigate('search')}
                className="mt-6 rounded-full bg-white px-6 py-3 text-sm font-black text-black transition hover:bg-zinc-200"
              >
                Browse Movies
              </button>
            </div>
          )}
        </section>

        <section className="space-y-5">
          <h2 className="px-1 text-2xl font-black tracking-tight text-white">Account Control</h2>
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/70">
            {accountRows.map((item) => (
              <button
                key={item.panel}
                type="button"
                onClick={() => setAccountPanel(accountPanel === item.panel ? null : item.panel)}
                className="flex w-full items-center justify-between border-b border-white/5 p-5 text-left transition last:border-b-0 hover:bg-white/5"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-zinc-300">
                    <item.icon size={22} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-white">{item.label}</h3>
                    <p className="truncate text-xs font-bold uppercase tracking-widest text-zinc-500">{item.sub}</p>
                  </div>
                </div>
                <ChevronRight size={20} className={`shrink-0 text-zinc-600 transition ${accountPanel === item.panel ? 'rotate-90 text-white' : ''}`} />
              </button>
            ))}
          </div>

          {accountPanel && (
            <div className="rounded-3xl border border-white/10 bg-zinc-900/70 p-5 md:p-6">
              {accountPanel === 'profile' && (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Name</span>
                    <input
                      value={profileForm.name}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-blue-500"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Avatar URL</span>
                    <input
                      value={profileForm.avatar}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, avatar: e.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-blue-500"
                    />
                  </label>
                  <button type="button" onClick={handleSaveProfile} className="rounded-2xl bg-blue-600 px-5 py-3 font-black text-white transition hover:bg-blue-500 md:col-span-2">
                    Save Profile
                  </button>
                </div>
              )}

              {accountPanel === 'security' && (
                <div className="grid gap-4 md:grid-cols-3">
                  <input
                    type="password"
                    placeholder="Current password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-blue-500"
                  />
                  <input
                    type="password"
                    placeholder="New password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-blue-500"
                  />
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-blue-500"
                  />
                  <button type="button" onClick={handleChangePassword} className="rounded-2xl bg-blue-600 px-5 py-3 font-black text-white transition hover:bg-blue-500 md:col-span-3">
                    Change Password
                  </button>
                </div>
              )}

              {accountPanel === 'notifications' && (
                <div className="space-y-4">
                  <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4">
                    <span className="font-bold text-white">New release alerts</span>
                    <input
                      type="checkbox"
                      checked={notifications.newReleases}
                      onChange={(e) => setNotifications(prev => ({ ...prev, newReleases: e.target.checked }))}
                      className="h-5 w-5 accent-blue-600"
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4">
                    <span className="font-bold text-white">Saved movie updates</span>
                    <input
                      type="checkbox"
                      checked={notifications.savedUpdates}
                      onChange={(e) => setNotifications(prev => ({ ...prev, savedUpdates: e.target.checked }))}
                      className="h-5 w-5 accent-blue-600"
                    />
                  </label>
                  <button type="button" onClick={handleSaveNotifications} className="w-full rounded-2xl bg-blue-600 px-5 py-3 font-black text-white transition hover:bg-blue-500">
                    Save Notifications
                  </button>
                </div>
              )}

              {accountPanel === 'quality' && (
                <div className="space-y-4">
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-blue-500"
                  >
                    <option value="auto">Auto</option>
                    <option value="2160p">4K Ultra HD</option>
                    <option value="1080p">1080p Full HD</option>
                    <option value="720p">720p HD</option>
                    <option value="480p">480p</option>
                  </select>
                  <button type="button" onClick={handleSaveQuality} className="w-full rounded-2xl bg-blue-600 px-5 py-3 font-black text-white transition hover:bg-blue-500">
                    Save Quality
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-3 rounded-3xl border border-red-500/20 py-5 text-xs font-black uppercase tracking-[0.2em] text-red-400 transition hover:bg-red-500/10"
        >
          <LogOut size={20} /> Sign Out from iMovie.uz
        </button>
      </div>
    </div>
  );
};

export default Profile;
