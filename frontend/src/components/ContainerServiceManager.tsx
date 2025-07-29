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
  Input,
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  EyeOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  SearchOutlined,
  FileTextOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { api, ContainerService, ComputePool } from '../services/api.ts';
import { useTheme } from '../contexts/ThemeContext.tsx';

const { Title, Text } = Typography;

const ContainerServiceManager: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [containerServices, setContainerServices] = useState<ContainerService[]>([]);
  const [filteredServices, setFilteredServices] = useState<ContainerService[]>([]);
  const [serviceSearchText, setServiceSearchText] = useState('');
  const [computePools, setComputePools] = useState<ComputePool[]>([]);
  const [filteredPools, setFilteredPools] = useState<ComputePool[]>([]);
  const [poolSearchText, setPoolSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [operationLoading, setOperationLoading] = useState<string | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<ContainerService | null>(null);
  
  // Logs modal state
  const [logsModalVisible, setLogsModalVisible] = useState(false);
  const [selectedPool, setSelectedPool] = useState<ComputePool | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

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
      setFilteredServices(servicesResponse.data);
      setComputePools(poolsResponse.data);
      setFilteredPools(poolsResponse.data);
    } catch (error) {
      message.error('Failed to load container services data');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter container services based on search text
  const handleServiceSearch = (value: string) => {
    setServiceSearchText(value);
    if (!value.trim()) {
      setFilteredServices(containerServices);
      return;
    }

    const filtered = containerServices.filter(service => {
      const searchLower = value.toLowerCase();
      const nameMatch = service.name.toLowerCase().includes(searchLower);
      const statusMatch = service.status.toLowerCase().includes(searchLower);
      const poolMatch = service.compute_pool?.toLowerCase().includes(searchLower);
      const endpointMatch = service.endpoint_url?.toLowerCase().includes(searchLower);
      
      return nameMatch || statusMatch || poolMatch || endpointMatch;
    });
    
    setFilteredServices(filtered);
  };

  // Filter compute pools based on search text
  const handlePoolSearch = (value: string) => {
    setPoolSearchText(value);
    if (!value.trim()) {
      setFilteredPools(computePools);
      return;
    }

    const filtered = computePools.filter(pool => {
      const searchLower = value.toLowerCase();
      const nameMatch = pool.name.toLowerCase().includes(searchLower);
      const stateMatch = pool.state.toLowerCase().includes(searchLower);
      const familyMatch = pool.instance_family.toLowerCase().includes(searchLower);
      
      return nameMatch || stateMatch || familyMatch;
    });
    
    setFilteredPools(filtered);
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

  const handleSuspendPool = async (poolName: string) => {
    setOperationLoading(poolName);
    try {
      await api.suspendComputePool(poolName);
      message.success(`Compute pool ${poolName} suspended successfully`);
      loadData(); // Refresh data to get updated status
    } catch (error: any) {
      message.error(error.response?.data?.detail || `Failed to suspend pool ${poolName}`);
    } finally {
      setOperationLoading(null);
    }
  };

  const handleResumePool = async (poolName: string) => {
    setOperationLoading(poolName);
    try {
      await api.resumeComputePool(poolName);
      message.success(`Compute pool ${poolName} resumed successfully`);
      loadData(); // Refresh data to get updated status
    } catch (error: any) {
      message.error(error.response?.data?.detail || `Failed to resume pool ${poolName}`);
    } finally {
      setOperationLoading(null);
    }
  };

  const handleViewLogs = async (pool: ComputePool) => {
    setSelectedPool(pool);
    setLogsModalVisible(true);
    setLogsLoading(true);
    
    try {
      const response = await api.getComputePoolLogs(pool.name, 100);
      setLogs(response.data.logs || []);
    } catch (error: any) {
      message.error('Failed to load compute pool logs');
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
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
      sorter: (a: ContainerService, b: ContainerService) => a.name.localeCompare(b.name),
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
      sorter: (a: ContainerService, b: ContainerService) => a.status.localeCompare(b.status),
      render: (status: string) => getStatusBadge(status),
    },
    {
      title: 'Instances',
      key: 'instances',
      width: 100,
      sorter: (a: ContainerService, b: ContainerService) => a.min_instances - b.min_instances,
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
      sorter: (a: ContainerService, b: ContainerService) => {
        const aUrl = a.endpoint_url || '';
        const bUrl = b.endpoint_url || '';
        return aUrl.localeCompare(bUrl);
      },
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
      sorter: (a: ContainerService, b: ContainerService) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
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
      sorter: (a: ComputePool, b: ComputePool) => a.name.localeCompare(b.name),
      render: (text: string) => <Text strong style={{ color: '#1F86C9' }}>{text}</Text>,
    },
    {
      title: 'State',
      dataIndex: 'state',
      key: 'state',
      width: 120,
      sorter: (a: ComputePool, b: ComputePool) => a.state.localeCompare(b.state),
      render: (state: string) => getPoolStateBadge(state),
    },
    {
      title: 'Nodes',
      key: 'nodes',
      width: 100,
      sorter: (a: ComputePool, b: ComputePool) => a.min_nodes - b.min_nodes,
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
      sorter: (a: ComputePool, b: ComputePool) => a.instance_family.localeCompare(b.instance_family),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      sorter: (a: ComputePool, b: ComputePool) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record: ComputePool) => (
        <Space>
          <Tooltip title="View Logs">
            <Button
              type="text"
              size="small"
              icon={<FileTextOutlined />}
              style={{ color: '#1F86C9' }}
              onClick={() => handleViewLogs(record)}
            />
          </Tooltip>
          {record.state === 'RUNNING' || record.state === 'ACTIVE' ? (
            <Tooltip title="Suspend Pool">
              <Button
                type="text"
                size="small"
                icon={<StopOutlined />}
                style={{ color: '#faad14' }}
                onClick={() => handleSuspendPool(record.name)}
                loading={operationLoading === record.name}
              />
            </Tooltip>
          ) : (
            <Tooltip title="Resume Pool">
              <Button
                type="text"
                size="small"
                icon={<PlayCircleOutlined />}
                style={{ color: '#52c41a' }}
                onClick={() => handleResumePool(record.name)}
                loading={operationLoading === record.name}
              />
            </Tooltip>
          )}
        </Space>
      ),
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

        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search container services by name, status, pool, or endpoint..."
            prefix={<SearchOutlined />}
            value={serviceSearchText}
            onChange={(e) => handleServiceSearch(e.target.value)}
            allowClear
            style={{ maxWidth: 500 }}
          />
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
            dataSource={filteredServices}
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

        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search compute pools by name, state, or instance family..."
            prefix={<SearchOutlined />}
            value={poolSearchText}
            onChange={(e) => handlePoolSearch(e.target.value)}
            allowClear
            style={{ maxWidth: 450 }}
          />
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
            dataSource={filteredPools}
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

      {/* Compute Pool Logs Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined style={{ color: '#1F86C9' }} />
            Compute Pool Logs: {selectedPool?.name}
          </Space>
        }
        open={logsModalVisible}
        onCancel={() => setLogsModalVisible(false)}
        footer={[
          <Button key="refresh" onClick={() => selectedPool && handleViewLogs(selectedPool)}>
            Refresh
          </Button>,
          <Button key="close" onClick={() => setLogsModalVisible(false)}>
            Close
          </Button>,
        ]}
        width={900}
        style={{ top: 20 }}
      >
        {logsLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>Loading compute pool logs...</div>
          </div>
        ) : logs.length === 0 ? (
          <Alert
            message="No Logs Available"
            description={`No logs found for compute pool "${selectedPool?.name}". This could be because the pool is newly created or logs are not yet available.`}
            type="info"
            showIcon
          />
        ) : (
          <div style={{ maxHeight: '500px', overflow: 'auto' }}>
            {logs.map((log, index) => {
              const getLogColor = (level: string) => {
                switch (level.toUpperCase()) {
                  case 'ERROR': return '#f5222d';
                  case 'WARN': return '#faad14';
                  case 'INFO': return '#1890ff';
                  case 'DEBUG': return '#52c41a';
                  default: return '#666666';
                }
              };

              return (
                <div
                  key={index}
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid #f0f0f0',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    backgroundColor: index % 2 === 0 ? '#fafafa' : '#ffffff',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: '#666', minWidth: '140px' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                    <AntTag
                      color={getLogColor(log.level)}
                      style={{ minWidth: '50px', textAlign: 'center', margin: 0 }}
                    >
                      {log.level}
                    </AntTag>
                    <span style={{ color: '#1890ff', minWidth: '80px' }}>
                      [{log.component}]
                    </span>
                    <span style={{ color: '#262626', flex: 1 }}>
                      {log.message}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ContainerServiceManager; 