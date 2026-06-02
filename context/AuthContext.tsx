
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { apiPost, apiGet, apiPut } from '../api';

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (name: string, email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateProfile: (name: string, avatar: string) => Promise<boolean>;
  isAdmin: boolean;
  loading: boolean;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const userData = await apiGet<User>('/auth/me');
    setUser(userData);
  };

  // On mount, check if we have a token and fetch user data
  useEffect(() => {
    const token = localStorage.getItem('imovie-token');
    if (token) {
      apiGet<User>('/auth/me')
        .then((userData) => {
          setUser(userData);
        })
        .catch(() => {
          // Token expired or invalid
          localStorage.removeItem('imovie-token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, pass: string): Promise<boolean> => {
    try {
      const data = await apiPost<TokenResponse>('/auth/login', {
        email,
        password: pass,
      });
      localStorage.setItem('imovie-token', data.access_token);
      setUser(data.user);
      return true;
    } catch (err) {
      console.error('Login failed:', err);
      return false;
    }
  };

  const register = async (name: string, email: string, pass: string): Promise<boolean> => {
    try {
      const data = await apiPost<TokenResponse>('/auth/register', {
        name,
        email,
        password: pass,
      });
      localStorage.setItem('imovie-token', data.access_token);
      setUser(data.user);
      return true;
    } catch (err) {
      console.error('Registration failed:', err);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('imovie-token');
  };

  const updateProfile = async (name: string, avatar: string): Promise<boolean> => {
    try {
      const updated = await apiPut<User>('/users/me', { name, avatar });
      setUser(updated);
      return true;
    } catch (err) {
      console.error('Profile update failed:', err);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, refreshUser, updateProfile, isAdmin: user?.role === 'admin', loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
