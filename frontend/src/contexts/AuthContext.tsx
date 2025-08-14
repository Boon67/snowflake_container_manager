import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { App } from 'antd';
import { api } from '../services/api.ts';

interface SnowflakeUser {
  username: string;
  account: string;
}

interface AuthContextType {
  user: SnowflakeUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (account: string, username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<SnowflakeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { message } = App.useApp();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token validity by getting user info
      checkTokenValidity();
    } else {
      setIsLoading(false);
    }
  }, []);

  const checkTokenValidity = async () => {
    try {
      // Get current user info to verify token and get user details
      const response = await api.get('/user/me');
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('snowflake_account');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (account: string, username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await api.post('/token', { account, username, password });
      const { access_token } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('snowflake_account', account);
      
      const loggedInUser: SnowflakeUser = {
        username,
        account
      };
      
      setUser(loggedInUser);
      message.success('Logged in successfully!');
      return true;
    } catch (error: any) {
      message.error('Login failed. Please check your Snowflake credentials.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    // Always keep account, only remove username/remember_me if remember was not checked
    const rememberMe = localStorage.getItem('remember_me') === 'true';
    if (!rememberMe) {
      localStorage.removeItem('snowflake_username');
      localStorage.removeItem('remember_me');
    }
    // Never remove snowflake_account - always remember it
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