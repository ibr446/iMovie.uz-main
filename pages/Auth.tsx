
import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, ArrowRight, Play } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import GlassButton from '../components/GlassButton';

interface AuthProps {
  onSuccess: () => void;
}

const Auth: React.FC<AuthProps> = ({ onSuccess }) => {
  const { login, register } = useAuth();
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    let success: boolean;
    if (isLogin) {
      success = await login(email, password);
    } else {
      if (!name.trim()) {
        setError('Please enter your name');
        setLoading(false);
        return;
      }
      success = await register(name, email, password);
    }

    if (success) {
      onSuccess();
    } else {
      setError(isLogin 
        ? 'Invalid credentials. Try: admin@imovie.uz / admin123' 
        : 'Registration failed. Email may already be in use.'
      );
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-zinc-900 via-black to-zinc-950">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-4">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 items-center justify-center shadow-2xl">
            <Play className="w-10 h-10 text-white fill-current" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white">iMovie.uz</h1>
          <p className="text-zinc-500 font-medium">{isLogin ? 'Welcome back to the cinema' : 'Start your cinematic journey'}</p>
        </div>

        <div className="glass p-8 rounded-[40px] border border-white/10 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Name" 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                  required
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address" 
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password" 
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                required
                minLength={4}
              />
            </div>

            {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}

            <GlassButton 
              type="submit" 
              className="w-full py-4 text-lg" 
              disabled={loading}
            >
              {loading ? 'Processing...' : isLogin ? t('login') : t('register')}
              {!loading && <ArrowRight size={20} />}
            </GlassButton>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-sm font-medium text-zinc-500 hover:text-white transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
