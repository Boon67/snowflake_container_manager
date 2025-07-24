import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  InputNumber,
  Switch,
  message, 
  Popconfirm, 
  Typography,
  Card,
  Space,
  Tag
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ApiOutlined } from '@ant-design/icons';
import { api } from '../services/api';

const { Title } = Typography;

const ApiSettings = () => {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await api.getApiSettings();
      setSettings(response.data);
    } catch (error) {
      message.error('Failed to load API settings');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteApiSetting(id);
      message.success('API setting deleted successfully');
      loadSettings();
    } catch (error) {
      message.error('Failed to delete API setting');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingRecord) {
        await api.updateApiSetting(editingRecord.id, values);
        message.success('API setting updated successfully');
      } else {
        await api.createApiSetting(values);
        message.success('API setting created successfully');
      }
      
      setModalVisible(false);
      loadSettings();
    } catch (error) {
      if (error.response) {
        message.error('Failed to save API setting');
      }
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    form.resetFields();
  };

  const columns = [
    {
      title: 'API Name',
      dataIndex: 'api_name',
      key: 'api_name',
      sorter: (a, b) => a.api_name.localeCompare(b.api_name),
      render: (name) => (
        <Space>
          <ApiOutlined />
          {name}
        </Space>
      )
    },
    {
      title: 'Endpoint URL',
      dataIndex: 'endpoint_url',
      key: 'endpoint_url',
      ellipsis: true,
    },
    {
      title: 'Timeout (sec)',
      dataIndex: 'timeout_seconds',
      key: 'timeout_seconds',
    },
    {
      title: 'Rate Limit',
      dataIndex: 'rate_limit',
      key: 'rate_limit',
      render: (limit) => limit ? `${limit}/min` : 'Unlimited'
    },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
      render: (active) => (
        <Tag color={active ? 'green' : 'red'}>
          {active ? 'Active' : 'Inactive'}
        </Tag>
      )
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => date ? new Date(date).toLocaleDateString() : '-'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            icon={<EditOutlined />} 
            size="small" 
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Are you sure you want to delete this API setting?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button 
              icon={<DeleteOutlined />} 
              size="small" 
              danger
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Title level={3}>API Settings</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleAdd}
        >
          Add API Configuration
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={settings}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
      />

      <Modal
        title={editingRecord ? 'Edit API Setting' : 'Add API Setting'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ active: true, timeout_seconds: 30 }}
        >
          <Form.Item
            name="api_name"
            label="API Name"
            rules={[
              { required: true, message: 'Please input the API name!' }
            ]}
          >
            <Input placeholder="e.g., payment_gateway, email_service" />
          </Form.Item>

          <Form.Item
            name="endpoint_url"
            label="Endpoint URL"
            rules={[
              { required: true, message: 'Please input the endpoint URL!' },
              { type: 'url', message: 'Please enter a valid URL!' }
            ]}
          >
            <Input placeholder="https://api.example.com/v1" />
          </Form.Item>

          <Form.Item
            name="api_key"
            label="API Key"
          >
            <Input.Password placeholder="API authentication key" />
          </Form.Item>

          <Form.Item
            name="timeout_seconds"
            label="Timeout (seconds)"
            rules={[
              { required: true, message: 'Please input the timeout!' }
            ]}
          >
            <InputNumber 
              min={1} 
              max={300} 
              style={{ width: '100%' }}
              placeholder="Request timeout in seconds"
            />
          </Form.Item>

          <Form.Item
            name="rate_limit"
            label="Rate Limit (requests per minute)"
          >
            <InputNumber 
              min={1} 
              max={10000} 
              style={{ width: '100%' }}
              placeholder="Leave empty for unlimited"
            />
          </Form.Item>

          <Form.Item
            name="active"
            label="Active"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default ApiSettings; 