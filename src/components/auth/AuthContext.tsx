import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface User {
  id: string;
  email: string;
  name: string | null;
  progenitorName: string;
  isProgenitor: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string, progenitorName?: string) => Promise<void>;
  registerProgenitor: (email: string, password: string, progenitorKey: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiRequest('POST', '/api/auth/login', { email, password });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setUser(data.user);
      queryClient.invalidateQueries();
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, name?: string, progenitorName = 'User') => {
    try {
      const response = await apiRequest('POST', '/api/auth/register', { email, password, name, progenitorName });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setUser(data.user);
      queryClient.invalidateQueries();
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const registerProgenitor = async (email: string, password: string, progenitorKey: string, name?: string) => {
    try {
      const response = await apiRequest('POST', '/api/auth/progenitor/register', { email, password, progenitorKey, name });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Progenitor registration failed');
      }

      setUser(data.user);
      queryClient.invalidateQueries();
    } catch (error) {
      console.error('Progenitor registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      queryClient.clear();
      // Redirect to public Eudoxia page after logout
      window.location.href = '/eudoxia';
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    registerProgenitor,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}