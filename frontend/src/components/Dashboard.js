import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Typography, Space, Avatar } from 'antd';
import { 
  SettingOutlined, 
  DatabaseOutlined, 
  ApiOutlined, 
  FlagOutlined,
  LogoutOutlined,
  UserOutlined,
  DashboardOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import AppSettings from './AppSettings';
import DatabaseSettings from './DatabaseSettings';
import ApiSettings from './ApiSettings';
import FeatureFlags from './FeatureFlags';
import Overview from './Overview';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const Dashboard = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Overview',
    },
    {
      key: '/dashboard/app-settings',
      icon: <SettingOutlined />,
      label: 'App Settings',
    },
    {
      key: '/dashboard/database-settings',
      icon: <DatabaseOutlined />,
      label: 'Database Settings',
    },
    {
      key: '/dashboard/api-settings',
      icon: <ApiOutlined />,
      label: 'API Settings',
    },
    {
      key: '/dashboard/feature-flags',
      icon: <FlagOutlined />,
      label: 'Feature Flags',
    },
  ];

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get current selected key based on pathname
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/dashboard') return '/dashboard';
    return path;
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        style={{
          background: '#fff',
          borderRight: '1px solid #f0f0f0'
        }}
      >
        <div style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>
          {!collapsed ? (
            <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
              Config Manager
            </Title>
          ) : (
            <SettingOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
          )}
        </div>
        
        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ border: 'none' }}
        />
      </Sider>
      
      <Layout>
        <Header style={{ 
          background: '#fff', 
          padding: '0 24px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Button
            type="text"
            icon={collapsed ? <SettingOutlined /> : <SettingOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px' }}
          />
          
          <Space>
            <Avatar icon={<UserOutlined />} />
            <Text>Welcome, {user?.username}</Text>
            <Button 
              type="text" 
              icon={<LogoutOutlined />}
              onClick={handleLogout}
            >
              Logout
            </Button>
          </Space>
        </Header>
        
        <Content style={{ padding: '24px', background: '#f5f5f5' }}>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/app-settings" element={<AppSettings />} />
            <Route path="/database-settings" element={<DatabaseSettings />} />
            <Route path="/api-settings" element={<ApiSettings />} />
            <Route path="/feature-flags" element={<FeatureFlags />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

export default Dashboard; 