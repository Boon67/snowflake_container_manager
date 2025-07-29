import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { ThemeProvider, useTheme } from './contexts/ThemeContext.tsx';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import Login from './components/Login.tsx';
import Dashboard from './components/Dashboard.tsx';
import ProtectedRoute from './components/ProtectedRoute.tsx';
import './App.css';

const ThemedApp: React.FC = () => {
  const { isDarkMode } = useTheme();

  const getThemeConfig = () => ({
    algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      // Snowflake primary colors
      colorPrimary: '#1F86C9',
      colorInfo: '#1F86C9',
      colorSuccess: '#52c41a',
      colorWarning: '#faad14',
      colorError: '#f5222d',
      
      // Border radius
      borderRadius: 6,
      borderRadiusLG: 8,
      borderRadiusXS: 4,
      
      // Font settings
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontSize: 14,
      fontWeightStrong: 600,
      
      // Light mode specific overrides
      ...(isDarkMode ? {} : {
        colorBgContainer: '#FFFFFF',
        colorBgElevated: '#FFFFFF',
        colorBgLayout: '#F8F9FA',
        colorBgMask: 'rgba(31, 134, 201, 0.45)',
        colorText: '#212529',
        colorTextSecondary: '#6C757D',
        colorTextTertiary: '#6C757D',
        colorTextPlaceholder: '#6C757D',
        colorBorder: '#DEE2E6',
        colorBorderSecondary: '#DEE2E6',
        colorFillAlter: '#F8F9FA',
        colorFillContent: '#E8F4FD',
        colorFillSecondary: '#E8F4FD',
      }),
    },
    components: {
      Layout: {
        siderBg: isDarkMode ? undefined : '#0D4F8C',
        headerBg: isDarkMode ? undefined : '#FFFFFF',
        bodyBg: isDarkMode ? undefined : '#F8F9FA',
      },
      Menu: {
        darkItemBg: '#0D4F8C',
        darkItemSelectedBg: '#1F86C9',
        darkItemHoverBg: '#1F86C9',
        darkItemColor: '#FFFFFF',
        darkItemSelectedColor: '#FFFFFF',
        darkItemHoverColor: '#FFFFFF',
      },
      Button: {
        primaryColor: '#FFFFFF',
        fontWeight: 500,
      },
      Table: {
        headerBg: isDarkMode ? undefined : '#E8F4FD',
        headerColor: isDarkMode ? undefined : '#0D4F8C',
        rowHoverBg: isDarkMode ? undefined : '#E3F2FD',
      },
      Card: {
        boxShadowTertiary: '0 2px 8px rgba(0, 0, 0, 0.06)',
      },
      Modal: {
        contentBg: isDarkMode ? undefined : '#FFFFFF',
        headerBg: isDarkMode ? undefined : '#FFFFFF',
      },
      Input: {
        hoverBorderColor: '#1F86C9',
        activeBorderColor: '#1F86C9',
      },
    },
  });

  return (
    <ConfigProvider theme={getThemeConfig()}>
      <AntApp>
        <AuthProvider>
          <Router>
            <div className="App">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/dashboard/*"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
          </Router>
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  );
};

function App() {
  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}

export default App; 