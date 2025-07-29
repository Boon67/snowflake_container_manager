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
import { api, CreditUsage, CreditUsageFilter, CreditUsageSummary } from '../services/api.ts';
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
  const [summary, setSummary] = useState<CreditUsageSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [periodType, setPeriodType] = useState<string>('monthly');
  
  // Default to current month date range
  const currentMonthStart = dayjs().startOf('month');
  const currentMonthEnd = dayjs().endOf('month');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>([currentMonthStart, currentMonthEnd]);
  
  const [selectedPools, setSelectedPools] = useState<string[]>([]);
  const [availablePools, setAvailablePools] = useState<string[]>([]);
  
  // New state for enhanced analytics
  const [dailyRollup, setDailyRollup] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [rollupLoading, setRollupLoading] = useState(false);
  const [heatmapLoading, setHeatmapLoading] = useState(false);

  useEffect(() => {
    loadCreditUsage();
    loadDailyRollup();
    loadHeatmapData();
  }, [periodType, dateRange, selectedPools]);

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
      setSummary(summaryResponse.data);

      // Extract unique pool names for filtering
      const pools = [...new Set(usageResponse.data.map(item => item.compute_pool_name))];
      setAvailablePools(pools);

    } catch (error: any) {
      message.error('Failed to load credit usage data');
    } finally {
      setLoading(false);
    }
  };

  const loadDailyRollup = async () => {
    setRollupLoading(true);
    try {
      const filter: CreditUsageFilter = {
        period_type: 'daily',
        start_date: dateRange?.[0]?.toISOString(),
        end_date: dateRange?.[1]?.toISOString(),
        compute_pool_names: selectedPools.length > 0 ? selectedPools : undefined,
      };

      const response = await api.getDailyCreditRollup(filter);
      setDailyRollup(response.data.data || []);
    } catch (error: any) {
      message.error('Failed to load daily rollup data');
    } finally {
      setRollupLoading(false);
    }
  };

  const loadHeatmapData = async () => {
    setHeatmapLoading(true);
    try {
      // For heatmap, use last 7 days if no specific date range is selected, 
      // otherwise use the selected date range but limit to reasonable timeframe
      let heatmapStartDate = dateRange?.[0]?.toISOString();
      let heatmapEndDate = dateRange?.[1]?.toISOString();
      
      // If date range is too large (more than 14 days), use last 7 days of the range
      if (dateRange && dayjs(dateRange[1]).diff(dayjs(dateRange[0]), 'days') > 14) {
        heatmapStartDate = dayjs(dateRange[1]).subtract(7, 'days').toISOString();
        heatmapEndDate = dateRange[1].toISOString();
      }
      
      const filter: CreditUsageFilter = {
        period_type: 'hourly',
        start_date: heatmapStartDate,
        end_date: heatmapEndDate,
        compute_pool_names: selectedPools.length > 0 ? selectedPools : undefined,
      };

      const response = await api.getHourlyHeatmap(filter);
      setHeatmapData(response.data.data || []);
    } catch (error: any) {
      message.error('Failed to load heatmap data');
    } finally {
      setHeatmapLoading(false);
    }
  };

  const handleRefresh = () => {
    loadCreditUsage();
    loadDailyRollup();
    loadHeatmapData();
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

  // Prepare data for line chart (time series)
  const prepareTimeSeriesData = () => {
    const groupedData: Record<string, any> = {};
    
    creditUsage.forEach(item => {
      const dateKey = dayjs(item.date).format('YYYY-MM-DD');
      if (!groupedData[dateKey]) {
        groupedData[dateKey] = { date: dateKey };
      }
      groupedData[dateKey][item.compute_pool_name] = item.credits_used;
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

  // Prepare data for daily rollup bar chart
  const prepareDailyRollupData = () => {
    const groupedData: Record<string, any> = {};
    
    dailyRollup.forEach(item => {
      const dateKey = dayjs(item.date).format('YYYY-MM-DD');
      if (!groupedData[dateKey]) {
        groupedData[dateKey] = { 
          date: dateKey,
          total_credits: 0,
          peak_hour_credits: 0,
          active_hours: 0
        };
      }
      groupedData[dateKey].total_credits += item.daily_credits_used;
      groupedData[dateKey].peak_hour_credits = Math.max(groupedData[dateKey].peak_hour_credits, item.peak_hourly_credits);
      groupedData[dateKey].active_hours = Math.max(groupedData[dateKey].active_hours, item.active_hours);
    });

    return Object.values(groupedData).sort((a: any, b: any) => 
      dayjs(a.date).unix() - dayjs(b.date).unix()
    );
  };

  // Prepare data for heatmap visualization
  const prepareHeatmapData = () => {
    interface HeatmapCell {
      hour: number;
      day: number;
      value: number;
      count: number;
    }

    interface HeatmapDataPoint {
      hour: number;
      day: number;
      dayName: string;
      hourLabel: string;
      value: number;
      totalValue: number;
      count: number;
    }

    const heatmapMatrix: HeatmapCell[][] = [];
    
    // Create 24-hour x 7-day matrix
    for (let hour = 0; hour < 24; hour++) {
      const hourData: HeatmapCell[] = [];
      for (let day = 0; day < 7; day++) {
        hourData.push({ hour, day, value: 0, count: 0 });
      }
      heatmapMatrix.push(hourData);
    }

    // Aggregate data into the matrix
    heatmapData.forEach(item => {
      const date = dayjs(item.date);
      const dayOfWeek = date.day(); // 0 = Sunday, 1 = Monday, etc.
      const hour = item.hour;
      
      if (hour >= 0 && hour < 24 && dayOfWeek >= 0 && dayOfWeek < 7) {
        heatmapMatrix[hour][dayOfWeek].value += item.credits_used;
        heatmapMatrix[hour][dayOfWeek].count += 1;
      }
    });

    // Calculate averages and flatten for recharts
    const flattenedData: HeatmapDataPoint[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let day = 0; day < 7; day++) {
        const cell = heatmapMatrix[hour][day];
        flattenedData.push({
          hour: hour,
          day: day,
          dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day],
          hourLabel: `${hour.toString().padStart(2, '0')}:00`,
          value: cell.count > 0 ? cell.value / cell.count : 0,
          totalValue: cell.value,
          count: cell.count
        });
      }
    }

    return flattenedData;
  };

  const timeSeriesData = prepareTimeSeriesData();
  const poolComparisonData = preparePoolComparisonData();
  const pieData = preparePieData();
  const uniquePools = [...new Set(creditUsage.map(item => item.compute_pool_name))];
  const dailyRollupData = prepareDailyRollupData();
  const processedHeatmapData = prepareHeatmapData();

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
              placeholder="Filter by compute pools"
              value={selectedPools}
              onChange={handlePoolsChange}
              allowClear
            >
              {availablePools.map(pool => (
                <Option key={pool} value={pool}>{pool}</Option>
              ))}
            </Select>
          </Col>
        </Row>

        {/* Summary Statistics */}
        {summary && (
          <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="Total Credits Used"
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
                  title="Total Credits Billed"
                  value={summary.total_credits_billed}
                  precision={2}
                  prefix={<DollarOutlined style={{ color: '#faad14' }} />}
                  suffix="credits"
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

        <Spin spinning={loading}>
          {creditUsage.length > 0 || dailyRollup.length > 0 || processedHeatmapData.length > 0 ? (
            <Row gutter={[16, 24]}>
              {/* Time Series Chart */}
              {creditUsage.length > 0 ? (
                <Col xs={24}>
                  <Card title="Credit Usage Over Time" style={{ marginBottom: 16 }}>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={timeSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => dayjs(value).format('MMM DD')}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <RechartsTooltip 
                          labelFormatter={(value) => dayjs(value).format('MMMM DD, YYYY')}
                          formatter={(value: number) => [value.toFixed(2) + ' credits', 'Credits Used']}
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
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
              ) : (
                <Col xs={24}>
                  <Card title="Credit Usage Over Time" style={{ marginBottom: 16 }}>
                    <Empty 
                      description="No credit usage data available for the selected time period"
                      style={{ margin: '40px 0' }}
                    />
                  </Card>
                </Col>
              )}

              {/* Pool Comparison Bar Chart */}
              {creditUsage.length > 0 ? (
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
              ) : (
                <Col xs={24} lg={12}>
                  <Card title="Credit Usage by Compute Pool">
                    <Empty description="No compute pool data available" />
                  </Card>
                </Col>
              )}

              {/* Pie Chart */}
              {creditUsage.length > 0 ? (
                <Col xs={24} lg={12}>
                  <Card title="Credit Distribution">
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
              ) : (
                <Col xs={24} lg={12}>
                  <Card title="Credit Distribution">
                    <Empty description="No credit distribution data available" />
                  </Card>
                </Col>
              )}

              {/* Daily Rollup Chart */}
              <Col xs={24}>
                <Card title="Daily Credit Usage Rollup" style={{ marginTop: 16 }}>
                  <Spin spinning={rollupLoading}>
                    {dailyRollupData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={dailyRollupData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => dayjs(value).format('MMM DD')}
                          />
                          <YAxis tick={{ fontSize: 12 }} />
                          <RechartsTooltip 
                            labelFormatter={(value) => dayjs(value).format('MMMM DD, YYYY')}
                            formatter={(value: number, name: string) => [
                              value.toFixed(2), 
                              name === 'total_credits' ? 'Total Credits' :
                              name === 'peak_hour_credits' ? 'Peak Hour Credits' : 
                              name === 'active_hours' ? 'Active Hours' : name
                            ]}
                          />
                          <Legend />
                          <Bar dataKey="total_credits" fill="#1890ff" name="Total Credits" />
                          <Bar dataKey="peak_hour_credits" fill="#52c41a" name="Peak Hour Credits" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <Empty description="No daily rollup data available" />
                    )}
                  </Spin>
                </Card>
              </Col>

              {/* Heatmap */}
              <Col xs={24}>
                <Card title={`Credit Usage Heatmap (By Hour of Day)${dateRange && dayjs(dateRange[1]).diff(dayjs(dateRange[0]), 'days') > 14 ? ' - Last 7 Days' : ''}`} style={{ marginTop: 16 }}>
                  <Spin spinning={heatmapLoading}>
                    {processedHeatmapData.length > 0 ? (
                      <div style={{ overflowX: 'auto' }}>
                        <div style={{ minWidth: '800px', display: 'grid', gridTemplateColumns: 'auto repeat(7, 1fr)', gap: '2px', padding: '20px' }}>
                          {/* Header row */}
                          <div></div>
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} style={{ textAlign: 'center', fontWeight: 'bold', padding: '8px' }}>
                              {day}
                            </div>
                          ))}
                          
                          {/* Hour rows */}
                          {Array.from({ length: 24 }, (_, hour) => [
                            <div key={`hour-${hour}`} style={{ 
                              textAlign: 'center', 
                              fontWeight: 'bold', 
                              padding: '8px',
                              fontSize: '12px'
                            }}>
                              {hour.toString().padStart(2, '0')}:00
                            </div>,
                            ...Array.from({ length: 7 }, (_, day) => {
                              const cellData = processedHeatmapData.find(d => d.hour === hour && d.day === day);
                              const value = cellData?.value || 0;
                              const maxValue = Math.max(...processedHeatmapData.map(d => d.value));
                              const intensity = maxValue > 0 ? value / maxValue : 0;
                              
                              return (
                                <Tooltip 
                                  key={`${hour}-${day}`}
                                  title={`${cellData?.dayName} ${cellData?.hourLabel}: ${value.toFixed(2)} credits`}
                                >
                                  <div style={{
                                    width: '40px',
                                    height: '25px',
                                    backgroundColor: `rgba(24, 144, 255, ${intensity})`,
                                    border: '1px solid #d9d9d9',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    fontSize: '10px',
                                    color: intensity > 0.5 ? 'white' : 'black'
                                  }}>
                                    {value > 0 ? value.toFixed(1) : ''}
                                  </div>
                                </Tooltip>
                              );
                            })
                          ]).flat()}
                        </div>
                        <div style={{ marginTop: '16px', textAlign: 'center' }}>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Color intensity indicates relative credit usage. Hover over cells for details.
                          </Text>
                        </div>
                      </div>
                    ) : (
                      <Empty description="No heatmap data available" />
                    )}
                  </Spin>
                </Card>
              </Col>
            </Row>
          ) : (
            <Empty
              description="No compute pool credit usage data available"
              style={{ margin: '40px 0' }}
            >
              <Text type="secondary">
                No compute pools have recorded credit usage for the selected time period. 
                Credit usage data comes from Snowflake's ACCOUNT_USAGE.COMPUTE_POOL_METERING_HISTORY table.
                Try selecting a different date range or check if compute pools are actively running.
              </Text>
            </Empty>
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default Analytics; 