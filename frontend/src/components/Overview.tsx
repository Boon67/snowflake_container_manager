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

const { Title } = Typography;

interface OverviewStats {
  solutionsCount: number;
  parametersCount: number;
  tagsCount: number;
  secretParametersCount: number;
  containerServicesCount: number;
}

interface OverviewProps {
  onNavigateToTab: (tabKey: string) => void;
  onNavigateToSolution: (solutionId: string) => void;
}

const Overview: React.FC<OverviewProps> = ({ onNavigateToTab, onNavigateToSolution }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OverviewStats>({
    solutionsCount: 0,
    parametersCount: 0,
    tagsCount: 0,
    secretParametersCount: 0,
    containerServicesCount: 0,
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

      setStats({
        solutionsCount: solutions.length,
        parametersCount: allParameters.length, // Use actual parameter count
        tagsCount: tags.length,
        secretParametersCount: secretParameters,
        containerServicesCount: 0, // Placeholder, will be updated later if API supports it
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
      <Title level={2} style={{ color: '#212529', marginBottom: 24, fontWeight: 600 }}>
        System Overview
      </Title>

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
              title="Solutions"
              value={stats.solutionsCount}
              prefix={<DatabaseOutlined style={{ color: '#1F86C9' }} />}
              valueStyle={{ color: '#212529', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            hoverable
            onClick={() => onNavigateToTab('parameters')}
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
              title="Parameters"
              value={stats.parametersCount}
              prefix={<SettingOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#212529', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            hoverable
            onClick={() => onNavigateToTab('tags')}
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
              valueStyle={{ color: '#212529', fontWeight: 600 }}
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
              valueStyle={{ color: '#212529', fontWeight: 600 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={12} md={6}>
          <Card
            hoverable
            onClick={() => onNavigateToTab('parameters')}
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
              valueStyle={{ color: '#212529', fontWeight: 600 }}
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
            headStyle={{ 
              color: '#212529', 
              borderBottom: '1px solid #DEE2E6',
              background: '#F8F9FA',
              fontWeight: 600
            }}
          >
            {recentSolutions.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 20px', 
                color: '#6C757D',
                background: '#F8F9FA',
                borderRadius: '6px',
                border: '2px dashed #DEE2E6'
              }}>
                <DatabaseOutlined style={{ fontSize: '48px', color: '#1F86C9', marginBottom: '16px' }} />
                <div style={{ fontSize: '16px', marginBottom: '8px', color: '#212529' }}>
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
                    <div style={{ color: '#212529', fontWeight: 600, fontSize: '16px' }}>
                      {solution.name}
                    </div>
                    <div style={{ color: '#6C757D', fontSize: '14px' }}>
                      {solution.parameter_count || 0} parameters
                    </div>
                  </div>
                  <div style={{ color: '#6C757D', fontSize: '12px' }}>
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
              background: '#FFFFFF',
              borderColor: '#DEE2E6',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            }}
            headStyle={{ 
              color: '#212529', 
              borderBottom: '1px solid #DEE2E6',
              background: '#F8F9FA',
              fontWeight: 600
            }}
          >
            <div style={{ color: '#6C757D', lineHeight: '1.6' }}>
              <div style={{ 
                marginBottom: '16px', 
                padding: '12px',
                background: '#E8F4FD',
                borderRadius: '6px',
                borderLeft: '4px solid #1F86C9'
              }}>
                <strong style={{ color: '#0D4F8C' }}>Solutions:</strong> Create and manage configuration solutions for your data workflows
              </div>
              <div style={{ 
                marginBottom: '16px', 
                padding: '12px',
                background: '#F6FFED',
                borderRadius: '6px',
                borderLeft: '4px solid #52c41a'
              }}>
                <strong style={{ color: '#389e0d' }}>Parameters:</strong> Add key-value configurations with dynamic tagging and metadata
              </div>
              <div style={{ 
                marginBottom: '16px', 
                padding: '12px',
                background: '#FFFBE6',
                borderRadius: '6px',
                borderLeft: '4px solid #faad14'
              }}>
                <strong style={{ color: '#d48806' }}>Tags:</strong> Organize configurations using tags for better management and filtering
              </div>
              <div style={{ 
                padding: '12px',
                background: '#FFF2F0',
                borderRadius: '6px',
                borderLeft: '4px solid #f5222d'
              }}>
                <strong style={{ color: '#cf1322' }}>Security:</strong> Mark sensitive data as secrets for enhanced protection
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Overview; 