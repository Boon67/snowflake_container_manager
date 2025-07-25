import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  message,
  Typography,
  Card,
  Tooltip,
  Badge,
  Tag as AntTag,
  Descriptions,
  Modal,
  Spin,
  Alert,
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  EyeOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { api, ContainerService, ComputePool } from '../services/api.ts';

const { Title, Text } = Typography;

const ContainerServiceManager: React.FC = () => {
  const [containerServices, setContainerServices] = useState<ContainerService[]>([]);
  const [computePools, setComputePools] = useState<ComputePool[]>([]);
  const [loading, setLoading] = useState(false);
  const [operationLoading, setOperationLoading] = useState<string | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<ContainerService | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [servicesResponse, poolsResponse] = await Promise.all([
        api.getContainerServices(),
        api.getComputePools(),
      ]);
      setContainerServices(servicesResponse.data);
      setComputePools(poolsResponse.data);
    } catch (error) {
      message.error('Failed to load container services data');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartService = async (serviceName: string) => {
    setOperationLoading(serviceName);
    try {
      await api.startContainerService(serviceName);
      message.success(`Container service ${serviceName} started successfully`);
      loadData(); // Refresh data to get updated status
    } catch (error: any) {
      message.error(error.response?.data?.detail || `Failed to start service ${serviceName}`);
    } finally {
      setOperationLoading(null);
    }
  };

  const handleStopService = async (serviceName: string) => {
    setOperationLoading(serviceName);
    try {
      await api.stopContainerService(serviceName);
      message.success(`Container service ${serviceName} stopped successfully`);
      loadData(); // Refresh data to get updated status
    } catch (error: any) {
      message.error(error.response?.data?.detail || `Failed to stop service ${serviceName}`);
    } finally {
      setOperationLoading(null);
    }
  };

  const showServiceDetails = (service: ContainerService) => {
    setSelectedService(service);
    setDetailsModalVisible(true);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { color: string; text: string } } = {
      'RUNNING': { color: 'green', text: 'Running' },
      'SUSPENDED': { color: 'orange', text: 'Suspended' },
      'STOPPED': { color: 'red', text: 'Stopped' },
      'STARTING': { color: 'blue', text: 'Starting' },
      'STOPPING': { color: 'orange', text: 'Stopping' },
      'FAILED': { color: 'red', text: 'Failed' },
      'UNKNOWN': { color: 'gray', text: 'Unknown' },
    };

    const statusInfo = statusMap[status] || statusMap['UNKNOWN'];
    return <Badge color={statusInfo.color} text={statusInfo.text} />;
  };

  const getPoolStateBadge = (state: string) => {
    const stateMap: { [key: string]: { color: string; text: string } } = {
      'ACTIVE': { color: 'green', text: 'Active' },
      'SUSPENDED': { color: 'orange', text: 'Suspended' },
      'STOPPED': { color: 'red', text: 'Stopped' },
      'STARTING': { color: 'blue', text: 'Starting' },
      'STOPPING': { color: 'orange', text: 'Stopping' },
      'FAILED': { color: 'red', text: 'Failed' },
    };

    const stateInfo = stateMap[state] || { color: 'gray', text: state };
    return <Badge color={stateInfo.color} text={stateInfo.text} />;
  };

  const serviceColumns = [
    {
      title: 'Service Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: ContainerService) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: '#1F86C9' }}>{text}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Pool: {record.compute_pool}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => getStatusBadge(status),
    },
    {
      title: 'Instances',
      key: 'instances',
      width: 100,
      render: (_, record: ContainerService) => (
        <AntTag color="blue">
          {record.min_instances} - {record.max_instances}
        </AntTag>
      ),
    },
    {
      title: 'Endpoint',
      dataIndex: 'endpoint_url',
      key: 'endpoint_url',
      width: 150,
      render: (url: string) => (
        url ? (
          <Tooltip title={url}>
            <Text ellipsis style={{ maxWidth: 120 }}>
              {url}
            </Text>
          </Tooltip>
        ) : (
          <Text type="secondary">No endpoint</Text>
        )
      ),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record: ContainerService) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => showServiceDetails(record)}
            />
          </Tooltip>
          {record.status === 'RUNNING' ? (
            <Tooltip title="Stop Service">
              <Button
                type="text"
                danger
                icon={<PauseCircleOutlined />}
                onClick={() => handleStopService(record.name)}
                loading={operationLoading === record.name}
              />
            </Tooltip>
          ) : (
            <Tooltip title="Start Service">
              <Button
                type="text"
                icon={<PlayCircleOutlined />}
                style={{ color: '#52c41a' }}
                onClick={() => handleStartService(record.name)}
                loading={operationLoading === record.name}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const poolColumns = [
    {
      title: 'Pool Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong style={{ color: '#1F86C9' }}>{text}</Text>,
    },
    {
      title: 'State',
      dataIndex: 'state',
      key: 'state',
      width: 120,
      render: (state: string) => getPoolStateBadge(state),
    },
    {
      title: 'Nodes',
      key: 'nodes',
      width: 100,
      render: (_, record: ComputePool) => (
        <AntTag color="purple">
          {record.min_nodes} - {record.max_nodes}
        </AntTag>
      ),
    },
    {
      title: 'Instance Family',
      dataIndex: 'instance_family',
      key: 'instance_family',
      width: 150,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0 }}>
            <CloudServerOutlined style={{ marginRight: 8, color: '#1F86C9' }} />
            Snowpark Container Services
          </Title>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadData}
            loading={loading}
          >
            Refresh
          </Button>
        </div>

        {containerServices.length === 0 && !loading ? (
          <Alert
            message="No Container Services Found"
            description="No Snowpark Container Services are currently deployed in your Snowflake account."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : (
          <Table
            columns={serviceColumns}
            dataSource={containerServices}
            loading={loading}
            rowKey="name"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} services`,
            }}
          />
        )}
      </Card>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0 }}>
            <DatabaseOutlined style={{ marginRight: 8, color: '#52c41a' }} />
            Compute Pools
          </Title>
        </div>

        {computePools.length === 0 && !loading ? (
          <Alert
            message="No Compute Pools Found"
            description="No compute pools are currently available in your Snowflake account."
            type="info"
            showIcon
          />
        ) : (
          <Table
            columns={poolColumns}
            dataSource={computePools}
            loading={loading}
            rowKey="name"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} pools`,
            }}
          />
        )}
      </Card>

      {/* Service Details Modal */}
      <Modal
        title={
          <Space>
            <CloudServerOutlined style={{ color: '#1F86C9' }} />
            Service Details: {selectedService?.name}
          </Space>
        }
        open={detailsModalVisible}
        onCancel={() => setDetailsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailsModalVisible(false)}>
            Close
          </Button>,
        ]}
        width={800}
      >
        {selectedService && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="Service Name" span={2}>
              {selectedService.name}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              {getStatusBadge(selectedService.status)}
            </Descriptions.Item>
            <Descriptions.Item label="Compute Pool">
              {selectedService.compute_pool}
            </Descriptions.Item>
            <Descriptions.Item label="Min Instances">
              {selectedService.min_instances}
            </Descriptions.Item>
            <Descriptions.Item label="Max Instances">
              {selectedService.max_instances}
            </Descriptions.Item>
            <Descriptions.Item label="Endpoint URL" span={2}>
              {selectedService.endpoint_url || 'No endpoint configured'}
            </Descriptions.Item>
            <Descriptions.Item label="DNS Name" span={2}>
              {selectedService.dns_name || 'No DNS name configured'}
            </Descriptions.Item>
            <Descriptions.Item label="Created At">
              {new Date(selectedService.created_at).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Updated At">
              {selectedService.updated_at ? new Date(selectedService.updated_at).toLocaleString() : 'Never updated'}
            </Descriptions.Item>
            {selectedService.spec && (
              <Descriptions.Item label="Specification" span={2}>
                <pre style={{ 
                  background: '#f5f5f5', 
                  padding: '12px', 
                  borderRadius: '4px',
                  fontSize: '12px',
                  maxHeight: '200px',
                  overflow: 'auto'
                }}>
                  {selectedService.spec}
                </pre>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default ContainerServiceManager; 