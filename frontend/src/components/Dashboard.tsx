import React, { useState } from 'react';
import { Layout, Menu, Button, Typography, Space, Avatar, Tabs, Switch, Tooltip } from 'antd';
import { 
  DashboardOutlined, 
  UserOutlined, 
  LogoutOutlined, 
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  SettingOutlined,
  TagsOutlined,
  SunOutlined,
  MoonOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useTheme } from '../contexts/ThemeContext.tsx';
import Overview from './Overview.tsx';
import SolutionManager from './SolutionManager.tsx';
import ParameterManager from './ParameterManager.tsx';
import TagManager from './TagManager.tsx';
import ContainerServiceManager from './ContainerServiceManager.tsx';
import UserManager from './UserManager.tsx';
import Analytics from './Analytics.tsx';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;
const { TabPane } = Tabs;

const Dashboard: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSolutionId, setSelectedSolutionId] = useState<string | null>(null);
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

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
  };

  const handleTabChange = (tabKey: string) => {
    setActiveTab(tabKey);
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
      children: <Overview onNavigateToTab={setActiveTab} onNavigateToSolution={handleNavigateToSolution} />,
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
      key: 'parameters',
      label: (
        <span>
          <SettingOutlined />
          Parameters
        </span>
      ),
      children: <ParameterManager />,
    },
    {
      key: 'tags',
      label: (
        <span>
          <TagsOutlined />
          Tags
        </span>
      ),
      children: <TagManager />,
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