import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Space } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const onFinish = async (values) => {
    setLoading(true);
    const success = await login(values.username, values.password);
    setLoading(false);
  };

  return (
    <div className="login-container">
      <Card className="login-form">
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <Title level={2}>Configuration Manager</Title>
          <Text type="secondary">Sign in to manage your configurations</Text>
        </div>
        
        <Form
          name="login"
          initialValues={{
            username: 'admin',
            password: 'password123'
          }}
          onFinish={onFinish}
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Please input your username!' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="Username" 
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              block
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Space direction="vertical" size="small">
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Default Credentials:
            </Text>
            <Text code style={{ fontSize: '12px' }}>
              Username: admin | Password: password123
            </Text>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default Login; 