import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Select,
  DatePicker,
  Button,
  Typography,
  Statistic,
  Space,
  Spin,
  message,
  Empty,
  Tooltip,
  Tabs,
} from 'antd';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  BarChartOutlined,
  ReloadOutlined,
  FilterOutlined,
  DollarOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';
import { api, CreditUsage, CreditUsageFilter, CreditUsageSummary, StorageUsage, DatabaseStorageUsage, StorageUsageSummary } from '../services/api.ts';
import { useTheme } from '../contexts/ThemeContext.tsx';
import dayjs, { Dayjs } from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// Color palette for different compute pools
const COLORS = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
];

const Analytics: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [creditUsage, setCreditUsage] = useState<CreditUsage[]>([]);
  const [warehouseUsage, setWarehouseUsage] = useState<any[]>([]);
  const [summary, setSummary] = useState<CreditUsageSummary | null>(null);
  const [warehouseSummary, setWarehouseSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [warehouseLoading, setWarehouseLoading] = useState(false);
  const [periodType, setPeriodType] = useState<string>('monthly');
  
  // Default to current year date range (Jan 1 to current day)
  const currentYearStart = dayjs().startOf('year');
  const currentDay = dayjs();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>([currentYearStart, currentDay]);
  
  const [selectedPools, setSelectedPools] = useState<string[]>([]);
  const [availablePools, setAvailablePools] = useState<string[]>([]);
  const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([]);
  const [availableWarehouses, setAvailableWarehouses] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>('compute-pools');

  // Storage state
  const [storageUsage, setStorageUsage] = useState<StorageUsage[]>([]);
  const [databaseStorageUsage, setDatabaseStorageUsage] = useState<DatabaseStorageUsage[]>([]);
  const [storageSummary, setStorageSummary] = useState<StorageUsageSummary | null>(null);
  const [storageLoading, setStorageLoading] = useState(false);
  const [selectedDatabases, setSelectedDatabases] = useState<string[]>([]);
  const [availableDatabases, setAvailableDatabases] = useState<string[]>([]);

  useEffect(() => {
    loadCreditUsage();
  }, [periodType, dateRange, selectedPools]);

  // Load warehouse data independently
  useEffect(() => {
    loadWarehouseUsage();
  }, [periodType, dateRange, selectedWarehouses]);

  // Load storage data independently
  useEffect(() => {
    loadStorageUsage();
  }, [periodType, dateRange, selectedDatabases]);

  const loadCreditUsage = async () => {
    setLoading(true);
    try {
      const filter: CreditUsageFilter = {
        period_type: periodType,
        start_date: dateRange?.[0]?.toISOString(),
        end_date: dateRange?.[1]?.toISOString(),
        compute_pool_names: selectedPools.length > 0 ? selectedPools : undefined,
      };

      const [usageResponse, summaryResponse] = await Promise.all([
        api.getCreditUsage(filter),
        api.getCreditUsageSummary(filter),
      ]);

      setCreditUsage(usageResponse.data);
      setSummary(summaryResponse.data.data); // Extract nested data from {success: true, data: {...}}

      // Extract unique pool names for filtering
      const pools = [...new Set(usageResponse.data.map(item => item.compute_pool_name))];
      setAvailablePools(pools);

    } catch (error: any) {
      message.error('Failed to load credit usage data');
    } finally {
      setLoading(false);
    }
  };

  const loadWarehouseUsage = async () => {
    setWarehouseLoading(true);
    try {
      const filter: CreditUsageFilter = {
        period_type: periodType,
        start_date: dateRange?.[0]?.toISOString(),
        end_date: dateRange?.[1]?.toISOString(),
        compute_pool_names: selectedWarehouses.length > 0 ? selectedWarehouses : undefined, // Reuse field for warehouse names
      };

      const [warehouseResponse, warehouseSummaryResponse] = await Promise.all([
        api.getWarehouseCreditUsage(filter),
        api.getWarehouseCreditUsageSummary(filter),
      ]);

      setWarehouseUsage(warehouseResponse.data);
      setWarehouseSummary(warehouseSummaryResponse.data.data); // Extract nested data from {success: true, data: {...}}
      
      // Extract unique warehouse names for filtering
      const warehouses = [...new Set(warehouseResponse.data.map(item => item.warehouse_name))];
      setAvailableWarehouses(warehouses);

    } catch (error: any) {
      message.error('Failed to load warehouse usage data');
    } finally {
      setWarehouseLoading(false);
    }
  };

  const loadStorageUsage = async () => {
    setStorageLoading(true);
    try {
      const filter: CreditUsageFilter = {
        period_type: periodType,
        start_date: dateRange?.[0]?.toISOString(),
        end_date: dateRange?.[1]?.toISOString(),
        compute_pool_names: selectedDatabases.length > 0 ? selectedDatabases : undefined, // Reuse field for database names
      };

      const [storageResponse, databaseStorageResponse, storageSummaryResponse] = await Promise.all([
        api.getStorageUsage(filter),
        api.getDatabaseStorageUsage(filter),
        api.getStorageUsageSummary(filter),
      ]);

      setStorageUsage(storageResponse.data.data); // Extract nested data from {success: true, data: [...]}
      setDatabaseStorageUsage(databaseStorageResponse.data.data); // Extract nested data from {success: true, data: [...]}
      setStorageSummary(storageSummaryResponse.data.data); // Extract nested data from {success: true, data: {...}}
      
      // Extract unique database names for filtering
      const databases = [...new Set(databaseStorageResponse.data.data.map(item => item.database_name))];
      setAvailableDatabases(databases);

    } catch (error: any) {
      message.error('Failed to load storage usage data');
    } finally {
      setStorageLoading(false);
    }
  };

  const handleRefresh = () => {
    loadCreditUsage();
    loadWarehouseUsage();
    loadStorageUsage();
  };

  const handlePeriodChange = (value: string) => {
    setPeriodType(value);
  };

  const handleDateRangeChange = (dates: [Dayjs, Dayjs] | null) => {
    setDateRange(dates);
  };

  const handlePoolsChange = (values: string[]) => {
    setSelectedPools(values);
  };

  const handleWarehousesChange = (values: string[]) => {
    setSelectedWarehouses(values);
  };

  const handleDatabasesChange = (values: string[]) => {
    setSelectedDatabases(values);
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  // Generate date range text for chart titles
  const getDateRangeText = () => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      return '';
    }
    const startDate = dayjs(dateRange[0]).format('MMM DD, YYYY');
    const endDate = dayjs(dateRange[1]).format('MMM DD, YYYY');
    return ` (${startDate} - ${endDate})`;
  };

  // Prepare data for compute pools time series chart
  const prepareComputePoolTimeSeriesData = () => {
    const groupedData: Record<string, any> = {};
    
    // Determine date format and aggregation based on period
    let dateFormat = 'YYYY-MM-DD';
    let displayFormat = 'MMM DD';
    
    if (periodType === 'weekly') {
      dateFormat = 'YYYY-[W]WW';
      displayFormat = '[Week] WW';
    } else if (periodType === 'monthly') {
      dateFormat = 'YYYY-MM';
      displayFormat = 'MMM YYYY';
    }
    
    creditUsage.forEach(item => {
      const dateKey = dayjs(item.date).format(dateFormat);
      if (!groupedData[dateKey]) {
        groupedData[dateKey] = { 
          date: dateKey,
          displayDate: dayjs(item.date).format(displayFormat)
        };
      }
      
      // For stacked charts, we need individual pool values
      if (!groupedData[dateKey][item.compute_pool_name]) {
        groupedData[dateKey][item.compute_pool_name] = 0;
      }
      groupedData[dateKey][item.compute_pool_name] += item.credits_used;
    });

    return Object.values(groupedData).sort((a: any, b: any) => 
      dayjs(a.date).unix() - dayjs(b.date).unix()
    );
  };

  // Prepare data for warehouse time series chart using actual warehouse data
  const prepareWarehouseTimeSeriesData = () => {
    const groupedData: Record<string, any> = {};
    
    // Determine date format and aggregation based on period
    let dateFormat = 'YYYY-MM-DD';
    let displayFormat = 'MMM DD';
    
    if (periodType === 'weekly') {
      dateFormat = 'YYYY-[W]WW';
      displayFormat = '[Week] WW';
    } else if (periodType === 'monthly') {
      dateFormat = 'YYYY-MM';
      displayFormat = 'MMM YYYY';
    }
    
    // Use actual warehouse usage data
    warehouseUsage.forEach(item => {
      const dateKey = dayjs(item.date).format(dateFormat);
      if (!groupedData[dateKey]) {
        groupedData[dateKey] = { 
          date: dateKey,
          displayDate: dayjs(item.date).format(displayFormat)
        };
      }
      
      if (!groupedData[dateKey][item.warehouse_name]) {
        groupedData[dateKey][item.warehouse_name] = 0;
      }
      groupedData[dateKey][item.warehouse_name] += item.credits_used;
    });

    return Object.values(groupedData).sort((a: any, b: any) => 
      dayjs(a.date).unix() - dayjs(b.date).unix()
    );
  };

  // Prepare data for pool comparison bar chart
  const preparePoolComparisonData = () => {
    const poolTotals: Record<string, number> = {};
    
    creditUsage.forEach(item => {
      if (!poolTotals[item.compute_pool_name]) {
        poolTotals[item.compute_pool_name] = 0;
      }
      poolTotals[item.compute_pool_name] += item.credits_used;
    });

    return Object.entries(poolTotals).map(([pool, total], index) => ({
      pool_name: pool,
      credits_used: total,
      fill: COLORS[index % COLORS.length],
    }));
  };

  // Prepare data for pie chart
  const preparePieData = () => {
    const poolData = preparePoolComparisonData();
    return poolData.map((item, index) => ({
      name: item.pool_name,
      value: item.credits_used,
      fill: COLORS[index % COLORS.length],
    }));
  };

  // Prepare data for storage usage time series chart
  const prepareStorageTimeSeriesData = () => {
    const groupedData: Record<string, any> = {};
    
    // Determine date format and aggregation based on period
    let dateFormat = 'YYYY-MM-DD';
    let displayFormat = 'MMM DD';
    
    if (periodType === 'weekly') {
      dateFormat = 'YYYY-[W]WW';
      displayFormat = '[Week] WW';
    } else if (periodType === 'monthly') {
      dateFormat = 'YYYY-MM';
      displayFormat = 'MMM YYYY';
    }
    
    storageUsage.forEach(item => {
      const dateKey = dayjs(item.usage_date).format(dateFormat);
      if (!groupedData[dateKey]) {
        groupedData[dateKey] = { 
          date: dateKey,
          displayDate: dayjs(item.usage_date).format(displayFormat),
          storage_gb: 0,
          stage_gb: 0,
          failsafe_gb: 0,
          hybrid_gb: 0
        };
      }
      
      const bytesToGB = 1024 ** 3;
      groupedData[dateKey].storage_gb += item.storage_bytes / bytesToGB;
      groupedData[dateKey].stage_gb += item.stage_bytes / bytesToGB;
      groupedData[dateKey].failsafe_gb += item.failsafe_bytes / bytesToGB;
      groupedData[dateKey].hybrid_gb += item.hybrid_table_storage_bytes / bytesToGB;
    });

    return Object.values(groupedData).sort((a: any, b: any) => 
      dayjs(a.date).unix() - dayjs(b.date).unix()
    );
  };

  // Prepare data for database storage time series chart
  const prepareDatabaseStorageTimeSeriesData = () => {
    const groupedData: Record<string, any> = {};
    
    // Determine date format and aggregation based on period
    let dateFormat = 'YYYY-MM-DD';
    let displayFormat = 'MMM DD';
    
    if (periodType === 'weekly') {
      dateFormat = 'YYYY-[W]WW';
      displayFormat = '[Week] WW';
    } else if (periodType === 'monthly') {
      dateFormat = 'YYYY-MM';
      displayFormat = 'MMM YYYY';
    }
    
    databaseStorageUsage.forEach(item => {
      const dateKey = dayjs(item.usage_date).format(dateFormat);
      if (!groupedData[dateKey]) {
        groupedData[dateKey] = { 
          date: dateKey,
          displayDate: dayjs(item.usage_date).format(displayFormat)
        };
      }
      
      const bytesToGB = 1024 ** 3;
      if (!groupedData[dateKey][item.database_name]) {
        groupedData[dateKey][item.database_name] = 0;
      }
      groupedData[dateKey][item.database_name] += item.total_bytes / bytesToGB;
    });

    return Object.values(groupedData).sort((a: any, b: any) => 
      dayjs(a.date).unix() - dayjs(b.date).unix()
    );
  };

  const computePoolTimeSeriesData = prepareComputePoolTimeSeriesData();
  const warehouseTimeSeriesData = prepareWarehouseTimeSeriesData();
  const storageTimeSeriesData = prepareStorageTimeSeriesData();
  const databaseStorageTimeSeriesData = prepareDatabaseStorageTimeSeriesData();
  const poolComparisonData = preparePoolComparisonData();
  const pieData = preparePieData();
  const uniquePools = [...new Set(creditUsage.map(item => item.compute_pool_name))];
  const uniqueWarehouses = [...new Set(warehouseTimeSeriesData.flatMap(item => 
    Object.keys(item).filter(key => key !== 'date' && key !== 'displayDate')
  ))];
  const uniqueDatabases = [...new Set(databaseStorageTimeSeriesData.flatMap(item => 
    Object.keys(item).filter(key => key !== 'date' && key !== 'displayDate')
  ))];

  return (
    <div>
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Title level={3} style={{ margin: 0 }}>
              <BarChartOutlined style={{ marginRight: 8 }} />
              Credit Usage Analytics
            </Title>
          </Col>
          <Col>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={loading}
            >
              Refresh
            </Button>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Select
              style={{ width: '100%' }}
              value={periodType}
              onChange={handlePeriodChange}
              placeholder="Select time period"
            >
              <Option value="daily">Daily</Option>
              <Option value="weekly">Weekly</Option>
              <Option value="monthly">Monthly</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8}>
            <RangePicker
              style={{ width: '100%' }}
              value={dateRange}
              onChange={handleDateRangeChange}
              placeholder={['Start Date', 'End Date']}
            />
          </Col>
          <Col xs={24} sm={8}>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder={
                activeTab === 'warehouses' ? "Filter by warehouses" :
                activeTab === 'storage' ? "Filter by databases" :
                "Filter by compute pools"
              }
              value={
                activeTab === 'warehouses' ? selectedWarehouses :
                activeTab === 'storage' ? selectedDatabases :
                selectedPools
              }
              onChange={
                activeTab === 'warehouses' ? handleWarehousesChange :
                activeTab === 'storage' ? handleDatabasesChange :
                handlePoolsChange
              }
              allowClear
            >
              {(
                activeTab === 'warehouses' ? availableWarehouses :
                activeTab === 'storage' ? availableDatabases :
                availablePools
              ).map(item => (
                <Option key={item} value={item}>{item}</Option>
              ))}
            </Select>
          </Col>
        </Row>

        {/* Summary Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
          <Col xs={24} sm={4}>
            <Card>
              <Statistic
                title="Total Credits Used"
                value={(summary?.total_credits_used || 0) + (warehouseSummary?.total_credits_used || 0)}
                precision={2}
                prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
                suffix="credits"
              />
            </Card>
          </Col>
          <Col xs={24} sm={4}>
            <Card>
              <Statistic
                title="Average Credits per Day"
                value={(() => {
                  if (!dateRange || !dateRange[0] || !dateRange[1]) return 0;
                  const totalCredits = (summary?.total_credits_used || 0) + (warehouseSummary?.total_credits_used || 0);
                  const daysDiff = dateRange[1].diff(dateRange[0], 'days') + 1; // +1 to include both start and end days
                  return daysDiff > 0 ? totalCredits / daysDiff : 0;
                })()}
                precision={2}
                prefix={<DollarOutlined style={{ color: '#faad14' }} />}
                suffix="credits/day"
              />
            </Card>
          </Col>
          <Col xs={24} sm={4}>
            <Card>
              <Statistic
                title="Total Storage"
                value={storageSummary?.total_storage_gb || 0}
                precision={1}
                prefix={<CloudServerOutlined style={{ color: '#f56a00' }} />}
                suffix="GB"
              />
            </Card>
          </Col>
          <Col xs={24} sm={4}>
            <Card>
              <Statistic
                title="Active Compute Pools"
                value={uniquePools.length}
                prefix={<CloudServerOutlined style={{ color: '#1890ff' }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={4}>
            <Card>
              <Statistic
                title="Active Warehouses"
                value={uniqueWarehouses.length}
                prefix={<CloudServerOutlined style={{ color: '#722ed1' }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={4}>
            <Card>
              <Statistic
                title="Active Databases"
                value={storageSummary?.active_databases || 0}
                prefix={<CloudServerOutlined style={{ color: '#13c2c2' }} />}
              />
            </Card>
          </Col>
        </Row>

        <Spin spinning={loading || warehouseLoading || storageLoading}>
          {(creditUsage.length > 0 || warehouseUsage.length > 0 || storageUsage.length > 0) ? (
            <Tabs defaultActiveKey="compute-pools" style={{ marginTop: 24 }} onChange={handleTabChange}>
              <Tabs.TabPane tab="Compute Pools" key="compute-pools">
                {/* Compute Pool Summary Statistics */}
                {summary && (
                  <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={8}>
                      <Card>
                        <Statistic
                          title="Compute Pool Credits Used"
                          value={summary.total_credits_used}
                          precision={2}
                          prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
                          suffix="credits"
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Card>
                        <Statistic
                          title="Avg Compute Pool Credits/Day"
                          value={(() => {
                            if (!dateRange || !dateRange[0] || !dateRange[1]) return 0;
                            const daysDiff = dateRange[1].diff(dateRange[0], 'days') + 1;
                            return daysDiff > 0 ? summary.total_credits_used / daysDiff : 0;
                          })()}
                          precision={2}
                          prefix={<DollarOutlined style={{ color: '#faad14' }} />}
                          suffix="credits/day"
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Card>
                        <Statistic
                          title="Active Compute Pools"
                          value={uniquePools.length}
                          prefix={<CloudServerOutlined style={{ color: '#1890ff' }} />}
                        />
                      </Card>
                    </Col>
                  </Row>
                )}

                <Row gutter={[16, 24]}>
                  {/* Compute Pool Time Series Chart */}
                  <Col xs={24}>
                    <Card title={`Compute Pool Credit Usage${getDateRangeText()}`} style={{ marginBottom: 16 }}>
                      <ResponsiveContainer width="100%" height={400}>
                        {(periodType === 'weekly' || periodType === 'monthly') ? (
                          <BarChart data={computePoolTimeSeriesData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="displayDate" 
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <RechartsTooltip 
                              labelFormatter={(value) => value}
                              formatter={(value: number, name: string) => [value.toFixed(2) + ' credits', name]}
                            />
                            <Legend />
                            {uniquePools.map((pool, index) => (
                              <Bar
                                key={pool}
                                dataKey={pool}
                                stackId="credits"
                                fill={COLORS[index % COLORS.length]}
                                name={pool}
                              />
                            ))}
                          </BarChart>
                        ) : (
                          <LineChart data={computePoolTimeSeriesData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="displayDate" 
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <RechartsTooltip 
                              labelFormatter={(value) => value}
                              formatter={(value: number, name: string) => [value.toFixed(2) + ' credits', name]}
                            />
                            <Legend />
                            {uniquePools.map((pool, index) => (
                              <Line
                                key={pool}
                                type="monotone"
                                dataKey={pool}
                                stroke={COLORS[index % COLORS.length]}
                                strokeWidth={2}
                                dot={{ strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6 }}
                                name={pool}
                              />
                            ))}
                          </LineChart>
                        )}
                      </ResponsiveContainer>
                    </Card>
                  </Col>

                  {/* Pool Comparison Bar Chart */}
                  <Col xs={24} lg={12}>
                    <Card title="Credit Usage by Compute Pool">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={poolComparisonData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="pool_name" 
                            tick={{ fontSize: 11 }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis tick={{ fontSize: 12 }} />
                          <RechartsTooltip 
                            formatter={(value: number) => [value.toFixed(2) + ' credits', 'Total Credits Used']}
                          />
                          <Bar dataKey="credits_used" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  </Col>

                  {/* Compute Pool Pie Chart */}
                  <Col xs={24} lg={12}>
                    <Card title="Compute Pool Credit Distribution">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                            formatter={(value: number) => [value.toFixed(2) + ' credits', 'Credits Used']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </Card>
                  </Col>
                </Row>
              </Tabs.TabPane>

              <Tabs.TabPane tab="Data Warehouses" key="warehouses">
                {/* Warehouse Summary Statistics */}
                {warehouseSummary && (
                  <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={6}>
                      <Card>
                        <Statistic
                          title="Total Warehouse Credits"
                          value={warehouseSummary.total_credits_used}
                          precision={2}
                          prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
                          suffix="credits"
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={6}>
                      <Card>
                        <Statistic
                          title="Compute Credits"
                          value={warehouseSummary.total_credits_compute}
                          precision={2}
                          prefix={<DollarOutlined style={{ color: '#1890ff' }} />}
                          suffix="credits"
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={6}>
                      <Card>
                        <Statistic
                          title="Cloud Services Credits"
                          value={warehouseSummary.total_credits_cloud_services}
                          precision={2}
                          prefix={<DollarOutlined style={{ color: '#722ed1' }} />}
                          suffix="credits"
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={6}>
                      <Card>
                        <Statistic
                          title="Active Warehouses"
                          value={uniqueWarehouses.length}
                          prefix={<CloudServerOutlined style={{ color: '#fa8c16' }} />}
                        />
                      </Card>
                    </Col>
                  </Row>
                )}

                <Row gutter={[16, 24]}>
                  {/* Warehouse Time Series Chart */}
                  <Col xs={24}>
                    <Card title={`Warehouse Credit Usage${getDateRangeText()}`} style={{ marginBottom: 16 }}>
                      <ResponsiveContainer width="100%" height={400}>
                        {(periodType === 'weekly' || periodType === 'monthly') ? (
                          <BarChart data={warehouseTimeSeriesData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="displayDate" 
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <RechartsTooltip 
                              labelFormatter={(value) => value}
                              formatter={(value: number, name: string) => [value.toFixed(2) + ' credits', name]}
                            />
                            <Legend />
                            {uniqueWarehouses.map((warehouse, index) => (
                              <Bar
                                key={warehouse}
                                dataKey={warehouse}
                                stackId="credits"
                                fill={COLORS[index % COLORS.length]}
                                name={warehouse}
                              />
                            ))}
                          </BarChart>
                        ) : (
                          <LineChart data={warehouseTimeSeriesData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="displayDate" 
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <RechartsTooltip 
                              labelFormatter={(value) => value}
                              formatter={(value: number, name: string) => [value.toFixed(2) + ' credits', name]}
                            />
                            <Legend />
                            {uniqueWarehouses.map((warehouse, index) => (
                              <Line
                                key={warehouse}
                                type="monotone"
                                dataKey={warehouse}
                                stroke={COLORS[index % COLORS.length]}
                                strokeWidth={2}
                                dot={{ strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6 }}
                                name={warehouse}
                              />
                            ))}
                          </LineChart>
                        )}
                      </ResponsiveContainer>
                    </Card>
                  </Col>

                  {/* Warehouse Comparison Bar Chart */}
                  <Col xs={24} lg={12}>
                    <Card title="Credit Usage by Warehouse">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={uniqueWarehouses.map((warehouse, index) => ({
                          warehouse_name: warehouse,
                          credits_used: warehouseTimeSeriesData.reduce((sum, item) => sum + (item[warehouse] || 0), 0),
                          fill: COLORS[index % COLORS.length],
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="warehouse_name" 
                            tick={{ fontSize: 11 }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis tick={{ fontSize: 12 }} />
                          <RechartsTooltip 
                            formatter={(value: number) => [value.toFixed(2) + ' credits', 'Total Credits Used']}
                          />
                          <Bar dataKey="credits_used" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  </Col>

                  {/* Warehouse Pie Chart */}
                  <Col xs={24} lg={12}>
                    <Card title="Warehouse Credit Distribution">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={uniqueWarehouses.map((warehouse, index) => ({
                              name: warehouse,
                              value: warehouseTimeSeriesData.reduce((sum, item) => sum + (item[warehouse] || 0), 0),
                              fill: COLORS[index % COLORS.length],
                            }))}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {uniqueWarehouses.map((warehouse, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                            formatter={(value: number) => [value.toFixed(2) + ' credits', 'Credits Used']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </Card>
                  </Col>
                </Row>
              </Tabs.TabPane>

              <Tabs.TabPane tab="Storage" key="storage">
                {/* Storage Summary Statistics */}
                {storageSummary && (
                  <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={6}>
                      <Card>
                        <Statistic
                          title="Total Storage"
                          value={storageSummary.total_storage_gb}
                          precision={1}
                          prefix={<CloudServerOutlined style={{ color: '#f56a00' }} />}
                          suffix="GB"
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={6}>
                      <Card>
                        <Statistic
                          title="Average Storage per Day"
                          value={storageSummary.average_storage_per_day_gb}
                          precision={1}
                          prefix={<CloudServerOutlined style={{ color: '#faad14' }} />}
                          suffix="GB/day"
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={6}>
                      <Card>
                        <Statistic
                          title="Failsafe Storage"
                          value={storageSummary.total_failsafe_gb}
                          precision={1}
                          prefix={<CloudServerOutlined style={{ color: '#1890ff' }} />}
                          suffix="GB"
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={6}>
                      <Card>
                        <Statistic
                          title="Active Databases"
                          value={storageSummary.active_databases}
                          prefix={<CloudServerOutlined style={{ color: '#13c2c2' }} />}
                        />
                      </Card>
                    </Col>
                  </Row>
                )}

                <Row gutter={[16, 24]}>
                  {/* Storage Time Series Chart */}
                  <Col xs={24}>
                    <Card title={`Storage Usage Over Time${getDateRangeText()}`} style={{ marginBottom: 16 }}>
                      <ResponsiveContainer width="100%" height={400}>
                        {(periodType === 'weekly' || periodType === 'monthly') ? (
                          <BarChart data={storageTimeSeriesData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="displayDate" 
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <RechartsTooltip 
                              labelFormatter={(value) => value}
                              formatter={(value: number, name: string) => [value.toFixed(1) + ' GB', name]}
                            />
                            <Legend />
                            <Bar dataKey="storage_gb" stackId="storage" fill="#1890ff" name="Table Storage" />
                            <Bar dataKey="stage_gb" stackId="storage" fill="#52c41a" name="Stage Storage" />
                            <Bar dataKey="failsafe_gb" stackId="storage" fill="#faad14" name="Failsafe Storage" />
                            <Bar dataKey="hybrid_gb" stackId="storage" fill="#722ed1" name="Hybrid Storage" />
                          </BarChart>
                        ) : (
                          <LineChart data={storageTimeSeriesData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="displayDate" 
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <RechartsTooltip 
                              labelFormatter={(value) => value}
                              formatter={(value: number, name: string) => [value.toFixed(1) + ' GB', name]}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="storage_gb" stroke="#1890ff" strokeWidth={2} name="Table Storage" />
                            <Line type="monotone" dataKey="stage_gb" stroke="#52c41a" strokeWidth={2} name="Stage Storage" />
                            <Line type="monotone" dataKey="failsafe_gb" stroke="#faad14" strokeWidth={2} name="Failsafe Storage" />
                            <Line type="monotone" dataKey="hybrid_gb" stroke="#722ed1" strokeWidth={2} name="Hybrid Storage" />
                          </LineChart>
                        )}
                      </ResponsiveContainer>
                    </Card>
                  </Col>

                  {/* Database Storage Chart */}
                  <Col xs={24}>
                    <Card title={`Database Storage Usage${getDateRangeText()}`} style={{ marginBottom: 16 }}>
                      <ResponsiveContainer width="100%" height={400}>
                        {(periodType === 'weekly' || periodType === 'monthly') ? (
                          <BarChart data={databaseStorageTimeSeriesData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="displayDate" 
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <RechartsTooltip 
                              labelFormatter={(value) => value}
                              formatter={(value: number, name: string) => [value.toFixed(1) + ' GB', name]}
                            />
                            <Legend />
                            {uniqueDatabases.map((database, index) => (
                              <Bar
                                key={database}
                                dataKey={database}
                                stackId="storage"
                                fill={COLORS[index % COLORS.length]}
                                name={database}
                              />
                            ))}
                          </BarChart>
                        ) : (
                          <LineChart data={databaseStorageTimeSeriesData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="displayDate" 
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <RechartsTooltip 
                              labelFormatter={(value) => value}
                              formatter={(value: number, name: string) => [value.toFixed(1) + ' GB', name]}
                            />
                            <Legend />
                            {uniqueDatabases.map((database, index) => (
                              <Line
                                key={database}
                                type="monotone"
                                dataKey={database}
                                stroke={COLORS[index % COLORS.length]}
                                strokeWidth={2}
                                dot={{ strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6 }}
                                name={database}
                              />
                            ))}
                          </LineChart>
                        )}
                      </ResponsiveContainer>
                    </Card>
                  </Col>
                </Row>
              </Tabs.TabPane>
            </Tabs>
          ) : (
            <Empty
              description="No analytics data available"
              style={{ margin: '40px 0' }}
            >
              <Text type="secondary">
                No analytics data is available for the selected time period. 
                This could be due to no active compute pools, warehouses, or storage usage.
                Try selecting a different date range or check if resources are actively being used.
              </Text>
            </Empty>
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default Analytics; 