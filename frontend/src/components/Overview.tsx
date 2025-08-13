import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Table, 
  Tag as AntTag, 
  Button, 
  Space, 
  Typography, 
  Spin, 
  Alert,
  Badge,
  Tooltip,
  Empty
} from 'antd';
import { 
  DatabaseOutlined, 
  SettingOutlined, 
  TagsOutlined, 
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined 
} from '@ant-design/icons';
import { api, Solution, Tag } from '../services/api.ts';
import { useTheme } from '../contexts/ThemeContext.tsx';

const { Title } = Typography;

interface OverviewStats {
  solutionsCount: number;
  parametersCount: number;
  tagsCount: number;
  secretParametersCount: number;
  containerServicesCount: number;
  apiKeysCount: number;
}

interface OverviewProps {
  onNavigateToTab: (tabKey: string) => void;
  onNavigateToSolution: (solutionId: string) => void;
}

const Overview: React.FC<OverviewProps> = ({ onNavigateToTab, onNavigateToSolution }) => {
  const { isDarkMode } = useTheme();
  
  // Dynamic colors for dark mode compatibility
  const textColor = isDarkMode ? 'var(--snowflake-dark-gray)' : '#212529';
  const secondaryTextColor = isDarkMode ? 'var(--snowflake-gray)' : '#6C757D';
  const borderColor = isDarkMode ? 'var(--snowflake-border)' : '#DEE2E6';
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OverviewStats>({
    solutionsCount: 0,
    parametersCount: 0,
    tagsCount: 0,
    secretParametersCount: 0,
    containerServicesCount: 0,
    apiKeysCount: 0,
  });
  const [recentSolutions, setRecentSolutions] = useState<Solution[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOverviewData();
  }, []);

  const loadOverviewData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load solutions, tags, and all parameters
      const [solutionsResponse, tagsResponse, parametersResponse] = await Promise.all([
        api.getSolutions(),
        api.getTags(),
        api.searchParameters({}), // Get all parameters for proper count
      ]);

      const solutions = solutionsResponse.data;
      const tags = tagsResponse.data;
      const allParameters = parametersResponse.data;

      // Calculate statistics from all parameters
      const secretParameters = allParameters.filter(p => p.is_secret).length;

      // Load API keys count for all solutions
      let totalApiKeys = 0;
      try {
        const apiKeyPromises = solutions.map(solution => 
          api.getSolutionAPIKeys(solution.id).catch(() => ({ data: [] }))
        );
        const apiKeyResponses = await Promise.all(apiKeyPromises);
        totalApiKeys = apiKeyResponses.reduce((total, response) => total + response.data.length, 0);
      } catch (error) {
        console.warn('Failed to load API keys count:', error);
      }

      setStats({
        solutionsCount: solutions.length,
        parametersCount: allParameters.length, // Use actual parameter count
        tagsCount: tags.length,
        secretParametersCount: secretParameters,
        containerServicesCount: 0, // Placeholder, will be updated later if API supports it
        apiKeysCount: totalApiKeys,
      });

      // Get recent solutions (last 5) and ensure they have parameter counts
      const sortedSolutions = solutions
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5);
      setRecentSolutions(sortedSolutions);

    } catch (error) {
      console.error('Failed to load overview data:', error);
      setError('Failed to load overview data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error"
        description={error}
        type="error"
        showIcon
        style={{ marginBottom: 24 }}
      />
    );
  }

  return (
    <div>
      <Title level={2} style={{ color: textColor, marginBottom: 24, fontWeight: 600 }}>
        System Overview
      </Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={12} md={6}>
          <Card
            hoverable
            onClick={() => onNavigateToTab('solutions')}
            style={{
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            <Statistic
              title="Solutions"
              value={stats.solutionsCount}
              prefix={<DatabaseOutlined style={{ color: '#1F86C9' }} />}
              valueStyle={{ fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            hoverable
            onClick={() => onNavigateToTab('solutions')}
            style={{
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            <Statistic
              title="Parameters"
              value={stats.parametersCount}
              prefix={<SettingOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            hoverable
            onClick={() => onNavigateToTab('solutions')}
            style={{
              background: '#FFFFFF',
              borderColor: '#DEE2E6',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            <Statistic
              title="Tags"
              value={stats.tagsCount}
              prefix={<TagsOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: textColor, fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            hoverable
            onClick={() => onNavigateToTab('container-services')}
            style={{
              background: '#FFFFFF',
              borderColor: '#DEE2E6',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            <Statistic
              title="Container Services"
              value={stats.containerServicesCount}
              prefix={<DatabaseOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: textColor, fontWeight: 600 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={12} md={6}>
          <Card
            hoverable
            onClick={() => onNavigateToTab('solutions')}
            style={{
              background: '#FFFFFF',
              borderColor: '#DEE2E6',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            <Statistic
              title="Secret Parameters"
              value={stats.secretParametersCount}
              prefix={<DatabaseOutlined style={{ color: '#f5222d' }} />}
              valueStyle={{ color: textColor, fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            hoverable
            onClick={() => onNavigateToTab('solutions')}
            style={{
              background: '#FFFFFF',
              borderColor: '#DEE2E6',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            <Statistic
              title="API Keys"
              value={stats.apiKeysCount}
              prefix={<DatabaseOutlined style={{ color: '#13c2c2' }} />}
              valueStyle={{ color: textColor, fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            hoverable
            onClick={() => onNavigateToTab('analytics')}
            style={{
              background: '#FFFFFF',
              borderColor: '#DEE2E6',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            <Statistic
              title="Analytics"
              value="View"
              prefix={<DatabaseOutlined style={{ color: '#eb2f96' }} />}
              valueStyle={{ color: textColor, fontWeight: 600, fontSize: '14px' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            hoverable
            onClick={() => onNavigateToTab('users')}
            style={{
              background: '#FFFFFF',
              borderColor: '#DEE2E6',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            <Statistic
              title="User Management"
              value="Manage"
              prefix={<DatabaseOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: textColor, fontWeight: 600, fontSize: '14px' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title="Recent Solutions"
            style={{
              background: '#FFFFFF',
              borderColor: '#DEE2E6',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            }}
            styles={{ 
              header: {
                color: '#212529', 
                borderBottom: '1px solid #DEE2E6',
                background: '#F8F9FA',
                fontWeight: 600
              }
            }}
          >
            {recentSolutions.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 20px', 
                color: secondaryTextColor,
                background: '#F8F9FA',
                borderRadius: '6px',
                border: '2px dashedrgb(0, 128, 255)'
              }}>
                <DatabaseOutlined style={{ fontSize: '48px', color: '#1F86C9', marginBottom: '16px' }} />
                <div style={{ fontSize: '16px', marginBottom: '8px', color: textColor }}>
                  No solutions found
                </div>
                <div style={{ fontSize: '14px' }}>
                  Create your first solution to get started with Snowflake configuration management.
                </div>
              </div>
            ) : (
              recentSolutions.map((solution) => (
                <div
                  key={solution.id}
                  onClick={() => onNavigateToSolution(solution.id)}
                  style={{
                    padding: '16px 0',
                    borderBottom: '1px solid #DEE2E6',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    borderRadius: '4px',
                    margin: '0 -8px',
                    paddingLeft: '8px',
                    paddingRight: '8px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F8F9FA';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div>
                    <div style={{ color: textColor, fontWeight: 600, fontSize: '16px' }}>
                      {solution.name}
                    </div>
                    <div style={{ color: secondaryTextColor, fontSize: '14px' }}>
                      {solution.parameter_count || 0} parameters
                    </div>
                  </div>
                  <div style={{ color: secondaryTextColor, fontSize: '12px' }}>
                    {new Date(solution.updated_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
                    <Card 
            title="Quick Actions"
            style={{
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            }}
            styles={{ 
              header: {
                color: textColor, 
                borderBottom: `1px solid ${borderColor}`,
                background: isDarkMode ? 'var(--snowflake-light-blue)' : '#F8F9FA',
                fontWeight: 600
              }
            }}
          >
            <div style={{ color: secondaryTextColor, lineHeight: '1.6' }}>
              <div 
                onClick={() => onNavigateToTab('solutions')}
                style={{ 
                  marginBottom: '16px', 
                  padding: '12px',
                  background: '#E8F4FD',
                  borderRadius: '6px',
                  borderLeft: '4px solid #1F86C9',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#D1E9F6';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#E8F4FD';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <strong style={{ color: '#0D4F8C' }}>📋 Create Solution:</strong> Set up new configuration solutions with parameters and API keys
              </div>
              <div 
                onClick={() => onNavigateToTab('solutions')}
                style={{ 
                  marginBottom: '16px', 
                  padding: '12px',
                  background: '#F6FFED',
                  borderRadius: '6px',
                  borderLeft: '4px solid #52c41a',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#E6F7E0';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F6FFED';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <strong style={{ color: '#389e0d' }}>⚙️ Add Parameters:</strong> Define key-value configurations with metadata and tagging
              </div>
              <div 
                onClick={() => onNavigateToTab('container-services')}
                style={{ 
                  marginBottom: '16px', 
                  padding: '12px',
                  background: '#F4F0FF',
                  borderRadius: '6px',
                  borderLeft: '4px solid #722ed1',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#EEEAFF';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F4F0FF';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <strong style={{ color: '#531dab' }}>🐳 Manage Containers:</strong> Monitor and control Snowpark Container Services
              </div>
              <div 
                onClick={() => onNavigateToTab('analytics')}
                style={{ 
                  marginBottom: '16px', 
                  padding: '12px',
                  background: '#FFF0F6',
                  borderRadius: '6px',
                  borderLeft: '4px solid #eb2f96',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFE0ED';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFF0F6';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <strong style={{ color: '#c41d7f' }}>📊 View Analytics:</strong> Monitor compute pool credit usage and performance metrics
              </div>
              <div 
                onClick={() => onNavigateToTab('users')}
                style={{ 
                  padding: '12px',
                  background: '#F0F5FF',
                  borderRadius: '6px',
                  borderLeft: '4px solid #2f54eb',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#E6F0FF';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F0F5FF';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <strong style={{ color: '#1d39c4' }}>👥 Manage Users:</strong> Configure user accounts, roles, and authentication settings
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Overview; 