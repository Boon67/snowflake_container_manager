import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Popconfirm,
  Typography,
  Card,
  Tag as AntTag,
  Tooltip,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  KeyOutlined,
  LockOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { api, Parameter, CreateParameter, UpdateParameter, Solution, Tag } from '../services/api.ts';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const ParameterManager: React.FC = () => {
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [filteredParameters, setFilteredParameters] = useState<Parameter[]>([]);
  const [searchText, setSearchText] = useState('');
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingParameter, setEditingParameter] = useState<Parameter | null>(null);
  const [form] = Form.useForm();
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [parametersRes, tagsRes] = await Promise.all([
        api.searchParameters({}),
        api.getTags(),
      ]);
      setParameters(parametersRes.data);
      setFilteredParameters(parametersRes.data);
      setTags(tagsRes.data);
    } catch (error) {
      message.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Filter parameters based on search text
  const handleSearch = (value: string) => {
    setSearchText(value);
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

  const handleCreate = () => {
    setEditingParameter(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (parameter: Parameter) => {
    setEditingParameter(parameter);
    form.setFieldsValue({
      name: parameter.name,
      key: parameter.key,
      value: parameter.value,
      description: parameter.description,
      is_secret: parameter.is_secret,
      tags: parameter.tags.map(tag => tag.name),
    });
    setModalVisible(true);
  };

  const handleSave = async (values: any) => {
    try {
      const parameterData = {
        ...values,
        tags: values.tags || [],
      };

      if (editingParameter) {
        await api.updateParameter(editingParameter.id, parameterData);
        message.success('Parameter updated successfully');
      } else {
        await api.createParameter(parameterData as CreateParameter);
        message.success('Parameter created successfully');
      }
      setModalVisible(false);
      loadInitialData();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to save parameter');
    }
  };

  const handleDelete = async (parameter: Parameter) => {
    setDeleteLoading(parameter.id);
    try {
      await api.deleteParameter(parameter.id);
      message.success('Parameter deleted successfully');
      loadInitialData();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to delete parameter');
    } finally {
      setDeleteLoading(null);
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: Parameter, b: Parameter) => {
        const aName = a.name || '';
        const bName = b.name || '';
        return aName.localeCompare(bName);
      },
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
      sorter: (a: Parameter, b: Parameter) => {
        // Sort by first tag name alphabetically, then by number of tags
        const aFirstTag = a.tags && a.tags.length > 0 ? a.tags[0].name : '';
        const bFirstTag = b.tags && b.tags.length > 0 ? b.tags[0].name : '';
        
        // If both have tags, compare by first tag name
        if (aFirstTag && bFirstTag) {
          return aFirstTag.localeCompare(bFirstTag);
        }
        
        // If only one has tags, prioritize the one with tags
        if (aFirstTag && !bFirstTag) return -1;
        if (!aFirstTag && bFirstTag) return 1;
        
        // If neither has tags, they're equal
        return 0;
      },
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
      sorter: (a: Parameter, b: Parameter) => {
        const aDesc = a.description || '';
        const bDesc = b.description || '';
        return aDesc.localeCompare(bDesc);
      },
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
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete Parameter"
            description="Are you sure you want to delete this parameter?"
            onConfirm={() => handleDelete(record)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                loading={deleteLoading === record.id}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0 }}>Parameters Management</Title>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadInitialData}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              Create Parameter
            </Button>
          </Space>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search parameters by name, key, value, description, or tags..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            allowClear
            style={{ maxWidth: 400 }}
          />
        </div>

        <Table
          columns={columns}
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

      <Modal
        title={editingParameter ? 'Edit Parameter' : 'Create Parameter'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Form.Item
            name="name"
            label="Parameter Name"
            rules={[
              { required: true, message: 'Please enter a parameter name' },
              { max: 255, message: 'Name cannot exceed 255 characters' },
            ]}
          >
            <Input placeholder="Enter parameter name" />
          </Form.Item>

          <Form.Item
            name="key"
            label="Parameter Key"
            rules={[
              { required: true, message: 'Please enter a parameter key' },
              { max: 255, message: 'Key cannot exceed 255 characters' },
            ]}
          >
            <Input placeholder="Enter parameter key" />
          </Form.Item>

          <Form.Item
            name="value"
            label="Parameter Value"
          >
            <TextArea
              rows={3}
              placeholder="Enter parameter value"
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[
              { max: 1000, message: 'Description cannot exceed 1000 characters' },
            ]}
          >
            <TextArea
              rows={2}
              placeholder="Enter parameter description (optional)"
            />
          </Form.Item>

          <Form.Item
            name="is_secret"
            label="Secret Parameter"
            valuePropName="checked"
            extra="Secret parameters will have their values hidden in the UI"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="tags"
            label="Tags"
          >
            <Select
              mode="tags"
              placeholder="Select or create tags"
              style={{ width: '100%' }}
            >
              {tags.map(tag => (
                <Option key={tag.id} value={tag.name}>
                  {tag.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingParameter ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ParameterManager; 