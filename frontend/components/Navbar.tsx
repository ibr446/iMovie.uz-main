
import React, { useState, useEffect } from 'react';
import { Search, Bell, User, Menu, X, Play, Sun, Moon, LogOut, Settings } from 'lucide-react';
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
      <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-500 ${
        isScrolled
          ? isDarkTheme
            ? 'bg-black/60 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl'
            : 'bg-white/80 backdrop-blur-xl rounded-full border border-zinc-200 shadow-xl'
          : 'bg-transparent'
      }`}>
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => onNavigate('home')}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center group-hover:rotate-12 transition-transform shadow-lg">
                <Play className="w-6 h-6 text-white fill-current" />
              </div>
              <span className={`text-xl font-bold tracking-tighter ${isDarkTheme ? 'text-white' : 'text-zinc-950'}`}>iMovie.uz</span>
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

          <div className="flex items-center gap-2 md:gap-4">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDarkTheme ? 'Light mode' : 'Dark mode'}
              title={isDarkTheme ? 'Light mode' : 'Dark mode'}
              className={`p-2 rounded-full border transition-all ${
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
              <button onClick={() => onNavigate('auth')} className="bg-white text-black px-6 py-2 rounded-full text-sm font-bold hover:bg-zinc-200 transition-all">
                {t('login')}
              </button>
            )}
            
            <button className="md:hidden p-2 text-zinc-400 hover:text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
