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
  Card,
  Tooltip,
  Badge,
  Tag as AntTag,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  TagsOutlined,
  SearchOutlined,
  KeyOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { api, Tag, CreateTag, Parameter } from '../services/api.ts';

const { Title, Text } = Typography;

const TagManager: React.FC = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const [tagParameters, setTagParameters] = useState<Record<string, Parameter[]>>({});
  const [loadingParameters, setLoadingParameters] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    setLoading(true);
    try {
      const response = await api.getTags();
      setTags(response.data);
      setFilteredTags(response.data);
    } catch (error) {
      message.error('Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  // Filter tags based on search text
  const handleSearch = (value: string) => {
    setSearchText(value);
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

  const handleCreate = () => {
    form.resetFields();
    setModalVisible(true);
  };

  const handleSave = async (values: CreateTag) => {
    try {
      await api.createTag(values);
      message.success('Tag created successfully');
      setModalVisible(false);
      loadTags();
    } catch (error: any) {
      if (error.response?.status === 400) {
        message.error('Tag name already exists');
      } else {
        message.error(error.response?.data?.detail || 'Failed to create tag');
      }
    }
  };

  const loadParametersForTag = async (tagId: string, tagName: string) => {
    if (tagParameters[tagId]) {
      return; // Already loaded
    }

    setLoadingParameters(prev => ({ ...prev, [tagId]: true }));
    try {
      const response = await api.searchParameters({ tags: [tagName] });
      setTagParameters(prev => ({ ...prev, [tagId]: response.data }));
    } catch (error) {
      message.error('Failed to load parameters for this tag');
    } finally {
      setLoadingParameters(prev => ({ ...prev, [tagId]: false }));
    }
  };

  const handleExpand = async (expanded: boolean, record: Tag) => {
    if (expanded) {
      await loadParametersForTag(record.id, record.name);
      setExpandedRowKeys(prev => [...prev, record.id]);
    } else {
      setExpandedRowKeys(prev => prev.filter(key => key !== record.id));
    }
  };

  const renderExpandedRow = (record: Tag) => {
    const parameters = tagParameters[record.id] || [];
    const isLoading = loadingParameters[record.id];

    if (isLoading) {
      return (
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <Spin size="small" />
          <Text style={{ marginLeft: 8 }}>Loading parameters...</Text>
        </div>
      );
    }

    if (parameters.length === 0) {
      return (
        <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>
          <Text type="secondary">No parameters are using this tag</Text>
        </div>
      );
    }

    return (
      <div style={{ padding: '16px' }}>
        <Text strong style={{ marginBottom: 8, display: 'block' }}>
          Parameters using this tag ({parameters.length}):
        </Text>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {parameters.map(param => (
            <AntTag
              key={param.id}
              icon={param.is_secret ? <LockOutlined /> : <KeyOutlined />}
              color={param.is_secret ? 'orange' : 'blue'}
            >
              {param.name || param.key}
            </AntTag>
          ))}
        </div>
      </div>
    );
  };

  const handleDelete = async (tag: Tag) => {
    // Check if tag is in use by searching for parameters with this tag
    try {
      const parametersWithTag = await api.searchParameters({ tags: [tag.name] });
      if (parametersWithTag.data.length > 0) {
        message.error(`Cannot delete tag "${tag.name}" because it is used by ${parametersWithTag.data.length} parameter(s). Remove the tag from all parameters first.`);
        return;
      }
    } catch (error) {
      message.error('Failed to check tag usage');
      return;
    }

    setDeleteLoading(tag.id);
    try {
      await api.deleteTag(tag.id);
      message.success('Tag deleted successfully');
      loadTags();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to delete tag');
    } finally {
      setDeleteLoading(null);
    }
  };

  const columns = [
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
          <Title level={3} style={{ margin: 0 }}>Tags Management</Title>
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
              onClick={handleCreate}
            >
              Create Tag
            </Button>
          </Space>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search tags by name..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            allowClear
            style={{ maxWidth: 300 }}
          />
        </div>

        <Table
          columns={columns}
          dataSource={filteredTags}
          loading={loading}
          rowKey="id"
          expandable={{
            expandedRowKeys,
            onExpand: handleExpand,
            expandedRowRender: renderExpandedRow,
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

      <Modal
        title="Create Tag"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Form.Item
            name="name"
            label="Tag Name"
            rules={[
              { required: true, message: 'Please enter a tag name' },
              { max: 255, message: 'Tag name cannot exceed 255 characters' },
              { pattern: /^[a-zA-Z0-9_-]+$/, message: 'Tag name can only contain letters, numbers, underscores, and hyphens' },
            ]}
          >
            <Input placeholder="Enter tag name" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Create
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TagManager; 