import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { ConfigProvider } from 'antd';
import Login from './components/Login.tsx';
import Dashboard from './components/Dashboard.tsx';
import ProtectedRoute from './components/ProtectedRoute.tsx';
import './App.css';

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          // Snowflake primary colors
          colorPrimary: '#1F86C9',
          colorInfo: '#1F86C9',
          colorSuccess: '#52c41a',
          colorWarning: '#faad14',
          colorError: '#f5222d',
          
          // Background colors
          colorBgContainer: '#FFFFFF',
          colorBgElevated: '#FFFFFF',
          colorBgLayout: '#F8F9FA',
          colorBgMask: 'rgba(31, 134, 201, 0.45)',
          
          // Text colors
          colorText: '#212529',
          colorTextSecondary: '#6C757D',
          colorTextTertiary: '#6C757D',
          colorTextPlaceholder: '#6C757D',
          
          // Border colors
          colorBorder: '#DEE2E6',
          colorBorderSecondary: '#DEE2E6',
          
          // Component specific
          colorFillAlter: '#F8F9FA',
          colorFillContent: '#E8F4FD',
          colorFillSecondary: '#E8F4FD',
          
          // Border radius
          borderRadius: 6,
          borderRadiusLG: 8,
          borderRadiusXS: 4,
          
          // Font settings
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          fontSize: 14,
          fontWeightStrong: 600,
        },
        components: {
          Layout: {
            siderBg: '#0D4F8C',
            headerBg: '#FFFFFF',
            bodyBg: '#F8F9FA',
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
            headerBg: '#E8F4FD',
            headerColor: '#0D4F8C',
            rowHoverBg: '#E3F2FD',
          },
          Card: {
            boxShadowTertiary: '0 2px 8px rgba(0, 0, 0, 0.06)',
          },
          Modal: {
            contentBg: '#FFFFFF',
            headerBg: '#FFFFFF',
          },
          Input: {
            hoverBorderColor: '#1F86C9',
            activeBorderColor: '#1F86C9',
          },
        },
      }}
    >
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
    </ConfigProvider>
  );
}

export default App; 