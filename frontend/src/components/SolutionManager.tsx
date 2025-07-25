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
  Tabs,
  Transfer,
  Tag as AntTag,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  SettingOutlined,
  KeyOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { api, Solution, CreateSolution, UpdateSolution, Parameter } from '../services/api.ts';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

interface TransferItem {
  key: string;
  title: string;
  description?: string;
  disabled?: boolean;
}

interface SolutionManagerProps {
  selectedSolutionId?: string | null;
  onNavigateToSolution?: (solutionId: string) => void;
}

const SolutionManager: React.FC<SolutionManagerProps> = ({ selectedSolutionId, onNavigateToSolution }) => {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [allParameters, setAllParameters] = useState<Parameter[]>([]);
  const [selectedSolutionParams, setSelectedSolutionParams] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSolution, setEditingSolution] = useState<Solution | null>(null);
  const [form] = Form.useForm();
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [parameterLoading, setParameterLoading] = useState(false);

  useEffect(() => {
    loadSolutions();
    loadAllParameters();
  }, []);

  // Handle navigation to specific solution
  useEffect(() => {
    if (selectedSolutionId && solutions.length > 0) {
      const solution = solutions.find(s => s.id === selectedSolutionId);
      if (solution) {
        // Open the solution for editing directly
        setEditingSolution(solution);
        form.setFieldsValue({
          name: solution.name,
          description: solution.description,
        });
        loadSolutionParameters(solution.id);
        setModalVisible(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSolutionId, solutions, form]);

  const loadSolutions = async () => {
    setLoading(true);
    try {
      const response = await api.getSolutions();
      setSolutions(response.data);
    } catch (error) {
      message.error('Failed to load solutions');
    } finally {
      setLoading(false);
    }
  };

  const loadAllParameters = async () => {
    try {
      const response = await api.searchParameters({});
      setAllParameters(response.data);
    } catch (error) {
      message.error('Failed to load parameters');
    }
  };

  const loadSolutionParameters = async (solutionId: string) => {
    try {
      const response = await api.searchParameters({ solution_id: solutionId });
      setSelectedSolutionParams(response.data.map(p => p.id));
    } catch (error) {
      message.error('Failed to load solution parameters');
    }
  };

  const handleCreate = () => {
    setEditingSolution(null);
    setSelectedSolutionParams([]);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = async (solution: Solution) => {
    setEditingSolution(solution);
    form.setFieldsValue({
      name: solution.name,
      description: solution.description,
    });
    await loadSolutionParameters(solution.id);
    setModalVisible(true);
  };

  const handleSave = async (values: CreateSolution | UpdateSolution) => {
    try {
      let solutionId: string;
      
      if (editingSolution) {
        await api.updateSolution(editingSolution.id, values);
        solutionId = editingSolution.id;
        message.success('Solution updated successfully');
      } else {
        const response = await api.createSolution(values as CreateSolution);
        solutionId = response.data.id;
        message.success('Solution created successfully');
      }

      // Handle parameter assignments
      if (editingSolution) {
        // Get current parameters for the solution
        const currentParamsResponse = await api.searchParameters({ solution_id: solutionId });
        const currentParamIds = currentParamsResponse.data.map(p => p.id);
        
        // Remove parameters that are no longer selected
        for (const paramId of currentParamIds) {
          if (!selectedSolutionParams.includes(paramId)) {
            await api.removeParameterFromSolution(solutionId, paramId);
          }
        }
        
        // Add newly selected parameters
        for (const paramId of selectedSolutionParams) {
          if (!currentParamIds.includes(paramId)) {
            await api.assignParameterToSolution(solutionId, paramId);
          }
        }
      } else {
        // For new solutions, assign all selected parameters
        for (const paramId of selectedSolutionParams) {
          await api.assignParameterToSolution(solutionId, paramId);
        }
      }

      setModalVisible(false);
      loadSolutions();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to save solution');
    }
  };

  const handleDelete = async (solution: Solution) => {
    if ((solution.parameter_count || 0) > 0) {
      message.error(`Cannot delete solution "${solution.name}" because it has ${solution.parameter_count || 0} parameters assigned to it. Please remove all parameters first.`);
      return;
    }

    setDeleteLoading(solution.id);
    try {
      await api.deleteSolution(solution.id);
      message.success('Solution deleted successfully');
      loadSolutions();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to delete solution');
    } finally {
      setDeleteLoading(null);
    }
  };

  const renderParameterItem = (param: Parameter) => ({
    key: param.id,
    title: (
      <div>
        <Space>
          {param.is_secret ? <LockOutlined style={{ color: '#faad14' }} /> : <KeyOutlined />}
          <Text strong>{param.key}</Text>
        </Space>
        <div style={{ fontSize: '12px', color: '#666', marginTop: 2 }}>
          {param.description || 'No description'}
        </div>
        <div style={{ marginTop: 4 }}>
          {param.tags.map(tag => (
            <AntTag key={tag.id} size="small" style={{ margin: '1px' }}>
              {tag.name}
            </AntTag>
          ))}
        </div>
      </div>
    ),
  });

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Solution) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          {record.description && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.description}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Parameters',
      key: 'parameters',
      width: 120,
      render: (_, record: Solution) => (
        <Badge count={record.parameter_count || 0} showZero style={{ backgroundColor: '#1F86C9' }}>
          <SettingOutlined style={{ fontSize: '16px' }} />
        </Badge>
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
      width: 150,
      render: (_, record: Solution) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete Solution"
            description={
              (record.parameter_count || 0) > 0
                ? `This solution has ${record.parameter_count || 0} parameters. Delete all parameters first.`
                : 'Are you sure you want to delete this solution?'
            }
            onConfirm={() => handleDelete(record)}
            okText="Yes"
            cancelText="No"
            disabled={(record.parameter_count || 0) > 0}
          >
            <Tooltip 
              title={
                (record.parameter_count || 0) > 0 
                  ? 'Cannot delete: solution has parameters' 
                  : 'Delete'
              }
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                loading={deleteLoading === record.id}
                disabled={(record.parameter_count || 0) > 0}
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
          <Title level={3} style={{ margin: 0 }}>Solutions Management</Title>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadSolutions}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              Create Solution
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={solutions}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} solutions`,
          }}
        />
      </Card>

      <Modal
        title={editingSolution ? 'Edit Solution' : 'Create Solution'}
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
                name="name"
                label="Solution Name"
                rules={[
                  { required: true, message: 'Please enter a solution name' },
                  { max: 255, message: 'Name cannot exceed 255 characters' },
                ]}
              >
                <Input placeholder="Enter solution name" />
              </Form.Item>

              <Form.Item
                name="description"
                label="Description"
                rules={[
                  { max: 1000, message: 'Description cannot exceed 1000 characters' },
                ]}
              >
                <TextArea
                  rows={4}
                  placeholder="Enter solution description (optional)"
                />
              </Form.Item>
            </TabPane>
            
            <TabPane tab="Parameters" key="parameters">
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary">
                  Select parameters to associate with this solution. Parameters can be shared across multiple solutions.
                </Text>
              </div>
              
              <Transfer
                dataSource={allParameters.map(renderParameterItem)}
                targetKeys={selectedSolutionParams}
                onChange={setSelectedSolutionParams}
                render={item => item.title}
                listStyle={{ width: 350, height: 400 }}
                titles={['Available Parameters', 'Assigned Parameters']}
                showSearch
                locale={{
                  itemUnit: 'parameter',
                  itemsUnit: 'parameters',
                  notFoundContent: 'No parameters found',
                }}
              />
            </TabPane>
          </Tabs>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 24 }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingSolution ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SolutionManager; 