
import React, { useState, useEffect } from 'react';
import { User, Menu, X, Play, Sun, Moon, LogOut } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';

interface NavbarProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentPage }) => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const { user, logout, isAdmin } = useAuth();
  const isDarkTheme = theme === 'dark';
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: t('home'), id: 'home' },
    { label: t('movies'), id: 'search' },
    { label: t('shorts'), id: 'shorts' },
    { label: t('categories'), id: 'categories' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled ? 'py-3' : 'py-6'}`}>
      <div className="mx-auto flex h-20 w-full items-center justify-between gap-2 px-3 md:hidden">
        <button className="flex min-w-0 items-center gap-2" onClick={() => onNavigate('home')} type="button">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 shadow-lg">
            <Play className="h-5 w-5 fill-current text-white" />
          </div>
          <span className="text-base font-black tracking-tight text-white">iMovie.uz</span>
        </button>

        <div className="flex shrink-0 items-center gap-1.5">
          <LanguageSwitcher />
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDarkTheme ? 'Light mode' : 'Dark mode'}
            className={`hidden rounded-full border p-1.5 transition-all min-[430px]:block ${
              isDarkTheme
                ? 'border-white/10 bg-white/10 text-yellow-300'
                : 'border-zinc-200 bg-white/80 text-indigo-600'
            }`}
          >
            {isDarkTheme ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <button
            type="button"
            className="rounded-full border border-white/10 bg-white/10 p-1.5 text-zinc-100 backdrop-blur-xl"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="mx-4 rounded-3xl border border-white/10 bg-black/80 p-3 shadow-2xl backdrop-blur-xl md:hidden">
          <button
            type="button"
            onClick={toggleTheme}
            className="mb-2 flex w-full items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-left text-sm font-bold text-zinc-200"
          >
            <span>{isDarkTheme ? 'Light mode' : 'Dark mode'}</span>
            {isDarkTheme ? <Sun size={20} className="text-yellow-300" /> : <Moon size={20} className="text-indigo-300" />}
          </button>
          <div className="grid grid-cols-2 gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigate(item.id);
                  setIsMenuOpen(false);
                }}
                className={`rounded-2xl px-4 py-3 text-left text-sm font-bold transition-all ${
                  currentPage === item.id
                    ? 'bg-white text-black'
                    : 'bg-white/5 text-zinc-200 hover:bg-white/10'
                }`}
              >
                {item.label}
              </button>
            ))}
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  onNavigate('admin');
                  setIsMenuOpen(false);
                }}
                className="col-span-2 rounded-2xl bg-yellow-500/15 px-4 py-3 text-left text-sm font-black text-yellow-400"
              >
                {t('admin_panel')}
              </button>
            )}
            {!user && (
              <button
                type="button"
                onClick={() => {
                  onNavigate('auth');
                  setIsMenuOpen(false);
                }}
                className="col-span-2 rounded-2xl bg-white px-4 py-3 text-left text-sm font-black text-black"
              >
                {t('login')}
              </button>
            )}
          </div>
        </div>
      )}

      <div className={`mx-auto hidden w-[calc(100%-1rem)] max-w-7xl px-3 transition-all duration-500 sm:px-6 md:block lg:px-8 ${
        isScrolled
          ? isDarkTheme
            ? 'bg-black/60 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl'
            : 'bg-white/80 backdrop-blur-xl rounded-full border border-zinc-200 shadow-xl'
          : 'bg-transparent'
      }`}>
        <div className="flex h-14 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4 md:gap-8">
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => onNavigate('home')}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 shadow-lg transition-transform group-hover:rotate-12">
                <Play className="h-6 w-6 fill-current text-white" />
              </div>
              <span className={`text-lg font-bold tracking-tighter sm:text-xl ${isDarkTheme ? 'text-white' : 'text-zinc-950'}`}>iMovie.uz</span>
            </div>

            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    currentPage === item.id
                      ? isDarkTheme
                        ? 'text-white bg-white/10'
                        : 'text-zinc-950 bg-zinc-900/10'
                      : isDarkTheme
                        ? 'text-zinc-400 hover:text-white hover:bg-white/5'
                        : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-900/5'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              {isAdmin && (
                <button onClick={() => onNavigate('admin')} className="px-4 py-2 rounded-full text-sm font-bold text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20 transition-all ml-2">
                  {t('admin_panel')}
                </button>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 md:gap-4">
            <div className="block">
              <LanguageSwitcher />
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDarkTheme ? 'Light mode' : 'Dark mode'}
              title={isDarkTheme ? 'Light mode' : 'Dark mode'}
              className={`rounded-full border p-2 transition-all ${
                isDarkTheme
                  ? 'text-yellow-300 bg-white/10 border-white/10 hover:bg-yellow-300/20 hover:text-yellow-200'
                  : 'text-indigo-600 bg-zinc-900/5 border-zinc-200 hover:bg-indigo-600/10 hover:text-indigo-700'
              }`}
            >
              {isDarkTheme ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            {user ? (
              <div className="relative">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-9 h-9 rounded-full border border-white/10 overflow-hidden hover:scale-110 transition-transform"
                >
                  <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                </button>
                {showUserMenu && (
                  <div className="absolute top-full right-0 mt-3 w-56 glass border border-white/10 rounded-[24px] overflow-hidden shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="p-4 border-b border-white/5 flex items-center gap-3">
                       <img src={user.avatar} className="w-10 h-10 rounded-full border border-white/10" />
                       <div className="overflow-hidden">
                         <p className="text-sm font-bold text-white truncate">{user.name}</p>
                         <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
                       </div>
                    </div>
                    <button onClick={() => { onNavigate('profile'); setShowUserMenu(false); }} className="w-full text-left px-5 py-3 text-sm text-zinc-400 hover:text-white hover:bg-white/5 flex items-center gap-3 transition-all">
                      <User size={18} /> {t('profile')}
                    </button>
                    <button onClick={() => { logout(); setShowUserMenu(false); }} className="w-full text-left px-5 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-3 transition-all">
                      <LogOut size={18} /> {t('logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => onNavigate('auth')} className="hidden rounded-full bg-white px-5 py-2 text-sm font-bold text-black transition-all hover:bg-zinc-200 sm:block md:px-6">
                {t('login')}
              </button>
            )}
            
            <button className="rounded-full border border-white/10 bg-white/10 p-2 text-zinc-200 backdrop-blur-xl hover:text-white md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden border-t border-white/10 pb-3 pt-2 animate-in fade-in slide-in-from-top-2">
            <div className="grid grid-cols-2 gap-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setIsMenuOpen(false);
                  }}
                  className={`rounded-2xl px-4 py-3 text-left text-sm font-bold transition-all ${
                    currentPage === item.id
                      ? 'bg-white text-black'
                      : isDarkTheme
                        ? 'bg-white/5 text-zinc-300 hover:bg-white/10'
                        : 'bg-zinc-900/5 text-zinc-700 hover:bg-zinc-900/10'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              {isAdmin && (
                <button
                  onClick={() => {
                    onNavigate('admin');
                    setIsMenuOpen(false);
                  }}
                  className="col-span-2 rounded-2xl bg-yellow-500/15 px-4 py-3 text-left text-sm font-black text-yellow-400"
                >
                  {t('admin_panel')}
                </button>
              )}
              {!user && (
                <button
                  onClick={() => {
                    onNavigate('auth');
                    setIsMenuOpen(false);
                  }}
                  className="col-span-2 rounded-2xl bg-white px-4 py-3 text-left text-sm font-black text-black"
                >
                  {t('login')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
