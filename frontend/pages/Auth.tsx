
import React, { useEffect, useRef, useState } from 'react';
import { Mail, Lock, User as UserIcon, ArrowRight, Play } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import GlassButton from '../components/GlassButton';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: { client_id: string; callback: (response: { credential?: string }) => void }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

interface AuthProps {
  onSuccess: () => void;
}

const Auth: React.FC<AuthProps> = ({ onSuccess }) => {
  const { login, register, googleLogin } = useAuth();
  const { t } = useTranslation();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return;

    const renderGoogleButton = () => {
      if (!window.google || !googleButtonRef.current) return;
      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          if (!response.credential) {
            setError('Google login failed.');
            return;
          }
          setLoading(true);
          setError('');
          const result = await googleLogin(response.credential);
          setLoading(false);
          if (result.ok) {
            onSuccess();
          } else {
            setError(result.error || 'Google login failed.');
          }
        },
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        shape: 'pill',
        text: isLogin ? 'signin_with' : 'signup_with',
        width: googleButtonRef.current.offsetWidth || 320,
      });
    };

    if (window.google) {
      renderGoogleButton();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      existingScript.addEventListener('load', renderGoogleButton, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = renderGoogleButton;
    script.onerror = () => setError('Google login could not be loaded.');
    document.head.appendChild(script);
  }, [googleClientId, googleLogin, isLogin, onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    let result: { ok: boolean; error?: string };
    if (isLogin) {
      result = await login(email, password);
    } else {
      if (!name.trim()) {
        setError('Please enter your name');
        setLoading(false);
        return;
      }
      result = await register(name, email, password);
    }

    if (result.ok) {
      onSuccess();
    } else {
      setError(result.error || (isLogin ? 'Invalid credentials' : 'Registration failed.'));
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
                minLength={isLogin ? 1 : 8}
              />
            </div>

            {/* {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>} */}
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

          {googleClientId && (
            <div className="mt-5">
              <div ref={googleButtonRef} className="flex min-h-11 justify-center" />
            </div>
          )}

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
