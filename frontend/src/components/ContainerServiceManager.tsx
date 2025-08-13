import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  message,
  Typography,
  Tooltip,
  Badge,
  Tag as AntTag,
  Descriptions,
  Modal,
  Spin,
  Alert,
  Input,
  Form,
  Select,
  InputNumber,
  Popconfirm,
  Switch,
  Card,
  Tabs,
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
  PlusOutlined,
  DeleteOutlined,
  SecurityScanOutlined,
  EditOutlined,
  DownOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { api, ContainerService, ComputePool, ImageRepository, ContainerImage, NetworkRule, NetworkPolicy } from '../services/api.ts';
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
  const [repositories, setRepositories] = useState<ImageRepository[]>([]);
  const [filteredRepositories, setFilteredRepositories] = useState<ImageRepository[]>([]);
  const [repositorySearchText, setRepositorySearchText] = useState('');
  const [images, setImages] = useState<ContainerImage[]>([]);
  const [filteredImages, setFilteredImages] = useState<ContainerImage[]>([]);
  const [imageSearchText, setImageSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [operationLoading, setOperationLoading] = useState<string | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<ContainerService | null>(null);
  
  // Expandable repositories state
  const [expandedRepositories, setExpandedRepositories] = useState<Set<string>>(new Set());
  const [repositoryImages, setRepositoryImages] = useState<{[key: string]: ContainerImage[]}>({});
  const [loadingRepositoryImages, setLoadingRepositoryImages] = useState<Set<string>>(new Set());
  
  // Logs modal state
  const [logsModalVisible, setLogsModalVisible] = useState(false);
  const [selectedPool, setSelectedPool] = useState<ComputePool | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Create service modal state
  const [createServiceModalVisible, setCreateServiceModalVisible] = useState(false);
  const [createServiceForm, setCreateServiceForm] = useState({
    name: '',
    compute_pool: '',
    spec: '',
    min_instances: 1,
    max_instances: 1
  });
  const [selectedImagePath, setSelectedImagePath] = useState<string>('');

  // Create compute pool modal state
  const [createPoolModalVisible, setCreatePoolModalVisible] = useState(false);
  const [createPoolForm, setCreatePoolForm] = useState({
    name: '',
    instance_family: 'CPU_X64_XS',
    min_nodes: 1,
    max_nodes: 1,
    auto_resume: true,
    auto_suspend_secs: 600
  });

  // Create image repository modal state
  const [createRepoModalVisible, setCreateRepoModalVisible] = useState(false);
  const [createRepoForm, setCreateRepoForm] = useState({
    name: '',
    database: '',
    schema: ''
  });
  
  // Database and schema state for cascading dropdowns
  const [databases, setDatabases] = useState<any[]>([]);
  const [schemas, setSchemas] = useState<any[]>([]);
  const [databasesLoading, setDatabasesLoading] = useState(false);
  const [schemasLoading, setSchemasLoading] = useState(false);

  // Network Rules and Policies state
  const [networkRules, setNetworkRules] = useState<NetworkRule[]>([]);
  const [networkPolicies, setNetworkPolicies] = useState<NetworkPolicy[]>([]);
  const [filteredNetworkRules, setFilteredNetworkRules] = useState<NetworkRule[]>([]);
  const [filteredNetworkPolicies, setFilteredNetworkPolicies] = useState<NetworkPolicy[]>([]);
  const [networkRuleSearchText, setNetworkRuleSearchText] = useState('');
  const [networkPolicySearchText, setNetworkPolicySearchText] = useState('');
  
  // Network Rules modal state
  const [createRuleModalVisible, setCreateRuleModalVisible] = useState(false);
  const [createRuleForm, setCreateRuleForm] = useState({
    name: '',
    type: 'IPV4',
    mode: 'INGRESS',
    value_list: [''],
    comment: ''
  });
  
  // Network Policies modal state
  const [createPolicyModalVisible, setCreatePolicyModalVisible] = useState(false);
  const [createPolicyForm, setCreatePolicyForm] = useState({
    name: '',
    allowed_network_rules: [],
    blocked_network_rules: [],
    allowed_ip_list: [''],
    blocked_ip_list: [],
    comment: ''
  });

  // Policy Details modal state
  const [policyDetailsModalVisible, setPolicyDetailsModalVisible] = useState(false);
  const [selectedPolicyDetails, setSelectedPolicyDetails] = useState<any>(null);
  const [policyDetailsLoading, setPolicyDetailsLoading] = useState(false);

  // Rule Details modal state
  const [ruleDetailsModalVisible, setRuleDetailsModalVisible] = useState(false);
  const [selectedRuleDetails, setSelectedRuleDetails] = useState<any>(null);
  const [ruleDetailsLoading, setRuleDetailsLoading] = useState(false);

  // Rule Edit modal state
  const [editRuleModalVisible, setEditRuleModalVisible] = useState(false);
  const [editRuleForm, setEditRuleForm] = useState({
    name: '',
    value_list: [''],
    comment: ''
  });

  // Policy Edit modal state
  const [editPolicyModalVisible, setEditPolicyModalVisible] = useState(false);
  const [editPolicyForm, setEditPolicyForm] = useState({
    name: '',
    allowed_network_rules: [],
    blocked_network_rules: [],
    allowed_ip_list: [''],
    blocked_ip_list: [''],
    comment: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  // Load databases when the create repository modal opens
  useEffect(() => {
    if (createRepoModalVisible) {
      loadDatabases();
    }
  }, [createRepoModalVisible]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [servicesResponse, poolsResponse, repositoriesResponse, imagesResponse] = await Promise.all([
        api.getContainerServices(),
        api.getComputePools(),
        api.getImageRepositories(),
        api.getAllImages(),
      ]);
      setContainerServices(servicesResponse.data);
      setFilteredServices(servicesResponse.data);
      setComputePools(poolsResponse.data);
      setFilteredPools(poolsResponse.data);
      setRepositories(repositoriesResponse.data);
      setFilteredRepositories(repositoriesResponse.data);
      setImages(imagesResponse.data);
      setFilteredImages(imagesResponse.data);
      
      // Also load network data
      await loadNetworkData();
    } catch (error) {
      message.error('Failed to load container services data');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDatabases = async () => {
    setDatabasesLoading(true);
    try {
      const response = await api.getDatabases();
      setDatabases(response.data.data);
    } catch (error) {
      message.error('Failed to load databases');
      console.error('Error loading databases:', error);
    } finally {
      setDatabasesLoading(false);
    }
  };

  const loadSchemas = async (databaseName: string) => {
    setSchemasLoading(true);
    try {
      const response = await api.getSchemas(databaseName);
      setSchemas(response.data.data);
    } catch (error) {
      message.error(`Failed to load schemas for database ${databaseName}`);
      console.error('Error loading schemas:', error);
    } finally {
      setSchemasLoading(false);
    }
  };

  const handleDatabaseChange = (databaseName: string) => {
    setCreateRepoForm({
      ...createRepoForm,
      database: databaseName,
      schema: '' // Reset schema when database changes
    });
    
    // Clear existing schemas and load new ones
    setSchemas([]);
    if (databaseName) {
      loadSchemas(databaseName);
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

  // Filter repositories based on search text
  const handleRepositorySearch = (value: string) => {
    setRepositorySearchText(value);
    if (!value.trim()) {
      setFilteredRepositories(repositories);
      return;
    }

    const filtered = repositories.filter(repo => {
      const searchLower = value.toLowerCase();
      const nameMatch = repo.name.toLowerCase().includes(searchLower);
      const databaseMatch = repo.database.toLowerCase().includes(searchLower);
      const schemaMatch = repo.schema.toLowerCase().includes(searchLower);
      const ownerMatch = repo.owner.toLowerCase().includes(searchLower);
      
      return nameMatch || databaseMatch || schemaMatch || ownerMatch;
    });
    
    setFilteredRepositories(filtered);
  };

  // Filter images based on search text
  const handleImageSearch = (value: string) => {
    setImageSearchText(value);
    if (!value.trim()) {
      setFilteredImages(images);
      return;
    }

    const filtered = images.filter(image => {
      const searchLower = value.toLowerCase();
      const repoMatch = image.repository_name.toLowerCase().includes(searchLower);
      const nameMatch = image.image_name.toLowerCase().includes(searchLower);
      const tagMatch = image.tag.toLowerCase().includes(searchLower);
      const archMatch = image.architecture.toLowerCase().includes(searchLower);
      const osMatch = image.os.toLowerCase().includes(searchLower);
      
      return repoMatch || nameMatch || tagMatch || archMatch || osMatch;
    });
    
    setFilteredImages(filtered);
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

  const handleCreateService = async () => {
    if (!createServiceForm.name || !createServiceForm.compute_pool || !createServiceForm.spec) {
      message.error('Please fill in all required fields');
      return;
    }

    setOperationLoading('create-service');
    try {
      await api.createContainerService(createServiceForm);
      message.success(`Container service ${createServiceForm.name} created successfully`);
      setCreateServiceModalVisible(false);
      setCreateServiceForm({
        name: '',
        compute_pool: '',
        spec: '',
        min_instances: 1,
        max_instances: 1
      });
      loadData(); // Refresh data to show new service
    } catch (error: any) {
      message.error(error.response?.data?.detail || `Failed to create service ${createServiceForm.name}`);
    } finally {
      setOperationLoading(null);
    }
  };

  const handleDeleteService = async (serviceName: string) => {
    setOperationLoading(serviceName);
    try {
      await api.deleteContainerService(serviceName);
      message.success(`Container service ${serviceName} deleted successfully`);
      loadData(); // Refresh data to remove deleted service
    } catch (error: any) {
      message.error(error.response?.data?.detail || `Failed to delete service ${serviceName}`);
    } finally {
      setOperationLoading(null);
    }
  };

  const generateSpecWithImage = (imagePath?: string) => {
    const imageToUse = imagePath || '/my-db/my-schema/my-repo/my-image:latest';
    return `spec:
  containers:
  - name: my-container
    image: ${imageToUse}
    env:
      KEY: value
  endpoints:
  - name: main
    port: 8080
    public: true`;
  };

  const showCreateServiceModal = (poolName?: string) => {
    setCreateServiceForm({
      name: '',
      compute_pool: poolName || '',
      spec: generateSpecWithImage(),
      min_instances: 1,
      max_instances: 1
    });
    setSelectedImagePath('');
    setCreateServiceModalVisible(true);
  };

  const handleImageSelection = (imagePath: string) => {
    setSelectedImagePath(imagePath);
    setCreateServiceForm({
      ...createServiceForm,
      spec: generateSpecWithImage(imagePath)
    });
  };

  const handleRepositoryExpand = async (expanded: boolean, record: ImageRepository) => {
    const repoKey = `${record.database}.${record.schema}.${record.name}`;
    
    if (expanded) {
      // Add to expanded repositories
      setExpandedRepositories(prev => new Set([...prev, repoKey]));
      
      // Load images for this repository if not already loaded
      if (!repositoryImages[repoKey]) {
        // Set loading state
        setLoadingRepositoryImages(prev => new Set([...prev, repoKey]));
        
        try {
          const response = await api.getRepositoryImages(record.name, record.database, record.schema);
          setRepositoryImages(prev => ({
            ...prev,
            [repoKey]: response.data
          }));
          message.success(`Loaded ${response.data.length} images from repository ${record.name}`);
        } catch (error) {
          message.error(`Failed to load images for repository ${record.name}`);
          console.error('Error loading repository images:', error);
        } finally {
          // Remove loading state
          setLoadingRepositoryImages(prev => {
            const newSet = new Set(prev);
            newSet.delete(repoKey);
            return newSet;
          });
        }
      }
    } else {
      // Remove from expanded repositories
      setExpandedRepositories(prev => {
        const newSet = new Set(prev);
        newSet.delete(repoKey);
        return newSet;
      });
    }
  };

  const getRepositoryImagesForDisplay = (record: ImageRepository) => {
    const repoKey = `${record.database}.${record.schema}.${record.name}`;
    return repositoryImages[repoKey] || [];
  };

  // Calculate image count for a repository from all available images
  const getRepositoryImageCount = (record: ImageRepository) => {
    return images.filter(image => 
      image.repository_database === record.database &&
      image.repository_schema === record.schema &&
      image.repository_name === record.name
    ).length;
  };

  // Filter network rules based on search text
  const handleNetworkRuleSearch = (value: string) => {
    setNetworkRuleSearchText(value);
    if (!value.trim()) {
      setFilteredNetworkRules(networkRules);
      return;
    }

    const filtered = networkRules.filter(rule => {
      const searchLower = value.toLowerCase();
      const nameMatch = rule.name.toLowerCase().includes(searchLower);
      const typeMatch = rule.type.toLowerCase().includes(searchLower);
      const modeMatch = rule.mode.toLowerCase().includes(searchLower);
      const ownerMatch = rule.owner?.toLowerCase().includes(searchLower);
      
      return nameMatch || typeMatch || modeMatch || ownerMatch;
    });
    
    setFilteredNetworkRules(filtered);
  };

  // Filter network policies based on search text
  const handleNetworkPolicySearch = (value: string) => {
    setNetworkPolicySearchText(value);
    if (!value.trim()) {
      setFilteredNetworkPolicies(networkPolicies);
      return;
    }

    const filtered = networkPolicies.filter(policy => {
      const searchLower = value.toLowerCase();
      const nameMatch = policy.name.toLowerCase().includes(searchLower);
      const commentMatch = policy.comment?.toLowerCase().includes(searchLower);
      
      return nameMatch || commentMatch;
    });
    
    setFilteredNetworkPolicies(filtered);
  };

  // Network Rules and Policies handlers
  const loadNetworkData = async () => {
    try {
      const [rulesResponse, policiesResponse] = await Promise.all([
        api.getNetworkRules(),
        api.getNetworkPolicies(),
      ]);
      
      const rules = rulesResponse.data.data || [];
      const policies = policiesResponse.data.data || [];
      
      setNetworkRules(rules);
      setFilteredNetworkRules(rules);
      setNetworkPolicies(policies);
      setFilteredNetworkPolicies(policies);
    } catch (error) {
      message.error('Failed to load network data');
      console.error('Error loading network data:', error);
    }
  };

  const handleDeleteNetworkRule = async (ruleName: string) => {
    setOperationLoading(ruleName);
    try {
      await api.deleteNetworkRule(ruleName);
      message.success(`Network rule ${ruleName} deleted successfully`);
      loadNetworkData();
    } catch (error: any) {
      message.error(error.response?.data?.detail || `Failed to delete network rule ${ruleName}`);
    } finally {
      setOperationLoading(null);
    }
  };

  const handleDeleteNetworkPolicy = async (policyName: string) => {
    setOperationLoading(policyName);
    try {
      await api.deleteNetworkPolicy(policyName);
      message.success(`Network policy ${policyName} deleted successfully`);
      loadNetworkData();
    } catch (error: any) {
      message.error(error.response?.data?.detail || `Failed to delete network policy ${policyName}`);
    } finally {
      setOperationLoading(null);
    }
  };

  const handleCreateNetworkRule = async () => {
    if (!createRuleForm.name || !createRuleForm.type || !createRuleForm.mode || createRuleForm.value_list.length === 0) {
      message.error('Please fill in all required fields');
      return;
    }

    // Filter out empty values
    const validValues = createRuleForm.value_list.filter(value => value.trim());
    if (validValues.length === 0) {
      message.error('Please provide at least one valid network identifier');
      return;
    }

    setOperationLoading('create-rule');
    try {
      await api.createNetworkRule({
        ...createRuleForm,
        value_list: validValues
      });
      message.success(`Network rule ${createRuleForm.name} created successfully`);
      setCreateRuleModalVisible(false);
      setCreateRuleForm({
        name: '',
        type: 'IPV4',
        mode: 'INGRESS',
        value_list: [''],
        comment: ''
      });
      loadNetworkData();
    } catch (error: any) {
      message.error(error.response?.data?.detail || `Failed to create network rule ${createRuleForm.name}`);
    } finally {
      setOperationLoading(null);
    }
  };

  const handleCreateNetworkPolicy = async () => {
    if (!createPolicyForm.name) {
      message.error('Policy name is required');
      return;
    }

    setOperationLoading('create-policy');
    try {
      // Filter out empty values
      const policyData = {
        ...createPolicyForm,
        allowed_ip_list: createPolicyForm.allowed_ip_list.filter(ip => ip.trim()),
        blocked_ip_list: createPolicyForm.blocked_ip_list.filter(ip => ip.trim()),
      };

      await api.createNetworkPolicy(policyData);
      message.success(`Network policy ${createPolicyForm.name} created successfully`);
      setCreatePolicyModalVisible(false);
      setCreatePolicyForm({
        name: '',
        allowed_network_rules: [],
        blocked_network_rules: [],
        allowed_ip_list: [''],
        blocked_ip_list: [],
        comment: ''
      });
      loadNetworkData();
    } catch (error: any) {
      message.error(error.response?.data?.detail || `Failed to create network policy ${createPolicyForm.name}`);
    } finally {
      setOperationLoading(null);
    }
  };

  const handleCreatePool = async () => {
    if (!createPoolForm.name || !createPoolForm.instance_family) {
      message.error('Please fill in all required fields');
      return;
    }

    setOperationLoading('create-pool');
    try {
      await api.createComputePool(createPoolForm);
      message.success(`Compute pool ${createPoolForm.name} created successfully`);
      setCreatePoolModalVisible(false);
      setCreatePoolForm({
        name: '',
        instance_family: 'CPU_X64_XS',
        min_nodes: 1,
        max_nodes: 1,
        auto_resume: true,
        auto_suspend_secs: 600
      });
      loadData(); // Refresh data
    } catch (error: any) {
      message.error(error.response?.data?.detail || `Failed to create compute pool ${createPoolForm.name}`);
    } finally {
      setOperationLoading(null);
    }
  };

  const handleDeletePool = async (poolName: string) => {
    setOperationLoading(poolName);
    try {
      await api.deleteComputePool(poolName);
      message.success(`Compute pool ${poolName} deleted successfully`);
      loadData(); // Refresh data
    } catch (error: any) {
      message.error(error.response?.data?.detail || `Failed to delete compute pool ${poolName}`);
    } finally {
      setOperationLoading(null);
    }
  };

  const handleCreateRepo = async () => {
    if (!createRepoForm.name) {
      message.error('Repository name is required');
      return;
    }

    setOperationLoading('create-repo');
    try {
      await api.createImageRepository(createRepoForm);
      message.success(`Image repository ${createRepoForm.name} created successfully`);
      setCreateRepoModalVisible(false);
      setCreateRepoForm({
        name: '',
        database: '',
        schema: ''
      });
      loadData(); // Refresh data
    } catch (error: any) {
      message.error(error.response?.data?.detail || `Failed to create image repository ${createRepoForm.name}`);
    } finally {
      setOperationLoading(null);
    }
  };

  const handleDeleteRepo = async (repoName: string, database: string, schema: string) => {
    setOperationLoading(repoName);
    try {
      await api.deleteImageRepository(repoName, database, schema);
      message.success(`Image repository ${repoName} deleted successfully`);
      loadData(); // Refresh data
    } catch (error: any) {
      message.error(error.response?.data?.detail || `Failed to delete image repository ${repoName}`);
    } finally {
      setOperationLoading(null);
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
      width: 250,
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
          <Popconfirm
            title="Delete Service"
            description="Are you sure you want to delete this container service? This action cannot be undone."
            onConfirm={() => handleDeleteService(record.name)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete Service">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                loading={operationLoading === record.name}
              />
            </Tooltip>
          </Popconfirm>
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
      title: 'Owner',
      dataIndex: 'owner',
      key: 'owner',
      width: 120,
      sorter: (a: ComputePool, b: ComputePool) => (a.owner || '').localeCompare(b.owner || ''),
      render: (owner: string) => owner || <Text type="secondary">-</Text>,
    },
    {
      title: 'Nodes (Min-Max)',
      key: 'nodes',
      width: 120,
      sorter: (a: ComputePool, b: ComputePool) => a.min_nodes - b.min_nodes,
      render: (_, record: ComputePool) => (
        <AntTag color="purple">
          {record.min_nodes} - {record.max_nodes}
        </AntTag>
      ),
    },
    {
      title: 'Active Nodes',
      key: 'active_nodes',
      width: 100,
      sorter: (a: ComputePool, b: ComputePool) => (a.active_nodes || 0) - (b.active_nodes || 0),
      render: (_, record: ComputePool) => {
        const activeNodes = record.active_nodes || 0;
        const totalNodes = record.num_nodes || 0;
        return (
          <Space direction="vertical" size={0}>
            <AntTag color={activeNodes > 0 ? 'green' : 'default'}>
              {activeNodes} active
            </AntTag>
            {totalNodes > 0 && (
              <Text type="secondary" style={{ fontSize: '11px' }}>
                {totalNodes} total
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Instance Family',
      dataIndex: 'instance_family',
      key: 'instance_family',
      width: 130,
      sorter: (a: ComputePool, b: ComputePool) => a.instance_family.localeCompare(b.instance_family),
      render: (family: string) => (
        <AntTag color="blue" style={{ fontSize: '11px' }}>
          {family}
        </AntTag>
      ),
    },
    {
      title: 'Auto Resume',
      dataIndex: 'auto_resume',
      key: 'auto_resume',
      width: 100,
      sorter: (a: ComputePool, b: ComputePool) => (a.auto_resume || '').localeCompare(b.auto_resume || ''),
      render: (autoResume: string) => {
        if (autoResume === 'TRUE' || autoResume === 'true') {
          return <AntTag color="green">Enabled</AntTag>;
        } else if (autoResume === 'FALSE' || autoResume === 'false') {
          return <AntTag color="orange">Disabled</AntTag>;
        }
        return <Text type="secondary">-</Text>;
      },
    },
    {
      title: 'Comment',
      dataIndex: 'comment',
      key: 'comment',
      width: 150,
      ellipsis: true,
      sorter: (a: ComputePool, b: ComputePool) => (a.comment || '').localeCompare(b.comment || ''),
      render: (comment: string) => comment || <Text type="secondary">No comment</Text>,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      sorter: (a: ComputePool, b: ComputePool) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      render: (date: string) => (
        <Tooltip title={new Date(date).toLocaleString()}>
          {new Date(date).toLocaleDateString()}
        </Tooltip>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 250,
      render: (_, record: ComputePool) => (
        <Space>
          <Tooltip title="Deploy Container">
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              style={{ color: '#1F86C9' }}
              onClick={() => showCreateServiceModal(record.name)}
            />
          </Tooltip>
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
          <Popconfirm
            title="Delete Pool"
            description="Are you sure you want to delete this compute pool? This will also delete any services running on it."
            onConfirm={() => handleDeletePool(record.name)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete Pool">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={operationLoading === record.name}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const repositoryColumns = [
    {
      title: 'Repository Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: ImageRepository, b: ImageRepository) => a.name.localeCompare(b.name),
      render: (text: string, record: ImageRepository) => {
        const repoKey = `${record.database}.${record.schema}.${record.name}`;
        const isLoading = loadingRepositoryImages.has(repoKey);
        const imageCount = getRepositoryImageCount(record);
        
        return (
          <Space direction="vertical" size={0}>
            <Space size={8}>
              <Text strong style={{ color: '#1F86C9' }}>{text}</Text>
              {isLoading ? (
                <AntTag color="processing" style={{ fontSize: '10px' }}>Loading...</AntTag>
              ) : (
                <AntTag color={imageCount > 0 ? 'success' : 'default'} style={{ fontSize: '10px' }}>
                  {imageCount} {imageCount === 1 ? 'image' : 'images'}
                </AntTag>
              )}
            </Space>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.database}.{record.schema}
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Database',
      dataIndex: 'database',
      key: 'database',
      width: 120,
      sorter: (a: ImageRepository, b: ImageRepository) => a.database.localeCompare(b.database),
    },
    {
      title: 'Schema',
      dataIndex: 'schema',
      key: 'schema',
      width: 120,
      sorter: (a: ImageRepository, b: ImageRepository) => a.schema.localeCompare(b.schema),
    },
    {
      title: 'Owner',
      dataIndex: 'owner',
      key: 'owner',
      width: 120,
      sorter: (a: ImageRepository, b: ImageRepository) => a.owner.localeCompare(b.owner),
    },
    {
      title: 'Repository URL',
      dataIndex: 'repository_url',
      key: 'repository_url',
      width: 200,
      render: (url: string) => (
        url ? (
          <Tooltip title={url}>
            <Text ellipsis style={{ maxWidth: 180 }}>
              {url}
            </Text>
          </Tooltip>
        ) : (
          <Text type="secondary">No URL</Text>
        )
      ),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      sorter: (a: ImageRepository, b: ImageRepository) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record: ImageRepository) => (
        <Popconfirm
          title="Delete Repository"
          description="Are you sure you want to delete this image repository? This will delete all images in it."
          onConfirm={() => handleDeleteRepo(record.name, record.database, record.schema)}
          okText="Yes"
          cancelText="No"
          okButtonProps={{ danger: true }}
        >
          <Tooltip title="Delete Repository">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              loading={operationLoading === record.name}
            />
          </Tooltip>
        </Popconfirm>
      ),
    },
  ];

  const imageColumns = [
    {
      title: 'Image Details',
      key: 'image_details',
      width: 200,
      render: (_, record: ContainerImage) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ color: '#1F86C9', fontSize: '13px' }}>{record.image_name}</Text>
          <AntTag color="blue" style={{ fontSize: '10px' }}>{record.tag}</AntTag>
        </Space>
      ),
    },
    {
      title: 'Repository',
      key: 'repository_path',
      width: 250,
      render: (_, record: ContainerImage) => (
        <Text type="secondary" style={{ fontSize: '11px', fontFamily: 'monospace' }}>
          {record.repository_database}.{record.repository_schema}.{record.repository_name}
        </Text>
      ),
      sorter: (a: ContainerImage, b: ContainerImage) => 
        `${a.repository_database}.${a.repository_schema}.${a.repository_name}`.localeCompare(
          `${b.repository_database}.${b.repository_schema}.${b.repository_name}`
        ),
    },
    {
      title: 'Digest',
      dataIndex: 'digest',
      key: 'digest',
      width: 130,
      render: (digest: string) => (
        <Tooltip title={digest}>
          <Text ellipsis style={{ maxWidth: 110, fontFamily: 'monospace', fontSize: '11px' }}>
            {digest ? digest.substring(0, 16) + '...' : 'N/A'}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 90,
      render: (_, record: ContainerImage) => {
        const imagePath = `/${record.repository_database}/${record.repository_schema}/${record.repository_name}/${record.image_name}:${record.tag}`;
        return (
          <Tooltip title="Deploy container with this image">
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => {
                showCreateServiceModal();
                setTimeout(() => handleImageSelection(imagePath), 100);
              }}
            >
              Deploy
            </Button>
          </Tooltip>
        );
      },
    },
  ];

  const handleViewPolicyDetails = async (policyName: string) => {
    setPolicyDetailsLoading(true);
    setPolicyDetailsModalVisible(true);
    try {
      const response = await api.describeNetworkPolicy(policyName);
      setSelectedPolicyDetails(response.data.data);
    } catch (error: any) {
      message.error(`Failed to load policy details for ${policyName}`);
      setPolicyDetailsModalVisible(false);
    } finally {
      setPolicyDetailsLoading(false);
    }
  };

  const handleViewRuleDetails = async (ruleName: string) => {
    setRuleDetailsLoading(true);
    setRuleDetailsModalVisible(true);
    try {
      const response = await api.describeNetworkRule(ruleName);
      setSelectedRuleDetails(response.data.data);
    } catch (error: any) {
      message.error(`Failed to load rule details for ${ruleName}`);
      setRuleDetailsModalVisible(false);
    } finally {
      setRuleDetailsLoading(false);
    }
  };

  const handleEditRule = (rule: NetworkRule) => {
    setEditRuleForm({
      name: rule.name,
      value_list: [''], // Will be populated from rule details
      comment: rule.comment || ''
    });
    setEditRuleModalVisible(true);
  };

  const handleUpdateRule = async () => {
    if (!editRuleForm.name) {
      message.error('Rule name is required');
      return;
    }

    const validValues = editRuleForm.value_list.filter(value => value.trim());
    if (validValues.length === 0) {
      message.error('Please provide at least one valid network identifier');
      return;
    }

    setOperationLoading('update-rule');
    try {
      await api.updateNetworkRule(editRuleForm.name, {
        value_list: validValues,
        comment: editRuleForm.comment
      });
      message.success(`Network rule ${editRuleForm.name} updated successfully`);
      setEditRuleModalVisible(false);
      setEditRuleForm({
        name: '',
        value_list: [''],
        comment: ''
      });
      loadNetworkData();
    } catch (error: any) {
      message.error(error.response?.data?.detail || `Failed to update network rule ${editRuleForm.name}`);
    } finally {
      setOperationLoading(null);
    }
  };

  const handleEditPolicy = (policy: NetworkPolicy) => {
    setEditPolicyForm({
      name: policy.name,
      allowed_network_rules: [],
      blocked_network_rules: [],
      allowed_ip_list: [''],
      blocked_ip_list: [''],
      comment: policy.comment || ''
    });
    setEditPolicyModalVisible(true);
  };

  const handleUpdatePolicy = async () => {
    if (!editPolicyForm.name) {
      message.error('Policy name is required');
      return;
    }

    setOperationLoading('update-policy');
    try {
      const policyData = {
        allowed_network_rules: editPolicyForm.allowed_network_rules,
        blocked_network_rules: editPolicyForm.blocked_network_rules,
        allowed_ip_list: editPolicyForm.allowed_ip_list.filter(ip => ip.trim()),
        blocked_ip_list: editPolicyForm.blocked_ip_list.filter(ip => ip.trim()),
        comment: editPolicyForm.comment
      };

      await api.updateNetworkPolicy(editPolicyForm.name, policyData);
      message.success(`Network policy ${editPolicyForm.name} updated successfully`);
      setEditPolicyModalVisible(false);
      setEditPolicyForm({
        name: '',
        allowed_network_rules: [],
        blocked_network_rules: [],
        allowed_ip_list: [''],
        blocked_ip_list: [''],
        comment: ''
      });
      loadNetworkData();
    } catch (error: any) {
      message.error(error.response?.data?.detail || `Failed to update network policy ${editPolicyForm.name}`);
    } finally {
      setOperationLoading(null);
    }
  };

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>
        <CloudServerOutlined style={{ marginRight: 8, color: '#1F86C9' }} />
        Snowpark Container Services Management
      </Title>
      
      <Tabs
        defaultActiveKey="services"
        items={[
          {
            key: 'services',
            label: (
              <span>
                <CloudServerOutlined />
                Container Services
              </span>
            ),
            children: (
              <div>
                {/* Container Services Content */}
                <Card style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Title level={3} style={{ margin: 0 }}>
                      <CloudServerOutlined style={{ marginRight: 8, color: '#1F86C9' }} />
                      Snowpark Container Services
                    </Title>
                    <Space>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => showCreateServiceModal()}
                      >
                        Create Service
                      </Button>
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={loadData}
                        loading={loading}
                      >
                        Refresh
                      </Button>
                    </Space>
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
                      size="small"
                      pagination={{
                        pageSize: 15,
                        size: 'small',
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} services`,
                      }}
                    />
                  )}
                </Card>
              </div>
            ),
          },
          {
            key: 'pools',
            label: (
              <span>
                <CloudServerOutlined />
                Compute Pools
              </span>
            ),
            children: (
              <div>
                <Card>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Title level={3} style={{ margin: 0 }}>
                      <CloudServerOutlined style={{ marginRight: 8, color: '#52c41a' }} />
                      Compute Pools
                    </Title>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setCreatePoolModalVisible(true)}
                    >
                      Create Pool
                    </Button>
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
                      size="small"
                      scroll={{ x: 1400 }}
                      pagination={{
                        pageSize: 15,
                        size: 'small',
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} pools`,
                        pageSizeOptions: ['10', '15', '25', '50'],
                      }}
                      sortDirections={['ascend', 'descend']}
                    />
                  )}
                </Card>
              </div>
            ),
          },
          {
            key: 'repositories',
            label: (
              <span>
                <DatabaseOutlined />
                Image Repositories
              </span>
            ),
            children: (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Title level={3} style={{ margin: 0 }}>
                    <DatabaseOutlined style={{ marginRight: 8, color: '#fa8c16' }} />
                    Image Repositories
                  </Title>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setCreateRepoModalVisible(true)}
                  >
                    Create Repository
                  </Button>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <Input
                    placeholder="Search repositories by name, database, schema, or owner..."
                    prefix={<SearchOutlined />}
                    value={repositorySearchText}
                    onChange={(e) => handleRepositorySearch(e.target.value)}
                    allowClear
                    style={{ maxWidth: 500 }}
                  />
                </div>

                {repositories.length === 0 && !loading ? (
                  <Alert
                    message="No Image Repositories Found"
                    description="No image repositories are currently available in your Snowflake account."
                    type="info"
                    showIcon
                  />
                ) : (
                  <Table
                    columns={repositoryColumns}
                    dataSource={filteredRepositories}
                    loading={loading}
                    size="small"
                    rowKey={(record) => `${record.database}.${record.schema}.${record.name}`}
                    expandable={{
                      expandedRowRender: (record: ImageRepository) => {
                        const repoImages = getRepositoryImagesForDisplay(record);
                        const repoKey = `${record.database}.${record.schema}.${record.name}`;
                        const isExpanded = expandedRepositories.has(repoKey);
                        const isLoading = loadingRepositoryImages.has(repoKey);
                        
                        if (isLoading) {
                          return (
                            <div style={{ padding: '24px', textAlign: 'center' }}>
                              <Spin size="large" />
                              <div style={{ marginTop: 16 }}>
                                <Text>Loading images from repository {record.name}...</Text>
                              </div>
                            </div>
                          );
                        }
                        
                        if (!isExpanded || repoImages.length === 0) {
                          return (
                            <div style={{ padding: '16px' }}>
                              <Alert
                                message="No Images Found"
                                description={`No container images found in repository ${record.name}. This repository may be empty or the images may not be accessible.`}
                                type="info"
                                showIcon
                              />
                            </div>
                          );
                        }
                        
                        return (
                          <div style={{ padding: '16px', backgroundColor: isDarkMode ? '#001529' : '#fafafa', borderRadius: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                              <Title level={5} style={{ margin: 0 }}>
                                <CloudServerOutlined style={{ marginRight: 8, color: '#13c2c2' }} />
                                Images in {record.name} ({repoImages.length} {repoImages.length === 1 ? 'image' : 'images'})
                              </Title>
                              <AntTag color="processing">
                                Repository: {record.database}.{record.schema}.{record.name}
                              </AntTag>
                            </div>
                            <Table
                              columns={[
                                {
                                  title: 'Image Details',
                                  width: 200,
                                  render: (_, image: ContainerImage) => (
                                    <Space direction="vertical" size={2}>
                                      <Text strong style={{ color: '#1F86C9', fontSize: '13px' }}>
                                        {image.image_name}
                                      </Text>
                                      <AntTag color="blue" style={{ fontSize: '10px' }}>
                                        {image.tag}
                                      </AntTag>
                                    </Space>
                                  ),
                                },
                                {
                                  title: 'Digest',
                                  dataIndex: 'digest',
                                  width: 140,
                                  render: (digest: string) => (
                                    <Tooltip title={digest}>
                                      <Text ellipsis style={{ maxWidth: 120, fontFamily: 'monospace', fontSize: '11px' }}>
                                        {digest ? digest.substring(0, 16) + '...' : 'N/A'}
                                      </Text>
                                    </Tooltip>
                                  ),
                                },
                                {
                                  title: 'Actions',
                                  width: 100,
                                  render: (_, image: ContainerImage) => {
                                    const imagePath = `/${image.repository_database}/${image.repository_schema}/${image.repository_name}/${image.image_name}:${image.tag}`;
                                    return (
                                      <Space>
                                        <Tooltip title="Deploy container service with this image">
                                          <Button
                                            type="primary"
                                            size="small"
                                            icon={<PlusOutlined />}
                                            onClick={() => {
                                              showCreateServiceModal();
                                              setTimeout(() => handleImageSelection(imagePath), 100);
                                            }}
                                          >
                                            Deploy
                                          </Button>
                                        </Tooltip>
                                      </Space>
                                    );
                                  },
                                },
                              ]}
                              dataSource={repoImages}
                              pagination={repoImages.length > 5 ? { pageSize: 5, size: 'small' } : false}
                              size="small"
                              rowKey={(image) => `${image.image_name}-${image.tag}`}
                              style={{ 
                                backgroundColor: isDarkMode ? '#141414' : '#ffffff',
                                borderRadius: '4px'
                              }}
                            />
                          </div>
                        );
                      },
                      onExpand: handleRepositoryExpand,
                      expandIcon: ({ expanded, onExpand, record }) => {
                        const repoKey = `${record.database}.${record.schema}.${record.name}`;
                        const isLoading = loadingRepositoryImages.has(repoKey);
                        
                        return (
                          <Tooltip title={expanded ? "Hide images" : "Show images in this repository"}>
                            <Button
                              type="text"
                              size="small"
                              loading={isLoading}
                              icon={!isLoading && (expanded ? <DownOutlined /> : <RightOutlined />)}
                              onClick={(e) => onExpand(record, e)}
                              style={{ 
                                color: expanded ? '#1890ff' : '#666',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            />
                          </Tooltip>
                        );
                      },
                    }}
                    pagination={{
                      pageSize: 15,
                      size: 'small',
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} repositories`,
                    }}
                  />
                )}
              </div>
            ),
          },
          {
            key: 'images',
            label: (
              <span>
                <CloudServerOutlined />
                Images
              </span>
            ),
            children: (
              <div>
                <Card style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Title level={3} style={{ margin: 0 }}>
                      <CloudServerOutlined style={{ marginRight: 8, color: '#13c2c2' }} />
                      Images
                    </Title>
                  </div>

                  <Alert
                    message="Image Management Information"
                    description="In Snowflake, individual container images cannot be deleted directly. Images are managed at the repository level. To remove images, you can delete the entire image repository or use Docker commands to manage the repository contents externally."
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />

                  <div style={{ marginBottom: 16 }}>
                    <Input
                      placeholder="Search images by repository, name, tag, architecture, or OS..."
                      prefix={<SearchOutlined />}
                      value={imageSearchText}
                      onChange={(e) => handleImageSearch(e.target.value)}
                      allowClear
                      style={{ maxWidth: 550 }}
                    />
                  </div>

                  {images.length === 0 && !loading ? (
                    <Alert
                      message="No Images Found"
                      description="No container images are currently available in your image repositories."
                      type="info"
                      showIcon
                    />
                  ) : (
                    <Table
                      columns={imageColumns}
                      dataSource={filteredImages}
                      loading={loading}
                      size="small"
                      rowKey={(record) => `${record.repository_name}-${record.image_name}-${record.tag}`}
                      pagination={{
                        pageSize: 15,
                        size: 'small',
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} images`,
                      }}
                    />
                  )}
                </Card>
              </div>
            ),
          },
        ]}
      />

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

      {/* Create Container Service Modal */}
      <Modal
        title={
          <Space>
            <PlusOutlined style={{ color: '#1F86C9' }} />
            Create Container Service
          </Space>
        }
        open={createServiceModalVisible}
        onCancel={() => setCreateServiceModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setCreateServiceModalVisible(false)}>
            Cancel
          </Button>,
          <Button
            key="create"
            type="primary"
            onClick={handleCreateService}
            loading={operationLoading === 'create-service'}
          >
            Create Service
          </Button>,
        ]}
        width={800}
      >
        <Alert
          message="Quick Tip"
          description="You can also deploy a container directly by clicking the 'Deploy' button next to any image in the Images section below."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Form layout="vertical">
          <Form.Item
            label="Service Name"
            required
            help="Unique name for the container service. Only letters, numbers, and underscores allowed. Hyphens will be converted to underscores."
            validateStatus={createServiceForm.name && !/^[a-zA-Z0-9_-]*$/.test(createServiceForm.name) ? 'error' : ''}
            hasFeedback={createServiceForm.name && !/^[a-zA-Z0-9_-]*$/.test(createServiceForm.name)}
          >
            <Input
              placeholder="my_container_service"
              value={createServiceForm.name}
              onChange={(e) => {
                const value = e.target.value;
                setCreateServiceForm({
                  ...createServiceForm,
                  name: value
                });
              }}
              onBlur={(e) => {
                // Auto-convert hyphens to underscores on blur
                const value = e.target.value;
                if (value.includes('-')) {
                  const sanitized = value.replace(/-/g, '_');
                  setCreateServiceForm({
                    ...createServiceForm,
                    name: sanitized
                  });
                }
              }}
            />
            {createServiceForm.name && createServiceForm.name.includes('-') && (
              <div style={{ color: '#faad14', fontSize: '12px', marginTop: '4px' }}>
                ⚠️ Hyphens will be converted to underscores when creating the service
              </div>
            )}
          </Form.Item>

          <Form.Item
            label="Compute Pool"
            required
            help="The compute pool where the service will run. Suspended pools will be automatically resumed when the service starts."
          >
            <Select
              placeholder="Select a compute pool"
              value={createServiceForm.compute_pool}
              onChange={(value) => setCreateServiceForm({
                ...createServiceForm,
                compute_pool: value
              })}
              options={computePools.map(pool => ({
                label: `${pool.name} (${pool.state})`,
                value: pool.name,
                disabled: pool.state === 'FAILED' || pool.state === 'STOPPING'
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Container Image"
            help="Select an image from your repositories or leave empty to use the default"
          >
            <Select
              placeholder="Select a container image (optional)"
              value={selectedImagePath}
              onChange={handleImageSelection}
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={images.map(image => {
                const imagePath = `/${image.repository_database}/${image.repository_schema}/${image.repository_name}/${image.image_name}:${image.tag}`;
                return {
                  label: (
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{image.image_name}:{image.tag}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {image.repository_database}.{image.repository_schema}.{image.repository_name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#999' }}>
                        {image.architecture} • {((image.size_bytes || 0) / (1024 * 1024)).toFixed(1)} MB
                      </div>
                    </div>
                  ),
                  value: imagePath,
                  searchText: `${image.image_name} ${image.tag} ${image.repository_name} ${image.repository_database} ${image.repository_schema}`
                };
              })}
            />
          </Form.Item>

          <Space style={{ width: '100%' }} size="large">
            <Form.Item
              label="Min Instances"
              style={{ width: '50%' }}
            >
              <InputNumber
                min={1}
                max={100}
                value={createServiceForm.min_instances}
                onChange={(value) => setCreateServiceForm({
                  ...createServiceForm,
                  min_instances: value || 1
                })}
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item
              label="Max Instances"
              style={{ width: '50%' }}
            >
              <InputNumber
                min={1}
                max={100}
                value={createServiceForm.max_instances}
                onChange={(value) => setCreateServiceForm({
                  ...createServiceForm,
                  max_instances: value || 1
                })}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Space>

          <Form.Item
            label="Service Specification"
            required
            help={
              <div>
                <div>YAML specification for the container service</div>
                {selectedImagePath && (
                  <div style={{ marginTop: 4, color: '#1890ff' }}>
                    📦 Using image: <code>{selectedImagePath}</code>
                  </div>
                )}
              </div>
            }
          >
            <Input.TextArea
              rows={12}
              placeholder="Enter service specification in YAML format..."
              value={createServiceForm.spec}
              onChange={(e) => setCreateServiceForm({
                ...createServiceForm,
                spec: e.target.value
              })}
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
                  </Form>
        </Modal>

        {/* Create Compute Pool Modal */}
        <Modal
          title={
            <Space>
              <PlusOutlined style={{ color: '#52c41a' }} />
              Create Compute Pool
            </Space>
          }
          open={createPoolModalVisible}
          onCancel={() => setCreatePoolModalVisible(false)}
          footer={[
            <Button key="cancel" onClick={() => setCreatePoolModalVisible(false)}>
              Cancel
            </Button>,
            <Button
              key="create"
              type="primary"
              onClick={handleCreatePool}
              loading={operationLoading === 'create-pool'}
            >
              Create Pool
            </Button>,
          ]}
          width={600}
        >
          <Form layout="vertical">
            <Form.Item
              label="Pool Name"
              required
              help="Unique name for the compute pool"
            >
              <Input
                placeholder="my-compute-pool"
                value={createPoolForm.name}
                onChange={(e) => setCreatePoolForm({
                  ...createPoolForm,
                  name: e.target.value
                })}
              />
            </Form.Item>

            <Form.Item
              label="Instance Family"
              required
              help="The type of instances to use"
            >
              <Select
                value={createPoolForm.instance_family}
                onChange={(value) => setCreatePoolForm({
                  ...createPoolForm,
                  instance_family: value
                })}
                options={[
                  { label: 'CPU_X64_XS (Extra Small)', value: 'CPU_X64_XS' },
                  { label: 'CPU_X64_S (Small)', value: 'CPU_X64_S' },
                  { label: 'CPU_X64_M (Medium)', value: 'CPU_X64_M' },
                  { label: 'CPU_X64_L (Large)', value: 'CPU_X64_L' },
                  { label: 'CPU_X64_XL (Extra Large)', value: 'CPU_X64_XL' },
                  { label: 'HIGHMEM_X64_S (High Memory Small)', value: 'HIGHMEM_X64_S' },
                  { label: 'HIGHMEM_X64_M (High Memory Medium)', value: 'HIGHMEM_X64_M' },
                  { label: 'HIGHMEM_X64_L (High Memory Large)', value: 'HIGHMEM_X64_L' },
                  { label: 'GPU_NV_S (GPU Small)', value: 'GPU_NV_S' },
                  { label: 'GPU_NV_M (GPU Medium)', value: 'GPU_NV_M' },
                  { label: 'GPU_NV_L (GPU Large)', value: 'GPU_NV_L' },
                ]}
              />
            </Form.Item>

            <Space style={{ width: '100%' }} size="large">
              <Form.Item
                label="Min Nodes"
                style={{ width: '50%' }}
              >
                <InputNumber
                  min={1}
                  max={100}
                  value={createPoolForm.min_nodes}
                  onChange={(value) => setCreatePoolForm({
                    ...createPoolForm,
                    min_nodes: value || 1
                  })}
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item
                label="Max Nodes"
                style={{ width: '50%' }}
              >
                <InputNumber
                  min={1}
                  max={100}
                  value={createPoolForm.max_nodes}
                  onChange={(value) => setCreatePoolForm({
                    ...createPoolForm,
                    max_nodes: value || 1
                  })}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Space>

            <Form.Item
              label="Auto Resume"
              help="Automatically resume the pool when SQL is submitted"
            >
              <Switch
                checked={createPoolForm.auto_resume}
                onChange={(checked) => setCreatePoolForm({
                  ...createPoolForm,
                  auto_resume: checked
                })}
              />
            </Form.Item>

            <Form.Item
              label="Auto Suspend (seconds)"
              help="Automatically suspend the pool after this many seconds of inactivity"
            >
              <InputNumber
                min={0}
                max={86400}
                value={createPoolForm.auto_suspend_secs}
                onChange={(value) => setCreatePoolForm({
                  ...createPoolForm,
                  auto_suspend_secs: value || 600
                })}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* Create Image Repository Modal */}
        <Modal
          title={
            <Space>
              <PlusOutlined style={{ color: '#fa8c16' }} />
              Create Image Repository
            </Space>
          }
          open={createRepoModalVisible}
          onCancel={() => setCreateRepoModalVisible(false)}
          footer={[
            <Button key="cancel" onClick={() => setCreateRepoModalVisible(false)}>
              Cancel
            </Button>,
            <Button
              key="create"
              type="primary"
              onClick={handleCreateRepo}
              loading={operationLoading === 'create-repo'}
            >
              Create Repository
            </Button>,
          ]}
          width={600}
        >
          <Form layout="vertical">
            <Form.Item
              label="Repository Name"
              required
              help="Unique name for the image repository"
            >
              <Input
                placeholder="my-image-repo"
                value={createRepoForm.name}
                onChange={(e) => setCreateRepoForm({
                  ...createRepoForm,
                  name: e.target.value
                })}
              />
            </Form.Item>

            <Form.Item
              label="Database"
              help="Database name (optional - uses current database if not specified)"
            >
              <Select
                placeholder="Select a database"
                value={createRepoForm.database}
                onChange={handleDatabaseChange}
                loading={databasesLoading}
                options={databases.map(db => ({
                  label: db.name,
                  value: db.name,
                }))}
              />
            </Form.Item>

            <Form.Item
              label="Schema"
              help="Schema name (optional - uses current schema if not specified)"
            >
              <Select
                placeholder="Select a schema"
                value={createRepoForm.schema}
                onChange={(value) => setCreateRepoForm({
                  ...createRepoForm,
                  schema: value
                })}
                loading={schemasLoading}
                options={schemas.map(schema => ({
                  label: schema.name,
                  value: schema.name,
                }))}
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* Create Network Rule Modal */}
        <Modal
          title={
            <Space>
              <PlusOutlined style={{ color: '#fa541c' }} />
              Create Network Rule
            </Space>
          }
          open={createRuleModalVisible}
          onCancel={() => setCreateRuleModalVisible(false)}
          footer={[
            <Button key="cancel" onClick={() => setCreateRuleModalVisible(false)}>
              Cancel
            </Button>,
            <Button
              key="create"
              type="primary"
              onClick={handleCreateNetworkRule}
              loading={operationLoading === 'create-rule'}
            >
              Create Rule
            </Button>,
          ]}
          width={600}
        >
          <Form layout="vertical">
            <Form.Item
              label="Rule Name"
              required
              help="Unique name for the network rule"
            >
              <Input
                placeholder="my-network-rule"
                value={createRuleForm.name}
                onChange={(e) => setCreateRuleForm({
                  ...createRuleForm,
                  name: e.target.value
                })}
              />
            </Form.Item>

            <Form.Item
              label="Type"
              required
              help="The type of network identifier (e.g., IPV4, DOMAIN)"
            >
              <Select
                value={createRuleForm.type}
                onChange={(value) => setCreateRuleForm({
                  ...createRuleForm,
                  type: value
                })}
                options={[
                  { label: 'IPV4', value: 'IPV4' },
                  { label: 'DOMAIN', value: 'DOMAIN' },
                  { label: 'VPC_ENDPOINT', value: 'VPC_ENDPOINT' },
                ]}
              />
            </Form.Item>

            <Form.Item
              label="Mode"
              required
              help="The mode of the rule (e.g., INGRESS, EGRESS)"
            >
              <Select
                value={createRuleForm.mode}
                onChange={(value) => setCreateRuleForm({
                  ...createRuleForm,
                  mode: value
                })}
                options={[
                  { label: 'INGRESS', value: 'INGRESS' },
                  { label: 'EGRESS', value: 'EGRESS' },
                ]}
              />
            </Form.Item>

            <Form.Item
              label="Values"
              required
              help="List of network identifiers (IP addresses, VPC endpoints, domains) that this rule applies to. Separate multiple values with commas."
            >
              <Input
                placeholder="e.g., 192.168.1.0/24, my-vpc-endpoint.snowflake.com"
                value={createRuleForm.value_list.join(', ')}
                onChange={(e) => setCreateRuleForm({
                  ...createRuleForm,
                  value_list: e.target.value.split(',').map(val => val.trim())
                })}
              />
            </Form.Item>

            <Form.Item
              label="Comment"
              help="Optional description for the rule"
            >
              <Input
                placeholder="e.g., Allow access from internal network"
                value={createRuleForm.comment}
                onChange={(e) => setCreateRuleForm({
                  ...createRuleForm,
                  comment: e.target.value
                })}
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* Create Network Policy Modal */}
        <Modal
          title={
            <Space>
              <PlusOutlined style={{ color: '#722ed1' }} />
              Create Network Policy
            </Space>
          }
          open={createPolicyModalVisible}
          onCancel={() => setCreatePolicyModalVisible(false)}
          footer={[
            <Button key="cancel" onClick={() => setCreatePolicyModalVisible(false)}>
              Cancel
            </Button>,
            <Button
              key="create"
              type="primary"
              onClick={handleCreateNetworkPolicy}
              loading={operationLoading === 'create-policy'}
            >
              Create Policy
            </Button>,
          ]}
          width={600}
        >
          <Form layout="vertical">
            <Form.Item
              label="Policy Name"
              required
              help="Unique name for the network policy"
            >
              <Input
                placeholder="my-network-policy"
                value={createPolicyForm.name}
                onChange={(e) => setCreatePolicyForm({
                  ...createPolicyForm,
                  name: e.target.value
                })}
              />
            </Form.Item>

            <Form.Item
              label="Allowed IPs"
              help="List of IP addresses that are allowed to access Snowflake. Separate multiple values with commas."
            >
              <Input
                placeholder="e.g., 192.168.1.0/24, 10.0.0.0/8"
                value={createPolicyForm.allowed_ip_list.join(', ')}
                onChange={(e) => setCreatePolicyForm({
                  ...createPolicyForm,
                  allowed_ip_list: e.target.value.split(',').map(ip => ip.trim())
                })}
              />
            </Form.Item>

            <Form.Item
              label="Blocked IPs"
              help="List of IP addresses that are blocked from accessing Snowflake. Separate multiple values with commas."
            >
              <Input
                placeholder="e.g., 172.16.0.0/12, 192.168.0.0/16"
                value={createPolicyForm.blocked_ip_list.join(', ')}
                onChange={(e) => setCreatePolicyForm({
                  ...createPolicyForm,
                  blocked_ip_list: e.target.value.split(',').map(ip => ip.trim())
                })}
              />
            </Form.Item>

            <Form.Item
              label="Allowed Network Rules"
              help="List of network rules that are allowed to be referenced by this policy. Separate multiple values with commas."
            >
              <Input
                placeholder="e.g., my-ingress-rule, my-egress-rule"
                value={createPolicyForm.allowed_network_rules.join(', ')}
                onChange={(e) => setCreatePolicyForm({
                  ...createPolicyForm,
                  allowed_network_rules: e.target.value.split(',').map(rule => rule.trim())
                })}
              />
            </Form.Item>

            <Form.Item
              label="Blocked Network Rules"
              help="List of network rules that are blocked from being referenced by this policy. Separate multiple values with commas."
            >
              <Input
                placeholder="e.g., my-ingress-rule, my-egress-rule"
                value={createPolicyForm.blocked_network_rules.join(', ')}
                onChange={(e) => setCreatePolicyForm({
                  ...createPolicyForm,
                  blocked_network_rules: e.target.value.split(',').map(rule => rule.trim())
                })}
              />
            </Form.Item>

            <Form.Item
              label="Comment"
              help="Optional description for the policy"
            >
              <Input
                placeholder="e.g., Allow access from internal network"
                value={createPolicyForm.comment}
                onChange={(e) => setCreatePolicyForm({
                  ...createPolicyForm,
                  comment: e.target.value
                })}
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* Network Policy Details Modal */}
        <Modal
          title={
            <Space>
              <SecurityScanOutlined style={{ color: '#722ed1' }} />
              Network Policy Details: {selectedPolicyDetails?.name || 'Loading...'}
            </Space>
          }
          open={policyDetailsModalVisible}
          onCancel={() => setPolicyDetailsModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setPolicyDetailsModalVisible(false)}>
              Close
            </Button>,
          ]}
          width={800}
        >
          {policyDetailsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>Loading policy details...</div>
            </div>
          ) : selectedPolicyDetails ? (
            <div>
              <Descriptions column={1} bordered>
                <Descriptions.Item label="Policy Name">
                  {selectedPolicyDetails.name}
                </Descriptions.Item>
                <Descriptions.Item label="Created On">
                  {selectedPolicyDetails.created_on}
                </Descriptions.Item>
                <Descriptions.Item label="Comment">
                  {selectedPolicyDetails.comment || 'No comment'}
                </Descriptions.Item>
                <Descriptions.Item label="Allowed IP List">
                  {selectedPolicyDetails.allowed_ip_list ? (
                    <div>
                      {selectedPolicyDetails.allowed_ip_list.split(',').map((ip: string, index: number) => (
                        <AntTag key={index} color="green" style={{ margin: '2px' }}>
                          {ip.trim()}
                        </AntTag>
                      ))}
                    </div>
                  ) : (
                    <Text type="secondary">No allowed IPs specified</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Blocked IP List">
                  {selectedPolicyDetails.blocked_ip_list ? (
                    <div>
                      {selectedPolicyDetails.blocked_ip_list.split(',').map((ip: string, index: number) => (
                        <AntTag key={index} color="red" style={{ margin: '2px' }}>
                          {ip.trim()}
                        </AntTag>
                      ))}
                    </div>
                  ) : (
                    <Text type="secondary">No blocked IPs specified</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Allowed Network Rules">
                  {selectedPolicyDetails.allowed_network_rule_list ? (
                    <div>
                      {selectedPolicyDetails.allowed_network_rule_list.split(',').map((rule: string, index: number) => (
                        <AntTag key={index} color="blue" style={{ margin: '2px' }}>
                          {rule.trim()}
                        </AntTag>
                      ))}
                    </div>
                  ) : (
                    <Text type="secondary">No allowed network rules specified</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Blocked Network Rules">
                  {selectedPolicyDetails.blocked_network_rule_list ? (
                    <div>
                      {selectedPolicyDetails.blocked_network_rule_list.split(',').map((rule: string, index: number) => (
                        <AntTag key={index} color="volcano" style={{ margin: '2px' }}>
                          {rule.trim()}
                        </AntTag>
                      ))}
                    </div>
                  ) : (
                    <Text type="secondary">No blocked network rules specified</Text>
                  )}
                </Descriptions.Item>
              </Descriptions>
            </div>
          ) : (
            <Alert
              message="No Policy Details Available"
              description="Unable to load policy details. Please try again."
              type="warning"
              showIcon
            />
          )}
        </Modal>

        {/* Network Rule Details Modal */}
        <Modal
          title={
            <Space>
              <SecurityScanOutlined style={{ color: '#fa541c' }} />
              Network Rule Details: {selectedRuleDetails?.name || 'Loading...'}
            </Space>
          }
          open={ruleDetailsModalVisible}
          onCancel={() => setRuleDetailsModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setRuleDetailsModalVisible(false)}>
              Close
            </Button>,
          ]}
          width={800}
        >
          {ruleDetailsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>Loading rule details...</div>
            </div>
          ) : selectedRuleDetails ? (
            <div>
              <Descriptions column={1} bordered>
                <Descriptions.Item label="Rule Name">
                  {selectedRuleDetails.name}
                </Descriptions.Item>
                <Descriptions.Item label="Type">
                  <AntTag color="blue">{selectedRuleDetails.type}</AntTag>
                </Descriptions.Item>
                <Descriptions.Item label="Mode">
                  <AntTag color="green">{selectedRuleDetails.mode}</AntTag>
                </Descriptions.Item>
                <Descriptions.Item label="Created On">
                  {selectedRuleDetails.created_on}
                </Descriptions.Item>
                <Descriptions.Item label="Owner">
                  {selectedRuleDetails.owner || 'No owner specified'}
                </Descriptions.Item>
                <Descriptions.Item label="Comment">
                  {selectedRuleDetails.comment || 'No comment'}
                </Descriptions.Item>
                <Descriptions.Item label="Value List">
                  {selectedRuleDetails.value_list ? (
                    <div>
                      {selectedRuleDetails.value_list.split(',').map((value: string, index: number) => (
                        <AntTag key={index} color="cyan" style={{ margin: '2px' }}>
                          {value.trim()}
                        </AntTag>
                      ))}
                    </div>
                  ) : (
                    <Text type="secondary">No values specified</Text>
                  )}
                </Descriptions.Item>
              </Descriptions>
            </div>
          ) : (
            <Alert
              message="No Rule Details Available"
              description="Unable to load rule details. Please try again."
              type="warning"
              showIcon
            />
          )}
        </Modal>

        {/* Edit Network Rule Modal */}
        <Modal
          title={
            <Space>
              <EditOutlined style={{ color: '#fa541c' }} />
              Edit Network Rule: {editRuleForm.name}
            </Space>
          }
          open={editRuleModalVisible}
          onCancel={() => setEditRuleModalVisible(false)}
          footer={[
            <Button key="cancel" onClick={() => setEditRuleModalVisible(false)}>
              Cancel
            </Button>,
            <Button
              key="update"
              type="primary"
              onClick={handleUpdateRule}
              loading={operationLoading === 'update-rule'}
            >
              Update Rule
            </Button>,
          ]}
          width={600}
        >
          <Form layout="vertical">
            <Form.Item
              label="Rule Name"
              help="Rule name cannot be changed"
            >
              <Input
                value={editRuleForm.name}
                disabled
                style={{ backgroundColor: '#f5f5f5' }}
              />
            </Form.Item>

            <Form.Item
              label="Values"
              required
              help="List of network identifiers (IP addresses, VPC endpoints, domains) that this rule applies to. Separate multiple values with commas."
            >
              <Input
                placeholder="e.g., 192.168.1.0/24, my-vpc-endpoint.snowflake.com"
                value={editRuleForm.value_list.join(', ')}
                onChange={(e) => setEditRuleForm({
                  ...editRuleForm,
                  value_list: e.target.value.split(',').map(val => val.trim())
                })}
              />
            </Form.Item>

            <Form.Item
              label="Comment"
              help="Optional description for the rule"
            >
              <Input
                placeholder="e.g., Allow access from internal network"
                value={editRuleForm.comment}
                onChange={(e) => setEditRuleForm({
                  ...editRuleForm,
                  comment: e.target.value
                })}
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* Edit Network Policy Modal */}
        <Modal
          title={
            <Space>
              <EditOutlined style={{ color: '#722ed1' }} />
              Edit Network Policy: {editPolicyForm.name}
            </Space>
          }
          open={editPolicyModalVisible}
          onCancel={() => setEditPolicyModalVisible(false)}
          footer={[
            <Button key="cancel" onClick={() => setEditPolicyModalVisible(false)}>
              Cancel
            </Button>,
            <Button
              key="update"
              type="primary"
              onClick={handleUpdatePolicy}
              loading={operationLoading === 'update-policy'}
            >
              Update Policy
            </Button>,
          ]}
          width={600}
        >
          <Form layout="vertical">
            <Form.Item
              label="Policy Name"
              help="Policy name cannot be changed"
            >
              <Input
                value={editPolicyForm.name}
                disabled
                style={{ backgroundColor: '#f5f5f5' }}
              />
            </Form.Item>

            <Form.Item
              label="Allowed IPs"
              help="List of IP addresses that are allowed to access Snowflake. Separate multiple values with commas."
            >
              <Input
                placeholder="e.g., 192.168.1.0/24, 10.0.0.0/8"
                value={editPolicyForm.allowed_ip_list.join(', ')}
                onChange={(e) => setEditPolicyForm({
                  ...editPolicyForm,
                  allowed_ip_list: e.target.value.split(',').map(ip => ip.trim())
                })}
              />
            </Form.Item>

            <Form.Item
              label="Blocked IPs"
              help="List of IP addresses that are blocked from accessing Snowflake. Separate multiple values with commas."
            >
              <Input
                placeholder="e.g., 172.16.0.0/12, 192.168.0.0/16"
                value={editPolicyForm.blocked_ip_list.join(', ')}
                onChange={(e) => setEditPolicyForm({
                  ...editPolicyForm,
                  blocked_ip_list: e.target.value.split(',').map(ip => ip.trim())
                })}
              />
            </Form.Item>

            <Form.Item
              label="Allowed Network Rules"
              help="List of network rules that are allowed to be referenced by this policy. Separate multiple values with commas."
            >
              <Input
                placeholder="e.g., my-ingress-rule, my-egress-rule"
                value={editPolicyForm.allowed_network_rules.join(', ')}
                onChange={(e) => setEditPolicyForm({
                  ...editPolicyForm,
                  allowed_network_rules: e.target.value.split(',').map(rule => rule.trim())
                })}
              />
            </Form.Item>

            <Form.Item
              label="Blocked Network Rules"
              help="List of network rules that are blocked from being referenced by this policy. Separate multiple values with commas."
            >
              <Input
                placeholder="e.g., my-ingress-rule, my-egress-rule"
                value={editPolicyForm.blocked_network_rules.join(', ')}
                onChange={(e) => setEditPolicyForm({
                  ...editPolicyForm,
                  blocked_network_rules: e.target.value.split(',').map(rule => rule.trim())
                })}
              />
            </Form.Item>

            <Form.Item
              label="Comment"
              help="Optional description for the policy"
            >
              <Input
                placeholder="e.g., Allow access from internal network"
                value={editPolicyForm.comment}
                onChange={(e) => setEditPolicyForm({
                  ...editPolicyForm,
                  comment: e.target.value
                })}
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    );
  };

export default ContainerServiceManager; 
