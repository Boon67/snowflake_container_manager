import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Typography, Space, Avatar, Tabs, Switch, Tooltip } from 'antd';
import { 
  DashboardOutlined, 
  UserOutlined, 
  LogoutOutlined, 
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  SunOutlined,
  MoonOutlined,
  BarChartOutlined,
  SecurityScanOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useTheme } from '../contexts/ThemeContext.tsx';
import Overview from './Overview.tsx';
import SolutionManager from './SolutionManager.tsx';
import ContainerServiceManager from './ContainerServiceManager.tsx';
import NetworkManager from './NetworkManager.tsx';
import UserManager from './UserManager.tsx';
import Analytics from './Analytics.tsx';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;
const { TabPane } = Tabs;

const Dashboard: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  
  // Initialize activeTab from URL hash or default to 'overview'
  const getInitialTab = () => {
    const hash = window.location.hash.slice(1); // Remove the '#' character
    const validTabs = ['overview', 'solutions', 'analytics', 'container-services', 'network', 'users'];
    return validTabs.includes(hash) ? hash : 'overview';
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [selectedSolutionId, setSelectedSolutionId] = useState<string | null>(null);
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  // Listen for hash changes (e.g., browser back/forward buttons)
  useEffect(() => {
    const handleHashChange = () => {
      const newTab = getInitialTab();
      setActiveTab(newTab);
      if (newTab !== 'solutions') {
        setSelectedSolutionId(null);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Dynamic colors for dark mode compatibility
  const headerBg = isDarkMode ? undefined : '#FFFFFF';
  const siderBg = isDarkMode ? undefined : '#0D4F8C';
  const titleColor = isDarkMode ? 'var(--snowflake-primary)' : '#0D4F8C';

  const handleLogout = () => {
    logout();
  };

  const handleNavigateToSolution = (solutionId: string) => {
    setSelectedSolutionId(solutionId);
    setActiveTab('solutions');
    
    // Update URL hash to persist tab across refreshes
    window.location.hash = 'solutions';
  };

  const handleTabChange = (tabKey: string) => {
    setActiveTab(tabKey);
    
    // Update URL hash to persist tab across refreshes
    window.location.hash = tabKey;
    
    if (tabKey !== 'solutions') {
      setSelectedSolutionId(null);
    }
  };

  const handleNavigateToTab = (tabKey: string) => {
    setActiveTab(tabKey);
    
    // Update URL hash to persist tab across refreshes
    window.location.hash = tabKey;
    
    if (tabKey !== 'solutions') {
      setSelectedSolutionId(null);
    }
  };

  const tabItems = [
    {
      key: 'overview',
      label: (
        <span>
          <DashboardOutlined />
          Overview
        </span>
      ),
      children: <Overview onNavigateToTab={handleNavigateToTab} onNavigateToSolution={handleNavigateToSolution} />,
    },
    {
      key: 'solutions',
      label: (
        <span>
          <DatabaseOutlined />
          Solutions
        </span>
      ),
      children: <SolutionManager selectedSolutionId={selectedSolutionId} onNavigateToSolution={handleNavigateToSolution} />,
    },
    {
      key: 'analytics',
      label: (
        <span>
          <BarChartOutlined />
          Analytics
        </span>
      ),
      children: <Analytics />,
    },
    {
      key: 'container-services',
      label: (
        <span>
          <CloudServerOutlined />
          Container Services
        </span>
      ),
      children: <ContainerServiceManager />,
    },
    {
      key: 'network',
      label: (
        <span>
          <SecurityScanOutlined />
          Network Security
        </span>
      ),
      children: <NetworkManager />,
    },
    ...(user?.role === 'admin' ? [{
      key: 'users',
      label: (
        <span>
          <UserOutlined />
          Users
        </span>
      ),
      children: <UserManager />,
    }] : []),
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        style={{
          background: siderBg,
        }}
      >
        <div style={{ 
          height: 64, 
          margin: 16, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: collapsed ? 'center' : 'flex-start',
          color: 'white',
          fontWeight: 'bold',
          fontSize: collapsed ? '16px' : '18px'
        }}>
          <CloudServerOutlined style={{ marginRight: collapsed ? 0 : 8 }} />
          {!collapsed && 'Config Manager'}
        </div>
      </Sider>
      
      <Layout>
        <Header style={{ 
          padding: '0 24px', 
          background: headerBg,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <Space>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: '16px',
                width: 64,
                height: 64,
              }}
            />
            <Title level={4} style={{ margin: 0, color: titleColor }}>
              Solution Configuration Manager
            </Title>
          </Space>
          
          <Space>
            <Tooltip title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
              <Switch
                checked={isDarkMode}
                onChange={toggleTheme}
                checkedChildren={<MoonOutlined />}
                unCheckedChildren={<SunOutlined />}
                style={{ marginRight: 16 }}
              />
            </Tooltip>
            <Avatar icon={<UserOutlined />} />
            <span>{user?.username}</span>
            <Button 
              type="primary" 
              icon={<LogoutOutlined />} 
              onClick={handleLogout}
            >
              Logout
            </Button>
          </Space>
        </Header>
        
        <Content style={{ 
          margin: '24px', 
          padding: '24px',
          borderRadius: '8px',
          minHeight: 'calc(100vh - 112px)'
        }}>
          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            items={tabItems}
            size="large"
            style={{ height: '100%' }}
          />
        </Content>
      </Layout>
    </Layout>
  );
};

export default Dashboard; 