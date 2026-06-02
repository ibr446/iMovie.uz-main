import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext.jsx';

export function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'login') await login({ email: form.email, password: form.password });
      else await register(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed');
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-zinc-950 p-4 text-white">
      <motion.form onSubmit={submit} className="glass w-full max-w-md rounded-[34px] p-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-black tracking-tight">ShortVerse</h1>
        <p className="mt-2 text-zinc-500">Create, watch, and share short videos.</p>
        {mode === 'register' && (
          <input className="mt-8 w-full rounded-2xl bg-white/10 p-4 outline-none" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        )}
        <input className="mt-4 w-full rounded-2xl bg-white/10 p-4 outline-none" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="mt-4 w-full rounded-2xl bg-white/10 p-4 outline-none" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="mt-4 rounded-2xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        <button className="mt-6 w-full rounded-2xl bg-blue-600 py-4 font-black hover:bg-blue-500">{mode === 'login' ? 'Login' : 'Register'}</button>
        <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="mt-4 w-full text-sm font-bold text-zinc-400 hover:text-white">
          {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Login'}
        </button>
        <button type="button" className="mt-2 w-full text-xs font-bold text-zinc-600">Forgot password?</button>
      </motion.form>
    </div>
  );
}

