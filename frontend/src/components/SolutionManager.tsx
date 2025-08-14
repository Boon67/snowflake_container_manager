import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Typography,
  Tooltip,
  Badge,
  Tabs,
  Transfer,
  Tag as AntTag,
  Checkbox,
  Select,
  Dropdown,
  Menu,
  Card,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  SettingOutlined,
  KeyOutlined,
  LockOutlined,
  SearchOutlined,
  DownloadOutlined,
  CopyOutlined,
  StopOutlined,
  PlayCircleOutlined,
  TagsOutlined,
  SolutionOutlined,
} from '@ant-design/icons';
import { 
  api, 
  Solution, 
  CreateSolution, 
  UpdateSolution, 
  Parameter, 
  CreateParameter,
  Tag,
  CreateTag,
  SolutionAPIKeyList,
  SolutionAPIKeyResponse
} from '../services/api.ts';
import { useAuth } from '../contexts/AuthContext.tsx';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;
const { Item: MenuItem } = Menu;


// interface TransferItem {  // Removed - not used
//   key: string;
//   title: string;
//   description?: string;
//   disabled?: boolean;
// }

interface SolutionManagerProps {
  selectedSolutionId?: string | null;
  onNavigateToSolution?: (solutionId: string) => void;
}

const SolutionManager: React.FC<SolutionManagerProps> = ({ selectedSolutionId, onNavigateToSolution }) => {
  const { isAuthenticated } = useAuth();
  
  // Solutions state
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [filteredSolutions, setFilteredSolutions] = useState<Solution[]>([]);
  const [solutionSearchText, setSolutionSearchText] = useState('');
  const [allParameters, setAllParameters] = useState<Parameter[]>([]);
  const [selectedSolutionParams, setSelectedSolutionParams] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSolution, setEditingSolution] = useState<Solution | null>(null);
  const [form] = Form.useForm();
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const [parameterModalVisible, setParameterModalVisible] = useState(false);
  const [parameterForm] = Form.useForm();
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // Parameters state
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [filteredParameters, setFilteredParameters] = useState<Parameter[]>([]);
  const [parameterSearchText, setParameterSearchText] = useState('');

  const [editingParameter, setEditingParameter] = useState<Parameter | null>(null);
  const [parameterFormStandalone] = Form.useForm();
  const [parameterDeleteLoading, setParameterDeleteLoading] = useState<string | null>(null);
  
  // Tags state
  const [tags, setTags] = useState<Tag[]>([]);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [tagSearchText, setTagSearchText] = useState('');

  const [tagDeleteLoading, setTagDeleteLoading] = useState<string | null>(null);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const [tagParameters, setTagParameters] = useState<Record<string, Parameter[]>>({});
  const [loadingParameters, setLoadingParameters] = useState<Record<string, boolean>>({});
  
  // API Key management state
  const [apiKeys, setApiKeys] = useState<SolutionAPIKeyList[]>([]);
  const [apiKeyModalVisible, setApiKeyModalVisible] = useState(false);
  const [apiKeyForm] = Form.useForm();
  const [newApiKey, setNewApiKey] = useState<SolutionAPIKeyResponse | null>(null);
  
  // Tag modal state
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [tagForm] = Form.useForm();

  useEffect(() => {
    if (isAuthenticated) {
      loadSolutions();
      loadAllParameters();
      loadAllTags();
      loadParameters();
      loadTags();
    }
  }, [isAuthenticated]);

  // Handle navigation to specific solution
  useEffect(() => {
    if (selectedSolutionId && solutions.length > 0) {
      const solution = solutions.find(s => s.id === selectedSolutionId);
      if (solution) {
        // Open the solution for editing directly
        setEditingSolution(solution);
        form.setFieldsValue({
          name: solution.name,
          description: solution.description,
        });
        loadSolutionParameters(solution.id);
        setModalVisible(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSolutionId, solutions, form]);

  const loadSolutions = async () => {
    setLoading(true);
    try {
      const response = await api.getSolutions();
      setSolutions(response.data);
      setFilteredSolutions(response.data);
    } catch (error) {
      message.error('Failed to load solutions');
    } finally {
      setLoading(false);
    }
  };

  const loadParameters = async () => {
    try {
      const response = await api.searchParameters({});
      setParameters(response.data);
      setFilteredParameters(response.data);
    } catch (error) {
      message.error('Failed to load parameters');
    }
  };

  const loadTags = async () => {
    try {
      const response = await api.getTags();
      console.log('🏷️ Tags API Response:', response.data);
      const tagsData = Array.isArray(response.data) ? response.data : [];
      setTags(tagsData);
      setFilteredTags(tagsData);
    } catch (error) {
      console.error('❌ Failed to load tags:', error.response?.data || error.message);
      message.error('Failed to load tags');
      setTags([]);
      setFilteredTags([]);
    }
  };

  // Filter solutions based on search text
  const handleSolutionSearch = (value: string) => {
    setSolutionSearchText(value);
    if (!value.trim()) {
      setFilteredSolutions(solutions);
      return;
    }

    const filtered = solutions.filter(solution => {
      const searchLower = value.toLowerCase();
      const nameMatch = solution.name.toLowerCase().includes(searchLower);
      const descMatch = solution.description?.toLowerCase().includes(searchLower);
      const ownerMatch = solution.owner?.toLowerCase().includes(searchLower);
      const emailMatch = solution.email?.toLowerCase().includes(searchLower);
      
      return nameMatch || descMatch || ownerMatch || emailMatch;
    });
    
    setFilteredSolutions(filtered);
  };

  // Filter parameters based on search text
  const handleParameterSearch = (value: string) => {
    setParameterSearchText(value);
    if (!value.trim()) {
      setFilteredParameters(parameters);
      return;
    }

    const filtered = parameters.filter(param => {
      const searchLower = value.toLowerCase();
      const nameMatch = param.name?.toLowerCase().includes(searchLower);
      const keyMatch = param.key.toLowerCase().includes(searchLower);
      const valueMatch = param.value?.toLowerCase().includes(searchLower);
      const descMatch = param.description?.toLowerCase().includes(searchLower);
      const tagMatch = param.tags.some(tag => tag.name.toLowerCase().includes(searchLower));
      
      return nameMatch || keyMatch || valueMatch || descMatch || tagMatch;
    });
    
    setFilteredParameters(filtered);
  };

  // Filter tags based on search text
  const handleTagSearch = (value: string) => {
    setTagSearchText(value);
    if (!value.trim()) {
      setFilteredTags(tags);
      return;
    }

    const filtered = tags.filter(tag => {
      const searchLower = value.toLowerCase();
      return tag.name.toLowerCase().includes(searchLower);
    });
    
    setFilteredTags(filtered);
  };

  const loadAllParameters = async () => {
    try {
      const response = await api.searchParameters({});
      setAllParameters(response.data);
    } catch (error) {
      message.error('Failed to load parameters');
    }
  };

  const loadSolutionParameters = async (solutionId: string) => {
    try {
      const response = await api.searchParameters({ solution_id: solutionId });
      setSelectedSolutionParams(response.data.map(p => p.id));
    } catch (error) {
      message.error('Failed to load solution parameters');
    }
  };

  const loadAllTags = async () => {
    try {
      const response = await api.getTags();
      console.log('🏷️ All Tags API Response:', response.data);
      // Ensure we always set an array
      setAllTags(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('❌ Failed to load all tags:', error.response?.data || error.message);
      message.error('Failed to load tags');
      setAllTags([]); // Set empty array on error
    }
  };

  const handleCreate = () => {
    setEditingSolution(null);
    setSelectedSolutionParams([]);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = async (solution: Solution) => {
    setEditingSolution(solution);
    form.setFieldsValue({
      name: solution.name,
      description: solution.description,
    });
    await loadSolutionParameters(solution.id);
    await loadApiKeys(solution.id);
    setModalVisible(true);
  };

  const handleSave = async (values: CreateSolution | UpdateSolution) => {
    try {
      let solutionId: string;
      
      if (editingSolution) {
        await api.updateSolution(editingSolution.id, values);
        solutionId = editingSolution.id;
        message.success('Solution updated successfully');
      } else {
        const response = await api.createSolution(values as CreateSolution);
        solutionId = response.data.id;
        message.success('Solution created successfully');
      }

      // Handle parameter assignments
      if (editingSolution) {
        // Get current parameters for the solution
        const currentParamsResponse = await api.searchParameters({ solution_id: solutionId });
        const currentParamIds = currentParamsResponse.data.map(p => p.id);
        
        // Remove parameters that are no longer selected
        for (const paramId of currentParamIds) {
          if (!selectedSolutionParams.includes(paramId)) {
            await api.removeParameterFromSolution(solutionId, paramId);
          }
        }
        
        // Add newly selected parameters
        for (const paramId of selectedSolutionParams) {
          if (!currentParamIds.includes(paramId)) {
            await api.assignParameterToSolution(solutionId, paramId);
          }
        }
      } else {
        // For new solutions, assign all selected parameters
        for (const paramId of selectedSolutionParams) {
          await api.assignParameterToSolution(solutionId, paramId);
        }
      }

      setModalVisible(false);
      loadSolutions();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to save solution');
    }
  };

  const handleDelete = async (solution: Solution) => {
    if ((solution.parameter_count || 0) > 0) {
      message.error(`Cannot delete solution "${solution.name}" because it has ${solution.parameter_count || 0} parameters assigned to it. Please remove all parameters first.`);
      return;
    }

    setDeleteLoading(solution.id);
    try {
      await api.deleteSolution(solution.id);
      message.success('Solution deleted successfully');
      loadSolutions();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to delete solution');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleCreateParameter = () => {
    setSelectedTags([]);
    parameterForm.resetFields();
    setParameterModalVisible(true);
  };

  const handleSaveParameter = async (values: any) => {
    try {
      // Convert tag IDs to tag names for the API
      const tagNames = selectedTags.map(tagId => {
        const tag = allTags.find(t => t.id === tagId);
        return tag ? tag.name : tagId;
      });

      const parameterData: CreateParameter = {
        name: values.name,
        key: values.key,
        value: values.value,
        description: values.description || '',
        is_secret: values.is_secret || false,
        tags: tagNames,
      };

      const response = await api.createParameter(parameterData);
      message.success('Parameter created successfully');
      
      // The backend returns the parameter with proper tag objects, so we can use it directly
      const newParameter = response.data;
      
      // Add the new parameter to the available parameters list
      setAllParameters(prev => [...prev, newParameter]);
      
      // Automatically select the new parameter for this solution
      setSelectedSolutionParams(prev => [...prev, response.data.id]);
      
      setParameterModalVisible(false);
      parameterForm.resetFields();
      setSelectedTags([]);
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to create parameter');
    }
  };

  const handleExportSolution = async (solution: Solution, format: string) => {
    try {
      await api.exportSolutionConfig(solution.id, format);
      message.success(`Solution configuration exported as ${format.toUpperCase()}`);
    } catch (error: any) {
      message.error('Failed to export solution configuration');
    }
  };

  const loadApiKeys = async (solutionId: string) => {
    try {
      const response = await api.getSolutionAPIKeys(solutionId);
      setApiKeys(response.data);
    } catch (error: any) {
      message.error('Failed to load API keys');
    }
  };

  const handleCreateApiKey = async (values: any) => {
    if (!editingSolution) return;
    
    try {
      const response = await api.createSolutionAPIKey(editingSolution.id, {
        key_name: values.key_name,
        expires_days: values.expires_days || undefined
      });
      
      setNewApiKey(response.data);
      setApiKeyModalVisible(false);
      apiKeyForm.resetFields();
      await loadApiKeys(editingSolution.id);
      message.success('API key created successfully');
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to create API key');
    }
  };

  const handleDeleteApiKey = async (apiKeyId: string) => {
    if (!editingSolution) return;
    
    try {
      await api.deleteSolutionAPIKey(editingSolution.id, apiKeyId);
      await loadApiKeys(editingSolution.id);
      message.success('API key deleted successfully');
    } catch (error: any) {
      message.error('Failed to delete API key');
    }
  };

  const handleToggleApiKey = async (apiKeyId: string, isActive: boolean) => {
    if (!editingSolution) return;
    
    try {
      await api.toggleSolutionAPIKey(editingSolution.id, apiKeyId, isActive);
      await loadApiKeys(editingSolution.id);
      message.success(`API key ${isActive ? 'enabled' : 'disabled'} successfully`);
    } catch (error: any) {
      message.error('Failed to update API key');
    }
  };

  const copyToClipboard = (text: string, description: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success(`${description} copied to clipboard!`);
    }).catch(() => {
      message.error('Failed to copy to clipboard');
    });
  };

  const renderParameterItem = (param: Parameter) => ({
    key: param.id,
    title: (
      <div>
        <Space>
          {param.is_secret ? <LockOutlined style={{ color: '#faad14' }} /> : <KeyOutlined />}
          <Text strong>{param.key}</Text>
        </Space>
        <div style={{ fontSize: '12px', color: '#666', marginTop: 2 }}>
          {param.description || 'No description'}
        </div>
        <div style={{ marginTop: 4 }}>
          {param.tags.map(tag => (
            <AntTag key={tag.id} size="small" style={{ margin: '1px' }}>
              {tag.name}
            </AntTag>
          ))}
        </div>
      </div>
    ),
  });

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: Solution, b: Solution) => a.name.localeCompare(b.name),
      render: (text: string, record: Solution) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          {record.description && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.description}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Parameters',
      key: 'parameters',
      width: 120,
      sorter: (a: Solution, b: Solution) => (a.parameter_count || 0) - (b.parameter_count || 0),
      render: (_, record: Solution) => (
        <Badge count={record.parameter_count || 0} showZero style={{ backgroundColor: '#1F86C9' }}>
          <SettingOutlined style={{ fontSize: '16px' }} />
        </Badge>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      sorter: (a: Solution, b: Solution) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record: Solution) => {
        const exportMenu = (
          <Menu>
            <MenuItem key="json" onClick={() => handleExportSolution(record, 'json')}>
              <span>JSON Configuration</span>
            </MenuItem>
            <MenuItem key="yaml" onClick={() => handleExportSolution(record, 'yaml')}>
              <span>YAML Configuration</span>
            </MenuItem>
            <MenuItem key="env" onClick={() => handleExportSolution(record, 'env')}>
              <span>Environment Variables</span>
            </MenuItem>
            <MenuItem key="properties" onClick={() => handleExportSolution(record, 'properties')}>
              <span>Java Properties</span>
            </MenuItem>
          </Menu>
        );

        return (
          <Space>
            <Tooltip title="View Details">
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => handleEdit(record)}
              />
            </Tooltip>
            <Tooltip title="Edit">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              />
            </Tooltip>
            <Dropdown overlay={exportMenu} trigger={['click']}>
              <Tooltip title="Download Configuration">
                <Button
                  type="text"
                  icon={<DownloadOutlined />}
                />
              </Tooltip>
            </Dropdown>
            <Popconfirm
              title="Delete Solution"
              description={
                (record.parameter_count || 0) > 0
                  ? `This solution has ${record.parameter_count || 0} parameters. Delete all parameters first.`
                  : 'Are you sure you want to delete this solution?'
              }
              onConfirm={() => handleDelete(record)}
              okText="Yes"
              cancelText="No"
              disabled={(record.parameter_count || 0) > 0}
            >
              <Tooltip 
                title={
                  (record.parameter_count || 0) > 0 
                    ? 'Cannot delete: solution has parameters' 
                    : 'Delete'
                }
              >
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  loading={deleteLoading === record.id}
                  disabled={(record.parameter_count || 0) > 0}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const parameterColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: Parameter, b: Parameter) => (a.name || '').localeCompare(b.name || ''),
      render: (text: string, record: Parameter) => (
        <Text strong style={{ display: 'flex', alignItems: 'center' }}>
          {record.is_secret ? <LockOutlined style={{ marginRight: 4, color: '#faad14' }} /> : <KeyOutlined style={{ marginRight: 4 }} />}
          {text || <Text type="secondary">No name</Text>}
        </Text>
      ),
    },
    {
      title: 'Key',
      dataIndex: 'key',
      key: 'key',
      sorter: (a: Parameter, b: Parameter) => a.key.localeCompare(b.key),
      render: (text: string) => <Text code>{text}</Text>,
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      sorter: (a: Parameter, b: Parameter) => {
        const aValue = a.value || '';
        const bValue = b.value || '';
        return aValue.localeCompare(bValue);
      },
      render: (text: string, record: Parameter) => (
        record.is_secret ? '••••••••' : <Text code>{text || <Text type="secondary">null</Text>}</Text>
      ),
    },
    {
      title: 'Tags',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: Tag[]) => (
        <Space wrap>
          {tags.map(tag => (
            <AntTag key={tag.id} color="blue" style={{ margin: '2px' }}>
              {tag.name}
            </AntTag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => text || <Text type="secondary">No description</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record: Parameter) => (
        <Space>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditParameter(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete Parameter"
            description="Are you sure you want to delete this parameter?"
            onConfirm={() => handleDeleteParameter(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                loading={parameterDeleteLoading === record.id}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tagColumns = [
    {
      title: 'Tag Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: Tag, b: Tag) => a.name.localeCompare(b.name),
      render: (text: string) => (
        <Space>
          <TagsOutlined style={{ color: '#1F86C9' }} />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: 'Parameters',
      key: 'parameters',
      width: 120,
      render: (_, record: Tag) => {
        const parameters = tagParameters[record.id];
        const isLoading = loadingParameters[record.id];
        
        if (isLoading) {
          return <Spin size="small" />;
        }
        
        if (parameters) {
          return (
            <Badge 
              count={parameters.length} 
              style={{ backgroundColor: parameters.length > 0 ? '#52c41a' : '#d9d9d9' }}
            />
          );
        }
        
        return (
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Click to view
          </Text>
        );
      },
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      sorter: (a: Tag, b: Tag) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record: Tag) => (
        <Space>
          <Popconfirm
            title="Delete Tag"
            description="Are you sure you want to delete this tag? This will check if it's in use first."
            onConfirm={() => handleDeleteTag(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                loading={tagDeleteLoading === record.id}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleTagExpand = (expanded: boolean, record: Tag) => {
    if (expanded) {
      setExpandedRowKeys(prev => [...prev, record.id]);
    } else {
      setExpandedRowKeys(prev => prev.filter(key => key !== record.id));
    }
  };

  const renderTagExpandedRow = (record: Tag) => (
    <div style={{ margin: '16px 0' }}>
      <Title level={5} style={{ marginBottom: 12 }}>
        <KeyOutlined style={{ marginRight: 8, color: '#1F86C9' }} />
        Parameters for Tag: {record.name}
      </Title>
      <Table
        dataSource={tagParameters[record.id] || []}
        loading={loadingParameters[record.id]}
        rowKey="id"
        pagination={false}
        columns={parameterColumns}
      />
    </div>
  );

  const handleDeleteParameter = async (parameterId: string) => {
    setParameterDeleteLoading(parameterId);
    try {
      await api.deleteParameter(parameterId);
      message.success('Parameter deleted successfully');
      loadParameters();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to delete parameter');
    } finally {
      setParameterDeleteLoading(null);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    setTagDeleteLoading(tagId);
    try {
      await api.deleteTag(tagId);
      message.success('Tag deleted successfully');
      loadTags();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to delete tag');
    } finally {
      setTagDeleteLoading(null);
    }
  };

  const handleCreateTag = () => {
    tagForm.resetFields();
    setTagModalVisible(true);
  };

  const handleSaveTag = async (values: CreateTag) => {
    try {
      await api.createTag(values);
      message.success('Tag created successfully');
      setTagModalVisible(false);
      tagForm.resetFields();
      loadTags();
      loadAllTags();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to create tag');
    }
  };





  const handleEditParameter = (parameter: Parameter) => {
    setEditingParameter(parameter);
    // Set the selected tags for the parameter
    setSelectedTags(parameter.tags.map(tag => tag.id));
    parameterFormStandalone.setFieldsValue({
      name: parameter.name,
      key: parameter.key,
      value: parameter.value,
      description: parameter.description,
      is_secret: parameter.is_secret,
    });
    setParameterModalVisible(true);
  };

  const handleSaveParameterStandalone = async (values: any) => {
    try {
      // Convert tag IDs to tag names for the API
      const tagNames = selectedTags.map(tagId => {
        const tag = allTags.find(t => t.id === tagId);
        return tag ? tag.name : tagId;
      });

      const parameterData = {
        ...values,
        tags: tagNames,
      };

      if (editingParameter) {
        await api.updateParameter(editingParameter.id, parameterData);
        message.success('Parameter updated successfully');
      } else {
        await api.createParameter(parameterData as CreateParameter);
        message.success('Parameter created successfully');
      }
      setParameterModalVisible(false);
      setEditingParameter(null);
      setSelectedTags([]);
      parameterFormStandalone.resetFields();
      loadParameters();
      loadAllParameters(); // Refresh the all parameters list too
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to save parameter');
    }
  };





  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>
        <SolutionOutlined style={{ marginRight: 8, color: '#1F86C9' }} />
        Solutions Management
      </Title>
      
      <Tabs
        defaultActiveKey="solutions"
        items={[
          {
            key: 'solutions',
            label: (
              <span>
                <SolutionOutlined />
                Solutions
              </span>
            ),
            children: (
              <div>
                <Card>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Title level={3} style={{ margin: 0 }}>Solutions Management</Title>
                    <Space>
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={loadSolutions}
                        loading={loading}
                      >
                        Refresh
                      </Button>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleCreate}
                      >
                        Create Solution
                      </Button>
                    </Space>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <Input
                      placeholder="Search solutions by name, description, owner, or email..."
                      prefix={<SearchOutlined />}
                      value={solutionSearchText}
                      onChange={(e) => handleSolutionSearch(e.target.value)}
                      allowClear
                      style={{ maxWidth: 400 }}
                    />
                  </div>

                  <Table
                    columns={columns}
                    dataSource={filteredSolutions}
                    loading={loading}
                    rowKey="id"
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} solutions`,
                    }}
                  />
                </Card>
              </div>
            ),
          },
          {
            key: 'parameters',
            label: (
              <span>
                <KeyOutlined />
                Parameters
              </span>
            ),
            children: (
              <div>
                <Card>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Title level={3} style={{ margin: 0 }}>Parameters Management</Title>
                    <Space>
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={loadParameters}
                        loading={loading}
                      >
                        Refresh
                      </Button>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                          setEditingParameter(null);
                          setSelectedTags([]);
                          parameterFormStandalone.resetFields();
                          setParameterModalVisible(true);
                        }}
                      >
                        Create Parameter
                      </Button>
                    </Space>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <Input
                      placeholder="Search parameters by name, key, value, description, or tags..."
                      prefix={<SearchOutlined />}
                      value={parameterSearchText}
                      onChange={(e) => handleParameterSearch(e.target.value)}
                      allowClear
                      style={{ maxWidth: 400 }}
                    />
                  </div>

                  <Table
                    columns={parameterColumns}
                    dataSource={filteredParameters}
                    loading={loading}
                    rowKey="id"
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} parameters`,
                    }}
                  />
                </Card>
              </div>
            ),
          },
          {
            key: 'tags',
            label: (
              <span>
                <TagsOutlined />
                Tags
              </span>
            ),
            children: (
              <div>
                <Card>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Title level={3} style={{ margin: 0 }}>Tag Management</Title>
                    <Space>
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={loadTags}
                        loading={loading}
                      >
                        Refresh
                      </Button>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleCreateTag}
                      >
                        Create Tag
                      </Button>
                    </Space>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <Input
                      placeholder="Search tags by name..."
                      prefix={<SearchOutlined />}
                      value={tagSearchText}
                      onChange={(e) => handleTagSearch(e.target.value)}
                      allowClear
                      style={{ maxWidth: 300 }}
                    />
                  </div>

                  <Table
                    columns={tagColumns}
                    dataSource={filteredTags}
                    loading={loading}
                    rowKey="id"
                    expandable={{
                      expandedRowKeys,
                      onExpand: handleTagExpand,
                      expandedRowRender: renderTagExpandedRow,
                      expandRowByClick: true,
                      expandIcon: ({ expanded, onExpand, record }) => 
                        expanded ? (
                          <Button type="text" size="small" onClick={e => onExpand(record, e)}>
                            Hide Parameters
                          </Button>
                        ) : (
                          <Button type="text" size="small" onClick={e => onExpand(record, e)}>
                            Show Parameters
                          </Button>
                        )
                    }}
                    pagination={{
                      pageSize: 15,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} tags`,
                    }}
                  />
                </Card>
              </div>
            ),
          },
        ]}
      />

      <Modal
        title={editingSolution ? 'Edit Solution' : 'Create Solution'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Tabs defaultActiveKey="basic">
            <TabPane tab="Basic Information" key="basic">
              <Form.Item
                name="name"
                label="Solution Name"
                rules={[
                  { required: true, message: 'Please enter a solution name' },
                  { max: 255, message: 'Name cannot exceed 255 characters' },
                ]}
              >
                <Input placeholder="Enter solution name" />
              </Form.Item>

              <Form.Item
                name="description"
                label="Description"
                rules={[
                  { max: 1000, message: 'Description cannot exceed 1000 characters' },
                ]}
              >
                <TextArea
                  rows={4}
                  placeholder="Enter solution description (optional)"
                />
              </Form.Item>
            </TabPane>
            
            <TabPane tab="Parameters" key="parameters">
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <Text type="secondary">
                    Select parameters to associate with this solution. Parameters can be shared across multiple solutions.
                  </Text>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    onClick={handleCreateParameter}
                    size="small"
                  >
                    Create New Parameter
                  </Button>
                </div>
              </div>
              
              <Transfer
                dataSource={allParameters.map(renderParameterItem)}
                targetKeys={selectedSolutionParams}
                onChange={setSelectedSolutionParams}
                render={item => item.title}
                listStyle={{ width: 350, height: 400 }}
                titles={['Available Parameters', 'Assigned Parameters']}
                showSearch
                locale={{
                  itemUnit: 'parameter',
                  itemsUnit: 'parameters',
                  notFoundContent: 'No parameters found',
                }}
              />
            </TabPane>
            
            <TabPane tab="API Keys" key="api-keys">
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <Text type="secondary">
                    Generate API keys for third-party application access to this solution's configuration.
                  </Text>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    onClick={() => setApiKeyModalVisible(true)}
                    size="small"
                  >
                    Generate API Key
                  </Button>
                </div>
              </div>
              
              <Table
                dataSource={apiKeys}
                rowKey="id"
                pagination={false}
                size="small"
                columns={[
                  {
                    title: 'Name',
                    dataIndex: 'key_name',
                    key: 'key_name',
                  },
                  {
                    title: 'API Key',
                    dataIndex: 'api_key_preview',
                    key: 'api_key_preview',
                    render: (preview: string) => (
                      <Text code style={{ fontSize: '12px' }}>{preview}</Text>
                    ),
                  },
                  {
                    title: 'Status',
                    dataIndex: 'is_active',
                    key: 'is_active',
                    render: (isActive: boolean) => (
                      <Badge 
                        status={isActive ? 'success' : 'error'} 
                        text={isActive ? 'Active' : 'Disabled'} 
                      />
                    ),
                  },
                  {
                    title: 'Created',
                    dataIndex: 'created_at',
                    key: 'created_at',
                    render: (date: string) => date ? new Date(date).toLocaleDateString() : '-',
                  },
                  {
                    title: 'Last Used',
                    dataIndex: 'last_used',
                    key: 'last_used',
                    render: (date: string) => date ? new Date(date).toLocaleDateString() : 'Never',
                  },
                  {
                    title: 'Actions',
                    key: 'actions',
                    render: (_, record: SolutionAPIKeyList) => (
                      <Space>
                        <Tooltip title={record.is_active ? 'Disable' : 'Enable'}>
                          <Button
                            type="text"
                            size="small"
                            icon={record.is_active ? <StopOutlined /> : <PlayCircleOutlined />}
                            onClick={() => handleToggleApiKey(record.id, !record.is_active)}
                          />
                        </Tooltip>
                        <Popconfirm
                          title="Delete API Key"
                          description="Are you sure you want to delete this API key? This action cannot be undone."
                          onConfirm={() => handleDeleteApiKey(record.id)}
                          okText="Yes"
                          cancelText="No"
                        >
                          <Tooltip title="Delete">
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                            />
                          </Tooltip>
                        </Popconfirm>
                      </Space>
                    ),
                  },
                ]}
              />
              
              {/* Show copy-paste URLs if there are active API keys */}
              {apiKeys.filter(key => key.is_active).length > 0 && (
                <div style={{ marginTop: 24, padding: 16, backgroundColor: '#f9f9f9', borderRadius: 6 }}>
                  <Title level={5}>Third-Party Access URLs</Title>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                    Use these URLs in your applications to fetch configuration without authentication.
                    <br/>
                    <Text type="warning" strong>Note: Replace "REPLACE_WITH_FULL_API_KEY" with the actual API key from when you created it.</Text>
                  </Text>
                  
                  {apiKeys.filter(key => key.is_active).map(key => (
                    <div key={key.id} style={{ marginBottom: 16 }}>
                      <Text strong>{key.key_name}</Text>
                      {['json', 'yaml', 'env', 'properties'].map(format => {
                        const url = `${window.location.origin}/api/public/solutions/config?api_key=REPLACE_WITH_FULL_API_KEY&format=${format}`;
                        return (
                          <div key={format} style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Text type="secondary" style={{ minWidth: 80 }}>{format.toUpperCase()}:</Text>
                            <Input 
                              size="small"
                              value={url}
                              readOnly
                              style={{ fontSize: '12px' }}
                            />
                            <Tooltip title={`Copy ${format.toUpperCase()} URL`}>
                              <Button
                                type="text"
                                size="small"
                                icon={<CopyOutlined />}
                                onClick={() => copyToClipboard(url, `${format.toUpperCase()} URL`)}
                              />
                            </Tooltip>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  
                  <Text type="warning" style={{ fontSize: '12px', display: 'block', marginTop: 12 }}>
                    ⚠️ Replace "YOUR_FULL_API_KEY" with the actual API key from the generation response.
                  </Text>
                </div>
              )}
            </TabPane>
          </Tabs>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 24 }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingSolution ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Parameter Creation/Edit Modal */}
      <Modal
        title={editingParameter ? 'Edit Parameter' : 'Create New Parameter'}
        open={parameterModalVisible}
        onCancel={() => {
          setParameterModalVisible(false);
          setEditingParameter(null);
          setSelectedTags([]);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={parameterFormStandalone}
          layout="vertical"
          onFinish={handleSaveParameterStandalone}
        >
          <Form.Item
            name="name"
            label="Parameter Name"
            rules={[
              { max: 255, message: 'Name cannot exceed 255 characters' },
            ]}
          >
            <Input placeholder="Enter a friendly name for this parameter (optional)" />
          </Form.Item>

          <Form.Item
            name="key"
            label="Parameter Key"
            rules={[
              { required: true, message: 'Please enter a parameter key' },
              { max: 255, message: 'Key cannot exceed 255 characters' },
            ]}
          >
            <Input placeholder="Enter parameter key (e.g., DATABASE_URL)" />
          </Form.Item>

          <Form.Item
            name="value"
            label="Parameter Value"
            rules={[
              { max: 1000, message: 'Value cannot exceed 1000 characters' },
            ]}
          >
            <Input placeholder="Enter parameter value (optional)" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[
              { max: 1000, message: 'Description cannot exceed 1000 characters' },
            ]}
          >
            <TextArea 
              rows={3} 
              placeholder="Enter parameter description (optional)" 
            />
          </Form.Item>

          <Form.Item
            name="is_secret"
            valuePropName="checked"
            label="Security"
          >
            <Checkbox>Mark as secret parameter</Checkbox>
          </Form.Item>

          <Form.Item label="Tags">
            <Select
              mode="multiple"
              placeholder="Select tags to categorize this parameter"
              value={selectedTags}
              onChange={setSelectedTags}
              style={{ width: '100%' }}
              showSearch
              filterOption={(input, option) =>
                option?.children?.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
              tagRender={(props) => {
                const { label, closable, onClose } = props;
                return (
                  <AntTag
                    color="blue"
                    closable={closable}
                    onClose={onClose}
                    style={{ marginRight: 3, marginBottom: 3 }}
                  >
                    {label}
                  </AntTag>
                );
              }}
            >
              {(allTags || []).map(tag => (
                <Select.Option key={tag.id} value={tag.id}>
                  {tag.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 24 }}>
            <Space>
              <Button onClick={() => setParameterModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingParameter ? 'Update Parameter' : 'Create Parameter'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* API Key Creation Modal */}
      <Modal
        title="Generate API Key"
        open={apiKeyModalVisible}
        onCancel={() => setApiKeyModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={apiKeyForm}
          layout="vertical"
          onFinish={handleCreateApiKey}
        >
          <Form.Item
            name="key_name"
            label="API Key Name"
            rules={[
              { required: true, message: 'Please enter a name for this API key' },
              { max: 255, message: 'Name cannot exceed 255 characters' },
            ]}
          >
            <Input placeholder="Enter a descriptive name (e.g., 'Production App', 'Dev Environment')" />
          </Form.Item>

          <Form.Item
            name="expires_days"
            label="Expiration (Optional)"
            help="Leave empty for a key that never expires"
          >
            <Select placeholder="Select expiration period" allowClear>
              <Select.Option value={30}>30 days</Select.Option>
              <Select.Option value={90}>90 days</Select.Option>
              <Select.Option value={180}>6 months</Select.Option>
              <Select.Option value={365}>1 year</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 24 }}>
            <Space>
              <Button onClick={() => setApiKeyModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Generate API Key
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* New API Key Display Modal */}
      {newApiKey && (
        <Modal
          title="API Key Generated Successfully"
          open={!!newApiKey}
          onCancel={() => setNewApiKey(null)}
          footer={[
            <Button key="close" onClick={() => setNewApiKey(null)}>
              Close
            </Button>
          ]}
          width={700}
        >
          <div style={{ marginBottom: 16 }}>
            <Text type="warning" strong style={{ display: 'block', marginBottom: 12 }}>
              ⚠️ Save this API key now! You won't be able to see it again.
            </Text>
            
            <div style={{ marginBottom: 16 }}>
              <Text strong>API Key Name: </Text>
              <Text>{newApiKey.key_name}</Text>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <Text strong>API Key: </Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Input 
                  value={newApiKey.api_key}
                  readOnly
                  style={{ fontFamily: 'monospace', fontSize: '12px' }}
                />
                <Tooltip title="Copy API Key">
                  <Button
                    icon={<CopyOutlined />}
                    onClick={() => copyToClipboard(newApiKey.api_key, 'API Key')}
                  />
                </Tooltip>
              </div>
            </div>
            
            <div style={{ marginTop: 24, padding: 16, backgroundColor: '#f9f9f9', borderRadius: 6 }}>
              <Title level={5}>Usage Examples</Title>
              <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                Use these URLs to access your solution configuration:
              </Text>
              
              {['json', 'yaml', 'env', 'properties'].map(format => {
                const url = api.generatePublicAPIUrl(newApiKey.api_key, format);
                return (
                  <div key={format} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Text type="secondary" style={{ minWidth: 80 }}>{format.toUpperCase()}:</Text>
                    <Input 
                      size="small"
                      value={url}
                      readOnly
                      style={{ fontSize: '11px' }}
                    />
                    <Tooltip title={`Copy ${format.toUpperCase()} URL`}>
                      <Button
                        type="text"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => copyToClipboard(url, `${format.toUpperCase()} URL`)}
                      />
                    </Tooltip>
                  </div>
                );
              })}
            </div>
          </div>
        </Modal>
      )}

      {/* Tag Creation Modal */}
      <Modal
        title="Create New Tag"
        open={tagModalVisible}
        onCancel={() => setTagModalVisible(false)}
        footer={null}
        width={400}
      >
        <Form
          form={tagForm}
          layout="vertical"
          onFinish={handleSaveTag}
        >
          <Form.Item
            name="name"
            label="Tag Name"
            rules={[
              { required: true, message: 'Please enter a tag name' },
              { max: 255, message: 'Name cannot exceed 255 characters' },
            ]}
          >
            <Input placeholder="Enter tag name" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 24 }}>
            <Space>
              <Button onClick={() => setTagModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Create Tag
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SolutionManager; 