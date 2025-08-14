import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Typography, Space, message, Checkbox } from 'antd';
import { UserOutlined, LockOutlined, CloudServerOutlined, GlobalOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useTheme } from '../contexts/ThemeContext.tsx';
import { useNavigate, useLocation } from 'react-router-dom';

const { Title, Text } = Typography;

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const { login } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Dynamic colors for dark mode compatibility
  const textColor = isDarkMode ? 'var(--snowflake-dark-gray)' : '#212529';
  const secondaryTextColor = isDarkMode ? 'var(--snowflake-gray)' : '#6C757D';

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  useEffect(() => {
    // Pre-populate fields if they were previously saved
    const savedAccount = localStorage.getItem('snowflake_account');
    const savedUsername = localStorage.getItem('snowflake_username');
    const rememberMe = localStorage.getItem('remember_me') === 'true';
    
    if (savedAccount) {
      form.setFieldsValue({ account: savedAccount });
    }
    
    if (rememberMe && savedUsername) {
      form.setFieldsValue({ 
        account: savedAccount,
        username: savedUsername,
        remember: true
      });
    }
  }, [form]);

  const onFinish = async (values: { account: string; username: string; password: string; remember?: boolean }) => {
    setLoading(true);
    try {
      const success = await login(values.account, values.username, values.password);
      if (success) {
        // Handle remember me functionality
        if (values.remember) {
          localStorage.setItem('snowflake_username', values.username);
          localStorage.setItem('remember_me', 'true');
        } else {
          localStorage.removeItem('snowflake_username');
          localStorage.removeItem('remember_me');
        }
        
        navigate(from, { replace: true });
      }
    } catch (error) {
      message.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, #E8F4FD 0%, #FFFFFF 50%, #E8F4FD 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <Modal
        open={true}
        footer={null}
        closable={false}
        centered
        width={450}
        styles={{
          content: {
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #DEE2E6',
            boxShadow: '0 16px 48px rgba(31, 134, 201, 0.15)',
          },
          header: {
            background: '#FFFFFF',
            borderBottom: 'none',
            paddingBottom: 0,
          },
          body: {
            background: '#FFFFFF',
            padding: '32px',
          }
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
          <div>
            <CloudServerOutlined 
              className="snowflake-logo"
              style={{ 
                fontSize: '64px', 
                color: '#1F86C9', 
                marginBottom: '24px',
              }} 
            />
            <Title level={2} style={{ 
              color: textColor, 
              margin: 0, 
              marginBottom: '8px',
              fontWeight: 600,
              fontSize: '28px'
            }}>
              Snowflake Configuration
            </Title>
            <Text style={{ 
              color: '#6C757D', 
              fontSize: '16px',
              fontWeight: 400
            }}>
              Unified Solution Configuration Manager
            </Text>
          </div>

          <Form
            form={form}
            name="login"
            onFinish={onFinish}
            autoComplete="off"
            layout="vertical"
            style={{ width: '100%', marginTop: '32px' }}
            size="large"
          >
            <Form.Item
              name="account"
              rules={[{ required: true, message: 'Please input your Snowflake account!' }]}
              style={{ marginBottom: '20px' }}
            >
              <Input
                prefix={<GlobalOutlined style={{ color: '#6C757D' }} />}
                placeholder="Snowflake Account (e.g. myorg-myaccount)"
                style={{
                  color: textColor,
                  height: '48px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}
              />
            </Form.Item>

            <Form.Item
              name="username"
              rules={[{ required: true, message: 'Please input your username!' }]}
              style={{ marginBottom: '20px' }}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#6C757D' }} />}
                placeholder="Username"
                style={{
                  color: textColor,
                  height: '48px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please input your password!' }]}
              style={{ marginBottom: '32px' }}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#6C757D' }} />}
                placeholder="Password"
                style={{
                  color: textColor,
                  height: '48px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}
              />
            </Form.Item>

            <Form.Item
              name="remember"
              valuePropName="checked"
              style={{ marginBottom: '20px' }}
            >
              <Checkbox style={{ color: textColor }}>
                Remember my username
              </Checkbox>
            </Form.Item>

            <Form.Item style={{ marginBottom: '24px' }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                className="snowflake-gradient-primary"
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #1F86C9 0%, #0066CC 100%)',
                  borderColor: '#1F86C9',
                  height: '48px',
                  fontSize: '16px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(31, 134, 201, 0.3)',
                  border: 'none'
                }}
              >
                {loading ? 'Signing In...' : 'Sign In to Snowflake'}
              </Button>
            </Form.Item>
          </Form>

          <div style={{ 
            borderTop: '1px solid #DEE2E6', 
            paddingTop: '20px',
            marginTop: '20px',
            background: '#F8F9FA',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <Text style={{ color: secondaryTextColor, fontSize: '14px' }}>
              Database, schema, and warehouse are configured by the backend administrator.
            </Text>
            <br />
            <Text style={{ color: secondaryTextColor, fontSize: '12px', marginTop: '8px', display: 'block' }}>
              Your account is always remembered. Check "Remember username" to save your username for future logins.
            </Text>
            <br />
            <Text style={{ color: secondaryTextColor, fontSize: '12px', marginTop: '8px', display: 'block' }}>
              Powered by Snowflake Data Cloud
            </Text>
          </div>
        </Space>
      </Modal>
    </div>
  );
};

export default Login; 