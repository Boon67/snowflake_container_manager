import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Alert, Spin, Table } from 'antd';
import { 
  SettingOutlined, 
  DatabaseOutlined, 
  ApiOutlined, 
  FlagOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { api } from '../services/api';

const { Title, Paragraph } = Typography;

const Overview = () => {
  const [loading, setLoading] = useState(true);
  const [healthStatus, setHealthStatus] = useState(null);
  const [configTables, setConfigTables] = useState([]);
  const [stats, setStats] = useState({
    appSettings: 0,
    databaseSettings: 0,
    apiSettings: 0,
    featureFlags: 0
  });

  useEffect(() => {
    loadOverviewData();
  }, []);

  const loadOverviewData = async () => {
    setLoading(true);
    try {
      // Load health status
      const healthResponse = await api.healthCheck();
      setHealthStatus(healthResponse.data);

      // Load configuration tables metadata
      const tablesResponse = await api.getConfigTables();
      setConfigTables(tablesResponse.data);

      // Load statistics
      const [appSettings, dbSettings, apiSettings, featureFlags] = await Promise.all([
        api.getAppSettings(),
        api.getDatabaseSettings(),
        api.getApiSettings(),
        api.getFeatureFlags()
      ]);

      setStats({
        appSettings: appSettings.data.length,
        databaseSettings: dbSettings.data.length,
        apiSettings: apiSettings.data.length,
        featureFlags: featureFlags.data.length
      });

    } catch (error) {
      console.error('Failed to load overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tableColumns = [
    {
      title: 'Table Name',
      dataIndex: 'display_name',
      key: 'display_name',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Columns',
      dataIndex: 'columns',
      key: 'columns',
      render: (columns) => columns.length
    }
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Title level={2}>Configuration Overview</Title>
      <Paragraph>
        Welcome to the Configuration Manager. Here you can manage all your application settings, 
        database connections, API configurations, and feature flags stored in Snowflake.
      </Paragraph>

      {/* Health Status */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Alert
              message="System Health"
              description={
                healthStatus?.status === 'healthy' 
                  ? 'All systems are running normally'
                  : 'System issues detected'
              }
              type={healthStatus?.status === 'healthy' ? 'success' : 'error'}
              icon={
                healthStatus?.status === 'healthy' 
                  ? <CheckCircleOutlined />
                  : <ExclamationCircleOutlined />
              }
              showIcon
            />
          </Col>
          <Col span={12}>
            <Alert
              message="Database Connection"
              description={
                healthStatus?.database === 'connected'
                  ? 'Snowflake connection is active'
                  : 'Database connection failed'
              }
              type={healthStatus?.database === 'connected' ? 'success' : 'error'}
              icon={
                healthStatus?.database === 'connected'
                  ? <CheckCircleOutlined />
                  : <ExclamationCircleOutlined />
              }
              showIcon
            />
          </Col>
        </Row>
      </Card>

      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Application Settings"
              value={stats.appSettings}
              prefix={<SettingOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Database Settings"
              value={stats.databaseSettings}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="API Settings"
              value={stats.apiSettings}
              prefix={<ApiOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Feature Flags"
              value={stats.featureFlags}
              prefix={<FlagOutlined />}
              valueStyle={{ color: '#eb2f96' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Configuration Tables */}
      <Card title="Configuration Tables" style={{ marginBottom: 24 }}>
        <Table
          dataSource={configTables}
          columns={tableColumns}
          rowKey="table_name"
          pagination={false}
        />
      </Card>

      {/* Getting Started */}
      <Card title="Getting Started">
        <Row gutter={16}>
          <Col span={12}>
            <Title level={4}>Default Credentials</Title>
            <Paragraph>
              Use these credentials to access the system:
              <br />
              <strong>Username:</strong> admin
              <br />
              <strong>Password:</strong> password123
            </Paragraph>
          </Col>
          <Col span={12}>
            <Title level={4}>Configuration Schema</Title>
            <Paragraph>
              The system automatically creates the APP.CONFIG schema in Snowflake with tables for:
              <ul>
                <li>Application Settings (key-value pairs)</li>
                <li>Database Connection Settings</li>
                <li>API Configuration Settings</li>
                <li>Feature Flags</li>
              </ul>
            </Paragraph>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default Overview; 