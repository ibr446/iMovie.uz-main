import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('shortverse-token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api.get('/auth/me')
      .then(({ data }) => setUser(data.user))
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [token]);

  const persistSession = (data) => {
    localStorage.setItem('shortverse-token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const login = async (payload) => {
    const { data } = await api.post('/auth/login', payload);
    persistSession(data);
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    persistSession(data);
  };

  const logout = () => {
    localStorage.removeItem('shortverse-token');
    setToken(null);
    setUser(null);
  };

  const value = useMemo(() => ({ user, token, loading, login, register, logout, setUser }), [user, token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

