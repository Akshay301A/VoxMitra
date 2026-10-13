import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, getStoredToken } from '../api/client.ts';
import { Business, User } from '../types.ts';

interface AuthContextType {
  user: User | null;
  business: Business | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; fullName: string; businessName: string }) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshMe = async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
      setBusiness(data.business);
    } catch (err) {
      console.warn('Failed to load active session:', err);
      setUser(null);
      setBusiness(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshMe();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.login(email, password);
    setUser(data.user);
    setBusiness(data.business);
  };

  const register = async (data: { email: string; password: string; fullName: string; businessName: string }) => {
    const res = await api.register(data);
    setUser(res.user);
    setBusiness(res.business);
  };

  const logout = () => {
    api.logout();
    setUser(null);
    setBusiness(null);
  };

  return (
    <AuthContext.Provider value={{ user, business, loading, login, register, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
