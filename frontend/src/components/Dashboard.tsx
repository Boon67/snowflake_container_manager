import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Typography, Space, Avatar, Tabs, Switch, Tooltip, Dropdown } from 'antd';
import { 
  DashboardOutlined, 
  UserOutlined, 
  LogoutOutlined, 
  CloudServerOutlined,
  DatabaseOutlined,
  SunOutlined,
  MoonOutlined,
  BarChartOutlined,
  SecurityScanOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useTheme } from '../contexts/ThemeContext.tsx';
import Overview from './Overview.tsx';
import SolutionManager from './SolutionManager.tsx';
import ContainerServiceManager from './ContainerServiceManager.tsx';
import NetworkManager from './NetworkManager.tsx';
import Analytics from './Analytics.tsx';

const { Header, Content } = Layout;
const { Title } = Typography;
const { TabPane } = Tabs;

const Dashboard: React.FC = () => {

  
  // Initialize activeTab from URL hash or default to 'overview'
  const getInitialTab = () => {
    const hash = window.location.hash.slice(1); // Remove the '#' character
    const validTabs = ['overview', 'solutions', 'container-services', 'network', 'analytics'];
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
  const titleColor = isDarkMode ? 'var(--snowflake-primary)' : '#0D4F8C';

  const handleLogout = () => {
    logout();
  };

  const userMenuItems = [
    {
      key: 'preferences',
      label: (
        <Space>
          <SettingOutlined />
          Preferences
        </Space>
      ),
      children: [
        {
          key: 'theme',
          label: (
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <span>
                {isDarkMode ? <MoonOutlined /> : <SunOutlined />}
                {isDarkMode ? 'Dark Mode' : 'Light Mode'}
              </span>
              <Switch
                checked={isDarkMode}
                onChange={toggleTheme}
                size="small"
              />
            </Space>
          ),
          onClick: (e) => e.domEvent.stopPropagation(),
        },
      ],
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: (
        <Space>
          <LogoutOutlined />
          Logout
        </Space>
      ),
      onClick: handleLogout,
    },
  ];

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
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        padding: '0 24px', 
        background: headerBg,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <Space>
          <CloudServerOutlined style={{ marginRight: 8, fontSize: '20px', color: '#1F86C9' }} />
          <Title level={4} style={{ margin: 0, color: titleColor }}>
            Solution Configuration Manager
          </Title>
        </Space>
          
          <Space>
            <Dropdown 
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} />
                <span>{user?.username}</span>
              </Space>
            </Dropdown>
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
  );
};

export default Dashboard; 