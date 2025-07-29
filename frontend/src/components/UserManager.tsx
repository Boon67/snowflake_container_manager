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
  Badge,
  Select,
  Switch,
  Tabs,
  Tooltip,
  Tag as AntTag,
  Checkbox,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  UserOutlined,
  LockOutlined,
  KeyOutlined,
  SearchOutlined,
  SafetyOutlined,
  CloudOutlined,
} from '@ant-design/icons';
import { api, User, CreateUser, UpdateUser, PasswordResetRequest } from '../services/api.ts';
import { useTheme } from '../contexts/ThemeContext.tsx';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const UserManager: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [passwordResetModalVisible, setPasswordResetModalVisible] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await api.getUsers();
      setUsers(response.data);
      setFilteredUsers(response.data);
    } catch (error: any) {
      message.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    if (!value.trim()) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(user => {
      const searchLower = value.toLowerCase();
      const usernameMatch = user.username.toLowerCase().includes(searchLower);
      const emailMatch = user.email?.toLowerCase().includes(searchLower);
      const firstNameMatch = user.first_name?.toLowerCase().includes(searchLower);
      const lastNameMatch = user.last_name?.toLowerCase().includes(searchLower);
      const roleMatch = user.role.toLowerCase().includes(searchLower);
      
      return usernameMatch || emailMatch || firstNameMatch || lastNameMatch || roleMatch;
    });
    
    setFilteredUsers(filtered);
  };

  const handleCreate = () => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      is_active: user.is_active,
      is_sso_user: user.is_sso_user,
      sso_provider: user.sso_provider,
      sso_user_id: user.sso_user_id,
      use_snowflake_auth: user.use_snowflake_auth,
    });
    setModalVisible(true);
  };

  const handleSave = async (values: any) => {
    try {
      if (editingUser) {
        // Update existing user
        const updateData: UpdateUser = {
          email: values.email,
          first_name: values.first_name,
          last_name: values.last_name,
          role: values.role,
          is_active: values.is_active,
          is_sso_user: values.is_sso_user,
          sso_provider: values.sso_provider,
          sso_user_id: values.sso_user_id,
          use_snowflake_auth: values.use_snowflake_auth,
        };
        await api.updateUser(editingUser.id, updateData);
        message.success('User updated successfully');
      } else {
        // Create new user
        const createData: CreateUser = {
          username: values.username,
          email: values.email,
          first_name: values.first_name,
          last_name: values.last_name,
          password: values.password,
          role: values.role || 'user',
          is_active: values.is_active !== false,
          is_sso_user: values.is_sso_user || false,
          sso_provider: values.sso_provider,
          sso_user_id: values.sso_user_id,
          use_snowflake_auth: values.use_snowflake_auth || false,
        };
        await api.createUser(createData);
        message.success('User created successfully');
      }
      
      setModalVisible(false);
      loadUsers();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to save user');
    }
  };

  const handleDelete = async (user: User) => {
    setDeleteLoading(user.id);
    try {
      await api.deleteUser(user.id);
      message.success('User deleted successfully');
      loadUsers();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to delete user');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handlePasswordReset = (user: User) => {
    setResetUser(user);
    passwordForm.resetFields();
    setPasswordResetModalVisible(true);
  };

  const handlePasswordResetSave = async (values: any) => {
    if (!resetUser) return;
    
    try {
      await api.adminResetPassword(resetUser.id, values.new_password);
      message.success('Password reset successfully');
      setPasswordResetModalVisible(false);
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to reset password');
    }
  };

  const getAuthTypeTag = (user: User) => {
    if (user.use_snowflake_auth) {
      return <AntTag icon={<CloudOutlined />} color="blue">Snowflake Auth</AntTag>;
    } else if (user.is_sso_user) {
      return <AntTag icon={<SafetyOutlined />} color="green">SSO ({user.sso_provider})</AntTag>;
    } else {
      return <AntTag icon={<LockOutlined />} color="orange">Local Auth</AntTag>;
    }
  };

  const columns = [
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      sorter: (a: User, b: User) => a.username.localeCompare(b.username),
      render: (text: string, record: User) => (
        <Space>
          <UserOutlined style={{ color: '#1F86C9' }} />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: 'Name',
      key: 'name',
      sorter: (a: User, b: User) => {
        const aName = `${a.first_name || ''} ${a.last_name || ''}`.trim();
        const bName = `${b.first_name || ''} ${b.last_name || ''}`.trim();
        return aName.localeCompare(bName);
      },
      render: (_, record: User) => {
        const fullName = `${record.first_name || ''} ${record.last_name || ''}`.trim();
        return fullName || <Text type="secondary">Not specified</Text>;
      },
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      sorter: (a: User, b: User) => (a.email || '').localeCompare(b.email || ''),
      render: (email: string) => email || <Text type="secondary">Not specified</Text>,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      sorter: (a: User, b: User) => a.role.localeCompare(b.role),
      render: (role: string) => (
        <AntTag color={role === 'admin' ? 'red' : 'blue'}>
          {role.toUpperCase()}
        </AntTag>
      ),
    },
    {
      title: 'Auth Type',
      key: 'auth_type',
      render: (_, record: User) => getAuthTypeTag(record),
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      sorter: (a: User, b: User) => Number(b.is_active) - Number(a.is_active),
      render: (isActive: boolean) => (
        <Badge 
          status={isActive ? 'success' : 'error'} 
          text={isActive ? 'Active' : 'Inactive'} 
        />
      ),
    },
    {
      title: 'Last Login',
      dataIndex: 'last_login',
      key: 'last_login',
      sorter: (a: User, b: User) => {
        if (!a.last_login && !b.last_login) return 0;
        if (!a.last_login) return 1;
        if (!b.last_login) return -1;
        return new Date(a.last_login).getTime() - new Date(b.last_login).getTime();
      },
      render: (lastLogin: string) => 
        lastLogin ? new Date(lastLogin).toLocaleDateString() : <Text type="secondary">Never</Text>,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      sorter: (a: User, b: User) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record: User) => (
        <Space>
          <Tooltip title="Edit User">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          
          {!record.is_sso_user && !record.use_snowflake_auth && (
            <Tooltip title="Reset Password">
              <Button
                type="text"
                icon={<KeyOutlined />}
                onClick={() => handlePasswordReset(record)}
              />
            </Tooltip>
          )}
          
          <Popconfirm
            title="Delete User"
            description={`Are you sure you want to delete user "${record.username}"?`}
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
          <Title level={3} style={{ margin: 0 }}>User Management</Title>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadUsers}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              Create User
            </Button>
          </Space>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search users by username, email, name, or role..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            allowClear
            style={{ maxWidth: 400 }}
          />
        </div>

        <Table
          columns={columns}
          dataSource={filteredUsers}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} users`,
          }}
        />
      </Card>

      {/* User Create/Edit Modal */}
      <Modal
        title={editingUser ? 'Edit User' : 'Create User'}
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
                name="username"
                label="Username"
                rules={[
                  { required: true, message: 'Please enter a username' },
                  { max: 255, message: 'Username cannot exceed 255 characters' },
                ]}
              >
                <Input 
                  placeholder="Enter username" 
                  disabled={!!editingUser}
                />
              </Form.Item>

              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { type: 'email', message: 'Please enter a valid email' },
                  { max: 255, message: 'Email cannot exceed 255 characters' },
                ]}
              >
                <Input placeholder="Enter email address" />
              </Form.Item>

              <Space.Compact style={{ display: 'flex', width: '100%' }}>
                <Form.Item
                  name="first_name"
                  label="First Name"
                  style={{ flex: 1, marginRight: 8 }}
                  rules={[
                    { max: 255, message: 'First name cannot exceed 255 characters' },
                  ]}
                >
                  <Input placeholder="First name" />
                </Form.Item>

                <Form.Item
                  name="last_name"
                  label="Last Name"
                  style={{ flex: 1 }}
                  rules={[
                    { max: 255, message: 'Last name cannot exceed 255 characters' },
                  ]}
                >
                  <Input placeholder="Last name" />
                </Form.Item>
              </Space.Compact>

              {!editingUser && (
                <Form.Item
                  name="password"
                  label="Password"
                  rules={[
                    { min: 6, message: 'Password must be at least 6 characters' },
                  ]}
                >
                  <Input.Password placeholder="Enter password (required for local auth)" />
                </Form.Item>
              )}
            </TabPane>

            <TabPane tab="Access & Authentication" key="auth">
              <Form.Item
                name="role"
                label="Role"
                rules={[{ required: true, message: 'Please select a role' }]}
              >
                <Select placeholder="Select user role">
                  <Option value="user">User</Option>
                  <Option value="admin">Admin</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="is_active"
                valuePropName="checked"
                label="Account Status"
              >
                <Checkbox>Account is active</Checkbox>
              </Form.Item>

              <Form.Item
                name="use_snowflake_auth"
                valuePropName="checked"
                label="Snowflake Authentication"
              >
                <Checkbox>Use Snowflake native authentication</Checkbox>
              </Form.Item>

              <Form.Item
                name="is_sso_user"
                valuePropName="checked"
                label="SSO Authentication"
              >
                <Checkbox>User authenticates via SSO</Checkbox>
              </Form.Item>

              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => 
                  prevValues.is_sso_user !== currentValues.is_sso_user
                }
              >
                {({ getFieldValue }) =>
                  getFieldValue('is_sso_user') ? (
                    <>
                      <Form.Item
                        name="sso_provider"
                        label="SSO Provider"
                        rules={[
                          { required: true, message: 'Please enter SSO provider' },
                        ]}
                      >
                        <Input placeholder="e.g., Azure AD, Google, Okta" />
                      </Form.Item>

                      <Form.Item
                        name="sso_user_id"
                        label="SSO User ID"
                        rules={[
                          { required: true, message: 'Please enter SSO user ID' },
                        ]}
                      >
                        <Input placeholder="SSO user identifier" />
                      </Form.Item>
                    </>
                  ) : null
                }
              </Form.Item>
            </TabPane>
          </Tabs>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 24 }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingUser ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Password Reset Modal */}
      <Modal
        title={`Reset Password for ${resetUser?.username}`}
        open={passwordResetModalVisible}
        onCancel={() => setPasswordResetModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handlePasswordResetSave}
        >
          <Form.Item
            name="new_password"
            label="New Password"
            rules={[
              { required: true, message: 'Please enter a new password' },
              { min: 6, message: 'Password must be at least 6 characters' },
            ]}
          >
            <Input.Password placeholder="Enter new password" />
          </Form.Item>

          <Form.Item
            name="confirm_password"
            label="Confirm Password"
            dependencies={['new_password']}
            rules={[
              { required: true, message: 'Please confirm the password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('The two passwords do not match!'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Confirm new password" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 24 }}>
            <Space>
              <Button onClick={() => setPasswordResetModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Reset Password
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManager; 