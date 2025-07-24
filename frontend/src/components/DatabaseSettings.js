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
import { PlusOutlined, EditOutlined, DeleteOutlined, DatabaseOutlined } from '@ant-design/icons';
import { api } from '../services/api';

const { Title } = Typography;
const { TextArea } = Input;

const DatabaseSettings = () => {
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
      const response = await api.getDatabaseSettings();
      setSettings(response.data);
    } catch (error) {
      message.error('Failed to load database settings');
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
      await api.deleteDatabaseSetting(id);
      message.success('Database setting deleted successfully');
      loadSettings();
    } catch (error) {
      message.error('Failed to delete database setting');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingRecord) {
        await api.updateDatabaseSetting(editingRecord.id, values);
        message.success('Database setting updated successfully');
      } else {
        await api.createDatabaseSetting(values);
        message.success('Database setting created successfully');
      }
      
      setModalVisible(false);
      loadSettings();
    } catch (error) {
      if (error.response) {
        message.error('Failed to save database setting');
      }
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    form.resetFields();
  };

  const columns = [
    {
      title: 'Connection Name',
      dataIndex: 'connection_name',
      key: 'connection_name',
      sorter: (a, b) => a.connection_name.localeCompare(b.connection_name),
      render: (name) => (
        <Space>
          <DatabaseOutlined />
          {name}
        </Space>
      )
    },
    {
      title: 'Host',
      dataIndex: 'host',
      key: 'host',
    },
    {
      title: 'Port',
      dataIndex: 'port',
      key: 'port',
    },
    {
      title: 'Database',
      dataIndex: 'database_name',
      key: 'database_name',
    },
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
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
            title="Are you sure you want to delete this database setting?"
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
        <Title level={3}>Database Settings</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleAdd}
        >
          Add Database Connection
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
        title={editingRecord ? 'Edit Database Setting' : 'Add Database Setting'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ active: true, port: 5432 }}
        >
          <Form.Item
            name="connection_name"
            label="Connection Name"
            rules={[
              { required: true, message: 'Please input the connection name!' }
            ]}
          >
            <Input placeholder="e.g., production_db, staging_db" />
          </Form.Item>

          <Form.Item
            name="host"
            label="Host"
            rules={[
              { required: true, message: 'Please input the database host!' }
            ]}
          >
            <Input placeholder="e.g., localhost, db.example.com" />
          </Form.Item>

          <Form.Item
            name="port"
            label="Port"
            rules={[
              { required: true, message: 'Please input the port number!' }
            ]}
          >
            <InputNumber 
              min={1} 
              max={65535} 
              style={{ width: '100%' }}
              placeholder="e.g., 5432, 3306"
            />
          </Form.Item>

          <Form.Item
            name="database_name"
            label="Database Name"
            rules={[
              { required: true, message: 'Please input the database name!' }
            ]}
          >
            <Input placeholder="e.g., myapp, production" />
          </Form.Item>

          <Form.Item
            name="username"
            label="Username"
            rules={[
              { required: true, message: 'Please input the username!' }
            ]}
          >
            <Input placeholder="Database username" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
          >
            <Input.Password placeholder="Database password" />
          </Form.Item>

          <Form.Item
            name="additional_params"
            label="Additional Parameters"
          >
            <TextArea 
              rows={3} 
              placeholder="Additional connection parameters (JSON format)"
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

export default DatabaseSettings; 