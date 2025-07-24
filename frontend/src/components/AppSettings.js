import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Select, 
  message, 
  Popconfirm, 
  Typography,
  Card,
  Space,
  Tag
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { api } from '../services/api';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const AppSettings = () => {
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
      const response = await api.getAppSettings();
      setSettings(response.data);
    } catch (error) {
      message.error('Failed to load application settings');
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
      await api.deleteAppSetting(id);
      message.success('Setting deleted successfully');
      loadSettings();
    } catch (error) {
      message.error('Failed to delete setting');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingRecord) {
        await api.updateAppSetting(editingRecord.id, values);
        message.success('Setting updated successfully');
      } else {
        await api.createAppSetting(values);
        message.success('Setting created successfully');
      }
      
      setModalVisible(false);
      loadSettings();
    } catch (error) {
      if (error.response) {
        message.error('Failed to save setting');
      }
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    form.resetFields();
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'string': return 'blue';
      case 'number': return 'green';
      case 'boolean': return 'orange';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: 'Configuration Key',
      dataIndex: 'config_key',
      key: 'config_key',
      sorter: (a, b) => a.config_key.localeCompare(b.config_key),
    },
    {
      title: 'Value',
      dataIndex: 'config_value',
      key: 'config_value',
      render: (value) => value || <span style={{ color: '#ccc' }}>Not set</span>
    },
    {
      title: 'Type',
      dataIndex: 'config_type',
      key: 'config_type',
      render: (type) => <Tag color={getTypeColor(type)}>{type}</Tag>
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
            title="Are you sure you want to delete this setting?"
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
        <Title level={3}>Application Settings</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleAdd}
        >
          Add Setting
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
        title={editingRecord ? 'Edit Application Setting' : 'Add Application Setting'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ config_type: 'string' }}
        >
          <Form.Item
            name="config_key"
            label="Configuration Key"
            rules={[
              { required: true, message: 'Please input the configuration key!' },
              { pattern: /^[A-Z_][A-Z0-9_]*$/, message: 'Key must be uppercase with underscores only!' }
            ]}
          >
            <Input placeholder="e.g., APP_NAME, MAX_UPLOAD_SIZE" />
          </Form.Item>

          <Form.Item
            name="config_value"
            label="Configuration Value"
          >
            <Input placeholder="Enter the configuration value" />
          </Form.Item>

          <Form.Item
            name="config_type"
            label="Value Type"
            rules={[{ required: true, message: 'Please select the value type!' }]}
          >
            <Select>
              <Option value="string">String</Option>
              <Option value="number">Number</Option>
              <Option value="boolean">Boolean</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea 
              rows={3} 
              placeholder="Describe what this configuration does"
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default AppSettings; 