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
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { api, Tag, CreateTag } from '../services/api.ts';

const { Title, Text } = Typography;

const TagManager: React.FC = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    setLoading(true);
    try {
      const response = await api.getTags();
      setTags(response.data);
    } catch (error) {
      message.error('Failed to load tags');
    } finally {
      setLoading(false);
    }
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
      render: (text: string) => (
        <Space>
          <TagsOutlined style={{ color: '#1F86C9' }} />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
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

        <Table
          columns={columns}
          dataSource={tags}
          loading={loading}
          rowKey="id"
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