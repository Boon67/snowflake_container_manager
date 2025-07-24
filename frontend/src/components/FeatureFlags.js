import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Select,
  Slider,
  Switch,
  message, 
  Popconfirm, 
  Typography,
  Card,
  Space,
  Tag,
  Progress
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FlagOutlined } from '@ant-design/icons';
import { api } from '../services/api';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const FeatureFlags = () => {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadFlags();
  }, []);

  const loadFlags = async () => {
    setLoading(true);
    try {
      const response = await api.getFeatureFlags();
      setFlags(response.data);
    } catch (error) {
      message.error('Failed to load feature flags');
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
      await api.deleteFeatureFlag(id);
      message.success('Feature flag deleted successfully');
      loadFlags();
    } catch (error) {
      message.error('Failed to delete feature flag');
    }
  };

  const handleToggle = async (record) => {
    try {
      await api.updateFeatureFlag(record.id, { enabled: !record.enabled });
      message.success(`Feature flag ${record.enabled ? 'disabled' : 'enabled'}`);
      loadFlags();
    } catch (error) {
      message.error('Failed to toggle feature flag');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingRecord) {
        await api.updateFeatureFlag(editingRecord.id, values);
        message.success('Feature flag updated successfully');
      } else {
        await api.createFeatureFlag(values);
        message.success('Feature flag created successfully');
      }
      
      setModalVisible(false);
      loadFlags();
    } catch (error) {
      if (error.response) {
        message.error('Failed to save feature flag');
      }
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    form.resetFields();
  };

  const getEnvironmentColor = (env) => {
    switch (env) {
      case 'production': return 'red';
      case 'staging': return 'orange';
      case 'development': return 'blue';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: 'Feature Name',
      dataIndex: 'feature_name',
      key: 'feature_name',
      sorter: (a, b) => a.feature_name.localeCompare(b.feature_name),
      render: (name) => (
        <Space>
          <FlagOutlined />
          {name}
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled, record) => (
        <Switch 
          checked={enabled} 
          onChange={() => handleToggle(record)}
          size="small"
        />
      )
    },
    {
      title: 'Rollout',
      dataIndex: 'rollout_percentage',
      key: 'rollout_percentage',
      render: (percentage) => (
        <div style={{ width: 100 }}>
          <Progress 
            percent={percentage} 
            size="small" 
            format={(percent) => `${percent}%`}
          />
        </div>
      )
    },
    {
      title: 'Environment',
      dataIndex: 'environment',
      key: 'environment',
      render: (env) => (
        <Tag color={getEnvironmentColor(env)}>
          {env.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
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
            title="Are you sure you want to delete this feature flag?"
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
        <Title level={3}>Feature Flags</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleAdd}
        >
          Add Feature Flag
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={flags}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
      />

      <Modal
        title={editingRecord ? 'Edit Feature Flag' : 'Add Feature Flag'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ 
            enabled: false, 
            rollout_percentage: 0,
            environment: 'development' 
          }}
        >
          <Form.Item
            name="feature_name"
            label="Feature Name"
            rules={[
              { required: true, message: 'Please input the feature name!' },
              { pattern: /^[A-Z_][A-Z0-9_]*$/, message: 'Feature name must be uppercase with underscores only!' }
            ]}
          >
            <Input placeholder="e.g., NEW_DASHBOARD, ADVANCED_SEARCH" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[
              { required: true, message: 'Please input a description!' }
            ]}
          >
            <TextArea 
              rows={3} 
              placeholder="Describe what this feature does"
            />
          </Form.Item>

          <Form.Item
            name="environment"
            label="Environment"
            rules={[
              { required: true, message: 'Please select an environment!' }
            ]}
          >
            <Select>
              <Option value="development">Development</Option>
              <Option value="staging">Staging</Option>
              <Option value="production">Production</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="rollout_percentage"
            label="Rollout Percentage"
          >
            <Slider
              min={0}
              max={100}
              marks={{
                0: '0%',
                25: '25%',
                50: '50%',
                75: '75%',
                100: '100%'
              }}
            />
          </Form.Item>

          <Form.Item
            name="enabled"
            label="Enabled"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default FeatureFlags; 