import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Table, 
  Space, 
  Typography, 
  Input, 
  Modal,
  Form,
  Select,
  message,
  Popconfirm,
  Tag as AntTag,
  Badge,
  Spin,
  Descriptions,
  Alert,
  Tooltip
} from 'antd';
import {
  SecurityScanOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  PoweroffOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { api, NetworkRule, NetworkPolicy } from '../services/api.ts';

const { Title, Text } = Typography;

const NetworkManager: React.FC = () => {
  const [loading, setLoading] = useState(false);
  
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

  const [operationLoading, setOperationLoading] = useState<string | null>(null);
  
  // Hover tooltip state for policy details
  const [policyHoverDetails, setPolicyHoverDetails] = useState<{[key: string]: any}>({});
  const [policyHoverLoading, setPolicyHoverLoading] = useState<{[key: string]: boolean}>({});

  // Network Policy Details state
  const [policyDetailsModalVisible, setPolicyDetailsModalVisible] = useState(false);
  const [selectedPolicyDetails, setSelectedPolicyDetails] = useState<any>(null);
  const [policyDetailsLoading, setPolicyDetailsLoading] = useState(false);

  // Network Rule Details state
  const [ruleDetailsModalVisible, setRuleDetailsModalVisible] = useState(false);
  const [selectedRuleDetails, setSelectedRuleDetails] = useState<any>(null);
  const [ruleDetailsLoading, setRuleDetailsLoading] = useState(false);

  // Edit Network Rule state
  const [editRuleModalVisible, setEditRuleModalVisible] = useState(false);
  const [editRuleForm, setEditRuleForm] = useState({
    name: '',
    value_list: [''],
    comment: ''
  });

  // Edit Network Policy state
  const [editPolicyModalVisible, setEditPolicyModalVisible] = useState(false);
  const [editPolicyForm, setEditPolicyForm] = useState({
    name: '',
    allowed_network_rules: [],
    blocked_network_rules: [],
    allowed_ip_list: [''],
    blocked_ip_list: [],
    comment: ''
  });

  const [networkPolicyStatus, setNetworkPolicyStatus] = useState<any>(null);
  const [policyStatusLoading, setPolicyStatusLoading] = useState(false);

  useEffect(() => {
    loadNetworkData();
  }, []);

  // Filter network rules based on search text
  const handleNetworkRuleSearch = (value: string) => {
    setNetworkRuleSearchText(value);
    if (!value) {
      setFilteredNetworkRules(networkRules);
      return;
    }

    const filtered = networkRules.filter(rule => {
      return (
        rule.name.toLowerCase().includes(value.toLowerCase()) ||
        rule.type.toLowerCase().includes(value.toLowerCase()) ||
        rule.mode.toLowerCase().includes(value.toLowerCase()) ||
        (rule.comment && rule.comment.toLowerCase().includes(value.toLowerCase()))
      );
    });
    setFilteredNetworkRules(filtered);
  };

  // Filter network policies based on search text
  const handleNetworkPolicySearch = (value: string) => {
    setNetworkPolicySearchText(value);
    if (!value) {
      setFilteredNetworkPolicies(networkPolicies);
      return;
    }

    const searchLower = value.toLowerCase();
    const filtered = networkPolicies.filter(policy => {
      return (
        policy.name.toLowerCase().includes(searchLower) ||
        (policy.comment && policy.comment.toLowerCase().includes(searchLower)) ||
        (policy.owner && policy.owner.toLowerCase().includes(searchLower)) ||
        (policy.database_name && policy.database_name.toLowerCase().includes(searchLower)) ||
        (policy.schema_name && policy.schema_name.toLowerCase().includes(searchLower))
      );
    });
    setFilteredNetworkPolicies(filtered);
  };

  // Network Rules and Policies handlers
  const loadNetworkData = async () => {
    setLoading(true);
    let rules: NetworkRule[] = [];
    let policies: NetworkPolicy[] = [];
    
    // Load network rules
    try {
      const rulesResponse = await api.getNetworkRules();
      rules = rulesResponse.data.data || [];
    } catch (error) {
      console.error('Failed to load network rules:', error);
      message.error('Failed to load network rules');
    }
    
    // Load network policies
    try {
      const policiesResponse = await api.getNetworkPolicies();
      policies = policiesResponse.data.data || [];
    } catch (error) {
      console.error('Failed to load network policies:', error);
      message.error('Failed to load network policies');
    }
    
    // Load network policy status and update policies with active status
    try {
      const statusResponse = await api.getNetworkPolicyStatus();
      const status = statusResponse.data;
      const currentPolicy = status.current_policy;
      
      // Update policies with active status
      policies = policies.map(policy => ({
        ...policy,
        is_active: policy.name === currentPolicy
      }));
      
      setNetworkPolicyStatus(status);
    } catch (error) {
      console.warn('Failed to load network policy status:', error);
      // Set all policies as inactive if status loading fails
      policies = policies.map(policy => ({
        ...policy,
        is_active: false
      }));
    }
    
    // Set the data with updated status
    setNetworkRules(rules);
    setFilteredNetworkRules(rules);
    setNetworkPolicies(policies);
    setFilteredNetworkPolicies(policies);
    setLoading(false);
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

  const getPlaceholderForType = (type: string): string => {
    switch (type) {
      case 'IPV4':
        return 'e.g., 192.168.1.0/24, 10.0.0.0/8, or 0.0.0.0/0';
      case 'HOST_PORT':
        return 'e.g., example.com:443, api.company.com:8080';
      case 'AWSVPCEID':
        return 'e.g., vpce-1234567890abcdef0';
      default:
        return 'Enter network identifier';
    }
  };

  const getValidModesForType = (type: string) => {
    switch (type) {
      case 'IPV4':
        return [
          { value: 'INGRESS', label: 'Ingress (Inbound)' }
        ];
      case 'HOST_PORT':
        return [
          { value: 'EGRESS', label: 'Egress (Outbound)' }
        ];
      case 'AWSVPCEID':
        return [
          { value: 'EGRESS', label: 'Egress (Outbound)' }
        ];
      default:
        return [
          { value: 'INGRESS', label: 'Ingress (Inbound)' },
          { value: 'EGRESS', label: 'Egress (Outbound)' },
          { value: 'INTERNAL_STAGE', label: 'Internal Stage' },
        ];
    }
  };

  const validateNetworkValues = (values: string[], type: string): string | null => {
    for (const value of values) {
      const trimmedValue = value.trim();
      if (!trimmedValue) continue;
      
      if (type === 'IPV4') {
        // Check for CIDR notation (e.g., 192.168.1.0/24) or single IP
        const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
        if (!cidrRegex.test(trimmedValue)) {
          return `Invalid IPv4 address or CIDR: "${trimmedValue}". Examples: 192.168.1.1, 10.0.0.0/8, 0.0.0.0/0`;
        }
        
        // Validate IP octets are 0-255
        const parts = trimmedValue.split('/')[0].split('.');
        for (const part of parts) {
          const num = parseInt(part, 10);
          if (num < 0 || num > 255) {
            return `Invalid IPv4 address: "${trimmedValue}". Each octet must be 0-255.`;
          }
        }
        
        // Validate CIDR prefix if present
        if (trimmedValue.includes('/')) {
          const prefix = parseInt(trimmedValue.split('/')[1], 10);
          if (prefix < 0 || prefix > 32) {
            return `Invalid CIDR prefix: "${trimmedValue}". Prefix must be 0-32.`;
          }
        }
      } else if (type === 'HOST_PORT') {
        // Check for hostname:port format
        const hostPortRegex = /^[a-zA-Z0-9.-]+:\d+$/;
        if (!hostPortRegex.test(trimmedValue)) {
          return `Invalid HOST_PORT format: "${trimmedValue}". Example: example.com:443`;
        }
        
        const port = parseInt(trimmedValue.split(':')[1], 10);
        if (port < 1 || port > 65535) {
          return `Invalid port number in "${trimmedValue}". Port must be 1-65535.`;
        }
      } else if (type === 'AWSVPCEID') {
        // Check for AWS VPC Endpoint ID format
        const vpcRegex = /^vpce-[a-f0-9]{8,17}$/;
        if (!vpcRegex.test(trimmedValue)) {
          return `Invalid AWS VPC Endpoint ID: "${trimmedValue}". Example: vpce-1234567890abcdef0`;
        }
      }
    }
    return null; // All valid
  };

  const handleCreateNetworkRule = async () => {
    if (!createRuleForm.name || !createRuleForm.type || !createRuleForm.mode || createRuleForm.value_list.length === 0) {
      message.error('Please fill in all required fields');
      return;
    }

    // Validate TYPE/MODE combination
    const validModes = getValidModesForType(createRuleForm.type);
    const isValidMode = validModes.some(mode => mode.value === createRuleForm.mode);
    if (!isValidMode) {
      message.error(`Invalid TYPE/MODE combination. ${createRuleForm.type} only supports: ${validModes.map(m => m.label).join(', ')}`);
      return;
    }

    // Filter out empty values
    const validValues = createRuleForm.value_list.filter(value => value.trim());
    if (validValues.length === 0) {
      message.error('Please provide at least one valid network identifier');
      return;
    }

    // Validate network values based on type
    const validationError = validateNetworkValues(validValues, createRuleForm.type);
    if (validationError) {
      message.error(validationError);
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

  const handleEnableNetworkPolicy = async (policyName: string) => {
    setOperationLoading(`enable-${policyName}`);
    try {
      await api.enableNetworkPolicy(policyName);
      message.success(`Network policy ${policyName} enabled successfully`);
      await loadNetworkData(); // Refresh policy list and status
    } catch (error: any) {
      message.error(error.response?.data?.detail || `Failed to enable network policy ${policyName}`);
    } finally {
      setOperationLoading(null);
    }
  };

  const handleDisableNetworkPolicy = async () => {
    setOperationLoading('disable-policy');
    try {
      await api.disableNetworkPolicy();
      message.success('Network policy disabled successfully');
      await loadNetworkData(); // Refresh policy list and status
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to disable network policy');
    } finally {
      setOperationLoading(null);
    }
  };

  const showPolicyDetails = async (policyName: string) => {
    setPolicyDetailsModalVisible(true);
    setPolicyDetailsLoading(true);
    try {
      const response = await api.describeNetworkPolicy(policyName);
      setSelectedPolicyDetails(response.data.data);
    } catch (error: any) {
      message.error(error.response?.data?.detail || `Failed to load policy details for ${policyName}`);
      setPolicyDetailsModalVisible(false);
    } finally {
      setPolicyDetailsLoading(false);
    }
  };

  const showRuleDetails = async (ruleName: string) => {
    setRuleDetailsModalVisible(true);
    setRuleDetailsLoading(true);
    try {
      const response = await api.describeNetworkRule(ruleName);
      setSelectedRuleDetails(response.data.data);
    } catch (error: any) {
      message.error(error.response?.data?.detail || `Failed to load rule details for ${ruleName}`);
      setRuleDetailsModalVisible(false);
    } finally {
      setRuleDetailsLoading(false);
    }
  };

  const handleEditRule = async (rule: NetworkRule) => {
    setEditRuleModalVisible(true);
    setOperationLoading('loading-rule-details');
    try {
      const response = await api.describeNetworkRule(rule.name);
      const ruleDetails = response.data.data;
      
      let valueList = [''];
      if (ruleDetails.value_list) {
        valueList = ruleDetails.value_list.split(',').map((val: string) => val.trim());
      }
      
      setEditRuleForm({
        name: rule.name,
        value_list: valueList,
        comment: ruleDetails.comment || rule.comment || ''
      });
    } catch (error: any) {
      message.error(error.response?.data?.detail || `Failed to load rule details for ${rule.name}`);
      setEditRuleModalVisible(false);
    } finally {
      setOperationLoading(null);
    }
  };

  const handleUpdateRule = async () => {
    if (editRuleForm.value_list.length === 0) {
      message.error('Please provide at least one network identifier');
      return;
    }

    // Filter out empty values
    const validValues = editRuleForm.value_list.filter(value => value.trim());
    if (validValues.length === 0) {
      message.error('Please provide at least one valid network identifier');
      return;
    }

    // Get the rule type from the original rule for validation
    // We need the type to validate the values properly
    const currentRule = networkRules.find(rule => rule.name === editRuleForm.name);
    if (currentRule) {
      const validationError = validateNetworkValues(validValues, currentRule.type);
      if (validationError) {
        message.error(validationError);
        return;
      }
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

  const handleEditPolicy = async (policy: NetworkPolicy) => {
    setEditPolicyModalVisible(true);
    setOperationLoading('loading-policy-details');
    try {
      const response = await api.describeNetworkPolicy(policy.name);
      const policyDetails = response.data.data;
      
      // Parse allowed IPs
      let allowedIpList: string[] = [''];
      if (policyDetails.allowed_ip_list) {
        allowedIpList = policyDetails.allowed_ip_list.split(',').map((ip: string) => ip.trim());
      }
      
      // Parse blocked IPs
      let blockedIpList: string[] = [];
      if (policyDetails.blocked_ip_list) {
        blockedIpList = policyDetails.blocked_ip_list.split(',').map((ip: string) => ip.trim());
      }
      
      // Parse allowed network rules
      let allowedNetworkRules: string[] = [];
      if (policyDetails.allowed_network_rule_list) {
        allowedNetworkRules = policyDetails.allowed_network_rule_list.split(',').map((rule: string) => rule.trim());
      }
      
      // Parse blocked network rules
      let blockedNetworkRules: string[] = [];
      if (policyDetails.blocked_network_rule_list) {
        blockedNetworkRules = policyDetails.blocked_network_rule_list.split(',').map((rule: string) => rule.trim());
      }
      
      setEditPolicyForm({
        name: policy.name,
        allowed_network_rules: allowedNetworkRules,
        blocked_network_rules: blockedNetworkRules,
        allowed_ip_list: allowedIpList,
        blocked_ip_list: blockedIpList,
        comment: policyDetails.comment || policy.comment || ''
      });
    } catch (error: any) {
      message.error(error.response?.data?.detail || `Failed to load policy details for ${policy.name}`);
      setEditPolicyModalVisible(false);
    } finally {
      setOperationLoading(null);
    }
  };

  const handleUpdatePolicy = async () => {
    setOperationLoading('update-policy');
    try {
      // Filter out empty values
      const policyData = {
        ...editPolicyForm,
        allowed_ip_list: editPolicyForm.allowed_ip_list.filter(ip => ip.trim()),
        blocked_ip_list: editPolicyForm.blocked_ip_list.filter(ip => ip.trim()),
      };

      await api.updateNetworkPolicy(editPolicyForm.name, policyData);
      message.success(`Network policy ${editPolicyForm.name} updated successfully`);
      setEditPolicyModalVisible(false);
      setEditPolicyForm({
        name: '',
        allowed_network_rules: [],
        blocked_network_rules: [],
        allowed_ip_list: [''],
        blocked_ip_list: [],
        comment: ''
      });
      loadNetworkData();
    } catch (error: any) {
      message.error(error.response?.data?.detail || `Failed to update network policy ${editPolicyForm.name}`);
    } finally {
      setOperationLoading(null);
    }
  };

  // Load policy details for hover tooltip
  const loadPolicyHoverDetails = async (policyName: string) => {
    // Return early if already loaded or loading
    if (policyHoverDetails[policyName] || policyHoverLoading[policyName]) {
      return;
    }

    setPolicyHoverLoading(prev => ({ ...prev, [policyName]: true }));
    
    try {
      const response = await api.describeNetworkPolicy(policyName);
      setPolicyHoverDetails(prev => ({ 
        ...prev, 
        [policyName]: response.data.data 
      }));
    } catch (error) {
      console.warn(`Failed to load policy details for ${policyName}:`, error);
      // Set empty object to prevent repeated attempts
      setPolicyHoverDetails(prev => ({ 
        ...prev, 
        [policyName]: {} 
      }));
    } finally {
      setPolicyHoverLoading(prev => ({ ...prev, [policyName]: false }));
    }
  };

  // Render tooltip content for policy details
  const renderPolicyTooltipContent = (policyName: string, field: string) => {
    const details = policyHoverDetails[policyName];
    const isLoading = policyHoverLoading[policyName];

    if (isLoading) {
      return (
        <div style={{ padding: '8px' }}>
          <Spin size="small" />
          <span style={{ marginLeft: 8 }}>Loading policy details...</span>
        </div>
      );
    }

    if (!details) {
      return (
        <div style={{ padding: '8px' }}>
          <Text type="secondary">No details available</Text>
        </div>
      );
    }

    const renderDetailSection = (title: string, content: string | null) => {
      if (!content) return null;
      
      const items = content.split(',').map(item => item.trim()).filter(item => item);
      if (items.length === 0) return null;

      return (
        <div style={{ marginBottom: 8 }}>
          <Text strong style={{ fontSize: '11px', color: '#1890ff' }}>{title}:</Text>
          <div style={{ marginTop: 4 }}>
            {items.map((item, index) => (
              <AntTag key={index} style={{ fontSize: '10px', margin: '1px' }}>
                {item}
              </AntTag>
            ))}
          </div>
        </div>
      );
    };

    return (
      <div style={{ maxWidth: 300, padding: '8px' }}>
        <div style={{ marginBottom: 8 }}>
          <Text strong style={{ color: '#1890ff' }}>{policyName}</Text>
        </div>
        
        {renderDetailSection('Allowed IPs', details.allowed_ip_list)}
        {renderDetailSection('Blocked IPs', details.blocked_ip_list)}
        {renderDetailSection('Allowed Rules', details.allowed_network_rule_list)}
        {renderDetailSection('Blocked Rules', details.blocked_network_rule_list)}
        
        {details.comment && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
            <Text style={{ fontSize: '11px', fontStyle: 'italic' }}>
              {details.comment}
            </Text>
          </div>
        )}
      </div>
    );
  };

  // Network Rules table columns
  const networkRuleColumns = [
    {
      title: 'Rule Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: NetworkRule) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: '#1F86C9' }}>{text}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.database_name}.{record.schema_name}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <AntTag color="blue">{type}</AntTag>
      ),
    },
    {
      title: 'Mode',
      dataIndex: 'mode',
      key: 'mode',
      render: (mode: string) => (
        <AntTag color="green">{mode}</AntTag>
      ),
    },
    {
      title: 'Comment',
      dataIndex: 'comment',
      key: 'comment',
      ellipsis: true,
      render: (comment: string) => comment || <Text type="secondary">No comment</Text>,
    },
    {
      title: 'Created',
      dataIndex: 'created_on',
      key: 'created_on',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record: NetworkRule) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => showRuleDetails(record.name)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Edit Rule">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditRule(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Delete Rule">
            <Popconfirm
              title="Delete Network Rule"
              description={`Are you sure you want to delete the network rule "${record.name}"?`}
              onConfirm={() => handleDeleteNetworkRule(record.name)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="text"
                icon={<DeleteOutlined />}
                danger
                size="small"
                loading={operationLoading === record.name}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Network Policies table columns
  const networkPolicyColumns = [
    {
      title: 'Policy Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: NetworkPolicy, b: NetworkPolicy) => a.name.localeCompare(b.name),
      render: (text: string, record: NetworkPolicy) => (
        <Tooltip
          title={renderPolicyTooltipContent(text, 'name')}
          placement="topLeft"
          onVisibleChange={(visible) => {
            if (visible) {
              loadPolicyHoverDetails(text);
            }
          }}
        >
          <Space direction="vertical" size={0}>
            <Text strong style={{ color: '#1F86C9', cursor: 'help' }}>{text}</Text>
            {record.database_name && record.schema_name && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.database_name}.{record.schema_name}
              </Text>
            )}
          </Space>
        </Tooltip>
      ),
    },
    {
      title: 'Owner',
      dataIndex: 'owner',
      key: 'owner',
      width: 120,
      sorter: (a: NetworkPolicy, b: NetworkPolicy) => (a.owner || '').localeCompare(b.owner || ''),
      render: (owner: string) => owner || <Text type="secondary">-</Text>,
    },
    {
      title: 'Allowed IPs',
      dataIndex: 'entries_in_allowed_ip_list',
      key: 'entries_in_allowed_ip_list',
      width: 100,
      sorter: (a: NetworkPolicy, b: NetworkPolicy) => a.entries_in_allowed_ip_list - b.entries_in_allowed_ip_list,
      render: (count: number, record: NetworkPolicy) => {
        const tag = (
          <AntTag color={count > 0 ? 'green' : 'default'} style={{ fontSize: '11px', cursor: count > 0 ? 'help' : 'default' }}>
            {count}
          </AntTag>
        );
        
        if (count > 0) {
          return (
            <Tooltip
              title={renderPolicyTooltipContent(record.name, 'allowed_ips')}
              placement="top"
              onVisibleChange={(visible) => {
                if (visible) {
                  loadPolicyHoverDetails(record.name);
                }
              }}
            >
              {tag}
            </Tooltip>
          );
        }
        return tag;
      },
    },
    {
      title: 'Blocked IPs',
      dataIndex: 'entries_in_blocked_ip_list',
      key: 'entries_in_blocked_ip_list',
      width: 100,
      sorter: (a: NetworkPolicy, b: NetworkPolicy) => a.entries_in_blocked_ip_list - b.entries_in_blocked_ip_list,
      render: (count: number, record: NetworkPolicy) => {
        const tag = (
          <AntTag color={count > 0 ? 'red' : 'default'} style={{ fontSize: '11px', cursor: count > 0 ? 'help' : 'default' }}>
            {count}
          </AntTag>
        );
        
        if (count > 0) {
          return (
            <Tooltip
              title={renderPolicyTooltipContent(record.name, 'blocked_ips')}
              placement="top"
              onVisibleChange={(visible) => {
                if (visible) {
                  loadPolicyHoverDetails(record.name);
                }
              }}
            >
              {tag}
            </Tooltip>
          );
        }
        return tag;
      },
    },
    {
      title: 'Allowed Rules',
      dataIndex: 'entries_in_allowed_network_rules',
      key: 'entries_in_allowed_network_rules',
      width: 110,
      sorter: (a: NetworkPolicy, b: NetworkPolicy) => a.entries_in_allowed_network_rules - b.entries_in_allowed_network_rules,
      render: (count: number, record: NetworkPolicy) => {
        const tag = (
          <AntTag color={count > 0 ? 'blue' : 'default'} style={{ fontSize: '11px', cursor: count > 0 ? 'help' : 'default' }}>
            {count}
          </AntTag>
        );
        
        if (count > 0) {
          return (
            <Tooltip
              title={renderPolicyTooltipContent(record.name, 'allowed_rules')}
              placement="top"
              onVisibleChange={(visible) => {
                if (visible) {
                  loadPolicyHoverDetails(record.name);
                }
              }}
            >
              {tag}
            </Tooltip>
          );
        }
        return tag;
      },
    },
    {
      title: 'Blocked Rules',
      dataIndex: 'entries_in_blocked_network_rules',
      key: 'entries_in_blocked_network_rules',
      width: 110,
      sorter: (a: NetworkPolicy, b: NetworkPolicy) => a.entries_in_blocked_network_rules - b.entries_in_blocked_network_rules,
      render: (count: number, record: NetworkPolicy) => {
        const tag = (
          <AntTag color={count > 0 ? 'volcano' : 'default'} style={{ fontSize: '11px', cursor: count > 0 ? 'help' : 'default' }}>
            {count}
          </AntTag>
        );
        
        if (count > 0) {
          return (
            <Tooltip
              title={renderPolicyTooltipContent(record.name, 'blocked_rules')}
              placement="top"
              onVisibleChange={(visible) => {
                if (visible) {
                  loadPolicyHoverDetails(record.name);
                }
              }}
            >
              {tag}
            </Tooltip>
          );
        }
        return tag;
      },
    },
    {
      title: 'Comment',
      dataIndex: 'comment',
      key: 'comment',
      width: 200,
      ellipsis: true,
      sorter: (a: NetworkPolicy, b: NetworkPolicy) => (a.comment || '').localeCompare(b.comment || ''),
      render: (comment: string, record: NetworkPolicy) => {
        if (!comment) {
          return <Text type="secondary">No comment</Text>;
        }
        
        return (
          <Tooltip
            title={renderPolicyTooltipContent(record.name, 'comment')}
            placement="topLeft"
            onVisibleChange={(visible) => {
              if (visible) {
                loadPolicyHoverDetails(record.name);
              }
            }}
          >
            <Text style={{ cursor: 'help' }}>{comment}</Text>
          </Tooltip>
        );
      },
    },
    {
      title: 'Created',
      dataIndex: 'created_on',
      key: 'created_on',
      width: 120,
      sorter: (a: NetworkPolicy, b: NetworkPolicy) => new Date(a.created_on).getTime() - new Date(b.created_on).getTime(),
      render: (date: string) => (
        <Tooltip title={new Date(date).toLocaleString()}>
          {new Date(date).toLocaleDateString()}
        </Tooltip>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record: NetworkPolicy) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => showPolicyDetails(record.name)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Edit Policy">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditPolicy(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Delete Policy">
            <Popconfirm
              title="Delete Network Policy"
              description={`Are you sure you want to delete the network policy "${record.name}"?`}
              onConfirm={() => handleDeleteNetworkPolicy(record.name)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="text"
                icon={<DeleteOutlined />}
                danger
                size="small"
                loading={operationLoading === record.name}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>
        <SecurityScanOutlined style={{ marginRight: 8, color: '#fa541c' }} />
        Network Security Management
      </Title>
      


      {/* Network Rules Section */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0 }}>
            <SecurityScanOutlined style={{ marginRight: 8, color: '#fa541c' }} />
            Network Rules
          </Title>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateRuleModalVisible(true)}
            >
              Create Rule
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadNetworkData}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search network rules by name, type, mode, or comment..."
            prefix={<SearchOutlined />}
            value={networkRuleSearchText}
            onChange={(e) => handleNetworkRuleSearch(e.target.value)}
            allowClear
            style={{ maxWidth: 500 }}
          />
        </div>

        <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
          Network rules define network identifiers (IPs, VPC endpoints, domains) that can be referenced by network policies and other security features.
        </Text>

        {networkRules.length === 0 && !loading ? (
          <Alert
            message="No Network Rules Found"
            description="No network rules are currently configured in your Snowflake account."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : (
          <Table
            columns={networkRuleColumns}
            dataSource={filteredNetworkRules}
            rowKey="name"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} rules`,
            }}
          />
        )}
      </Card>

      {/* Network Policies Section */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0 }}>
            <SecurityScanOutlined style={{ marginRight: 8, color: '#722ed1' }} />
            Network Policies
          </Title>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreatePolicyModalVisible(true)}
            >
              Create Policy
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadNetworkData}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        </div>



        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search network policies by name, owner, database, schema, or comment..."
            prefix={<SearchOutlined />}
            value={networkPolicySearchText}
            onChange={(e) => handleNetworkPolicySearch(e.target.value)}
            allowClear
            style={{ maxWidth: 500 }}
          />
        </div>

        <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
          Network policies control inbound access to Snowflake by referencing network rules and IP lists. Only one policy can be active at a time.
        </Text>

        {networkPolicies.length === 0 && !loading ? (
          <Alert
            message="No Network Policies Found"
            description="No network policies are currently configured in your Snowflake account."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : (
          <Table
            columns={networkPolicyColumns}
            dataSource={filteredNetworkPolicies}
            rowKey="name"
            loading={loading}
            size="small"
            scroll={{ x: 1200 }}
            pagination={{
              pageSize: 15,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} policies`,
              pageSizeOptions: ['10', '15', '25', '50'],
            }}
            sortDirections={['ascend', 'descend']}
          />
        )}
      </Card>

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
            help="Type of network identifier (IPv4: INGRESS only, HOST_PORT/AWSVPCEID: EGRESS only)"
          >
            <Select
              value={createRuleForm.type}
              onChange={(value) => {
                const validModes = getValidModesForType(value);
                const newMode = validModes.length > 0 ? validModes[0].value : 'INGRESS';
                setCreateRuleForm({
                  ...createRuleForm,
                  type: value,
                  mode: newMode
                });
              }}
              options={[
                { value: 'IPV4', label: 'IPv4 Address (For allowing inbound access from IP ranges)' },
                { value: 'HOST_PORT', label: 'Host:Port (For outbound access to external services)' },
                { value: 'AWSVPCEID', label: 'AWS VPC Endpoint ID (For AWS VPC access)' },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="Mode"
            required
            help={`Direction of network traffic (${createRuleForm.type} supports: ${getValidModesForType(createRuleForm.type).map(m => m.label).join(', ')})`}
          >
            <Select
              value={createRuleForm.mode}
              onChange={(value) => setCreateRuleForm({
                ...createRuleForm,
                mode: value
              })}
              options={getValidModesForType(createRuleForm.type)}
            />
          </Form.Item>

          <Form.Item
            label="Network Identifiers"
            required
            help="List of network identifiers (IPs, hosts, etc.)"
          >
            {createRuleForm.value_list.map((value, index) => (
              <div key={index} style={{ display: 'flex', marginBottom: 8 }}>
                <Input
                  placeholder={getPlaceholderForType(createRuleForm.type)}
                  value={value}
                  onChange={(e) => {
                    const newValueList = [...createRuleForm.value_list];
                    newValueList[index] = e.target.value;
                    setCreateRuleForm({
                      ...createRuleForm,
                      value_list: newValueList
                    });
                  }}
                  style={{ marginRight: 8 }}
                />
                {createRuleForm.value_list.length > 1 && (
                  <Button
                    type="text"
                    danger
                    onClick={() => {
                      const newValueList = createRuleForm.value_list.filter((_, i) => i !== index);
                      setCreateRuleForm({
                        ...createRuleForm,
                        value_list: newValueList
                      });
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="dashed"
              onClick={() => setCreateRuleForm({
                ...createRuleForm,
                value_list: [...createRuleForm.value_list, '']
              })}
              style={{ width: '100%' }}
            >
              Add Network Identifier
            </Button>
          </Form.Item>

          <Form.Item
            label="Comment"
            help="Optional description for the rule"
          >
            <Input
              placeholder="e.g., Allow access from corporate network"
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
            help="Select network rules that are allowed to be referenced by this policy."
          >
            <Select
              mode="multiple"
              placeholder="Select allowed network rules..."
              value={createPolicyForm.allowed_network_rules}
              onChange={(values) => setCreatePolicyForm({
                ...createPolicyForm,
                allowed_network_rules: values
              })}
              style={{ width: '100%' }}
              showSearch
              filterOption={(input, option) =>
                option?.label?.toLowerCase().includes(input.toLowerCase()) ?? false
              }
              options={networkRules.map(rule => ({
                value: rule.name,
                label: (
                  <Space>
                    <Text strong>{rule.name}</Text>
                    <AntTag color="blue" style={{ fontSize: '10px' }}>
                      {rule.type}
                    </AntTag>
                    <AntTag color="green" style={{ fontSize: '10px' }}>
                      {rule.mode}
                    </AntTag>
                  </Space>
                )
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Blocked Network Rules"
            help="Select network rules that are blocked from being referenced by this policy."
          >
            <Select
              mode="multiple"
              placeholder="Select blocked network rules..."
              value={createPolicyForm.blocked_network_rules}
              onChange={(values) => setCreatePolicyForm({
                ...createPolicyForm,
                blocked_network_rules: values
              })}
              style={{ width: '100%' }}
              showSearch
              filterOption={(input, option) =>
                option?.label?.toLowerCase().includes(input.toLowerCase()) ?? false
              }
              options={networkRules.map(rule => ({
                value: rule.name,
                label: (
                  <Space>
                    <Text strong>{rule.name}</Text>
                    <AntTag color="blue" style={{ fontSize: '10px' }}>
                      {rule.type}
                    </AntTag>
                    <AntTag color="green" style={{ fontSize: '10px' }}>
                      {rule.mode}
                    </AntTag>
                  </Space>
                )
              }))}
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
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Policy Name">
                {selectedPolicyDetails.name}
              </Descriptions.Item>
              <Descriptions.Item label="Allowed IP List">
                {selectedPolicyDetails.allowed_ip_list || <Text type="secondary">None</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Blocked IP List">
                {selectedPolicyDetails.blocked_ip_list || <Text type="secondary">None</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Allowed Network Rules">
                {selectedPolicyDetails.allowed_network_rule_list || <Text type="secondary">None</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Blocked Network Rules">
                {selectedPolicyDetails.blocked_network_rule_list || <Text type="secondary">None</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Comment">
                {selectedPolicyDetails.comment || <Text type="secondary">No comment</Text>}
              </Descriptions.Item>
            </Descriptions>
          </div>
        ) : (
          <Alert
            message="Failed to Load Details"
            description="Unable to load policy details. Please try again."
            type="error"
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
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Rule Name">
                {selectedRuleDetails.name}
              </Descriptions.Item>
              <Descriptions.Item label="Type">
                <AntTag color="blue">{selectedRuleDetails.type}</AntTag>
              </Descriptions.Item>
              <Descriptions.Item label="Mode">
                <AntTag color="green">{selectedRuleDetails.mode}</AntTag>
              </Descriptions.Item>
              <Descriptions.Item label="Value List">
                {selectedRuleDetails.value_list || <Text type="secondary">None</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Comment">
                {selectedRuleDetails.comment || <Text type="secondary">No comment</Text>}
              </Descriptions.Item>
            </Descriptions>
          </div>
        ) : (
          <Alert
            message="Failed to Load Details"
            description="Unable to load rule details. Please try again."
            type="error"
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
            disabled={operationLoading === 'loading-rule-details'}
          >
            Update Rule
          </Button>,
        ]}
        width={600}
      >
        {operationLoading === 'loading-rule-details' ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>Loading rule details...</div>
          </div>
        ) : (
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
              label="Network Identifiers"
              required
              help="List of network identifiers (IPs, hosts, etc.)"
            >
              {editRuleForm.value_list.map((value, index) => (
                <div key={index} style={{ display: 'flex', marginBottom: 8 }}>
                  <Input
                    placeholder={getPlaceholderForType(networkRules.find(rule => rule.name === editRuleForm.name)?.type || 'IPV4')}
                    value={value}
                    onChange={(e) => {
                      const newValueList = [...editRuleForm.value_list];
                      newValueList[index] = e.target.value;
                      setEditRuleForm({
                        ...editRuleForm,
                        value_list: newValueList
                      });
                    }}
                    style={{ marginRight: 8 }}
                  />
                  {editRuleForm.value_list.length > 1 && (
                    <Button
                      type="text"
                      danger
                      onClick={() => {
                        const newValueList = editRuleForm.value_list.filter((_, i) => i !== index);
                        setEditRuleForm({
                          ...editRuleForm,
                          value_list: newValueList
                        });
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="dashed"
                onClick={() => setEditRuleForm({
                  ...editRuleForm,
                  value_list: [...editRuleForm.value_list, '']
                })}
                style={{ width: '100%' }}
              >
                Add Network Identifier
              </Button>
            </Form.Item>

            <Form.Item
              label="Comment"
              help="Optional description for the rule"
            >
              <Input
                placeholder="e.g., Allow access from corporate network"
                value={editRuleForm.comment}
                onChange={(e) => setEditRuleForm({
                  ...editRuleForm,
                  comment: e.target.value
                })}
              />
            </Form.Item>
          </Form>
        )}
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
            disabled={operationLoading === 'loading-policy-details'}
          >
            Update Policy
          </Button>,
        ]}
        width={600}
      >
        {operationLoading === 'loading-policy-details' ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>Loading policy details...</div>
          </div>
        ) : (
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
              help="Select network rules that are allowed to be referenced by this policy."
            >
              <Select
                mode="multiple"
                placeholder="Select allowed network rules..."
                value={editPolicyForm.allowed_network_rules}
                onChange={(values) => setEditPolicyForm({
                  ...editPolicyForm,
                  allowed_network_rules: values
                })}
                style={{ width: '100%' }}
                showSearch
                filterOption={(input, option) =>
                  option?.label?.toLowerCase().includes(input.toLowerCase()) ?? false
                }
                options={networkRules.map(rule => ({
                  value: rule.name,
                  label: (
                    <Space>
                      <Text strong>{rule.name}</Text>
                      <AntTag color="blue" style={{ fontSize: '10px' }}>
                        {rule.type}
                      </AntTag>
                      <AntTag color="green" style={{ fontSize: '10px' }}>
                        {rule.mode}
                      </AntTag>
                    </Space>
                  )
                }))}
              />
            </Form.Item>

            <Form.Item
              label="Blocked Network Rules"
              help="Select network rules that are blocked from being referenced by this policy."
            >
              <Select
                mode="multiple"
                placeholder="Select blocked network rules..."
                value={editPolicyForm.blocked_network_rules}
                onChange={(values) => setEditPolicyForm({
                  ...editPolicyForm,
                  blocked_network_rules: values
                })}
                style={{ width: '100%' }}
                showSearch
                filterOption={(input, option) =>
                  option?.label?.toLowerCase().includes(input.toLowerCase()) ?? false
                }
                options={networkRules.map(rule => ({
                  value: rule.name,
                  label: (
                    <Space>
                      <Text strong>{rule.name}</Text>
                      <AntTag color="blue" style={{ fontSize: '10px' }}>
                        {rule.type}
                      </AntTag>
                      <AntTag color="green" style={{ fontSize: '10px' }}>
                        {rule.mode}
                      </AntTag>
                    </Space>
                  )
                }))}
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
        )}
      </Modal>
    </div>
  );
};

export default NetworkManager; 