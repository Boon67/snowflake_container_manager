import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { App } from 'antd';
import { api } from '../services/api.ts';

interface User {
  id: string;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role: string;
  is_active: boolean;
  is_sso_user: boolean;
  sso_provider?: string;
  sso_user_id?: string;
  use_snowflake_auth: boolean;
  last_login?: string;
  created_at: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { message } = App.useApp();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token validity by making a test request
      checkTokenValidity();
    } else {
      setIsLoading(false);
    }
  }, []);

  const checkTokenValidity = async () => {
    try {
      // Make a test request to verify token
      await api.get('/solutions');
      // If we get here, token is valid, but we don't have user info from this endpoint
      // For now, we'll create a mock user object
      const mockUser: User = {
        id: 'current-user',
        username: 'admin', // This could be decoded from JWT in a real app
        role: 'admin',
        is_active: true,
        is_sso_user: false,
        use_snowflake_auth: false,
        created_at: new Date().toISOString(),
      };
      setUser(mockUser);
    } catch (error) {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await api.post('/token', { username, password });
      const { access_token } = response.data;
      
      localStorage.setItem('token', access_token);
      
      const loggedInUser: User = {
        id: 'current-user',
        username,
        role: 'admin', // Default to admin for now
        is_active: true,
        is_sso_user: false,
        use_snowflake_auth: false,
        created_at: new Date().toISOString(),
      };
      
      setUser(loggedInUser);
      message.success('Logged in successfully!');
      return true;
    } catch (error: any) {
      message.error('Login failed. Please check your credentials.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    message.success('Logged out successfully!');
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 