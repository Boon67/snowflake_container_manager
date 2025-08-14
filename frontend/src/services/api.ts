import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Types for the unified solution configuration system
export interface Tag {
  id: string;
  name: string;
  created_at: string;
}

export interface Parameter {
  id: string;
  name?: string;
  key: string;
  value: string | null;
  description: string | null;
  is_secret: boolean;
  created_at: string;
  updated_at: string;
  tags: Tag[];
}

export interface Solution {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  parameters: Parameter[];
  parameter_count?: number;  // Add parameter count field
}

export interface CreateSolution {
  name: string;
  description?: string;
}

export interface UpdateSolution {
  name?: string;
  description?: string;
}

export interface CreateParameter {
  name?: string;
  key: string;
  value?: string;
  description?: string;
  is_secret?: boolean;
  tags?: string[];
}

export interface UpdateParameter {
  name?: string;
  key?: string;
  value?: string;
  description?: string;
  is_secret?: boolean;
  tags?: string[];
}

// Snowflake Authentication Interfaces
export interface SnowflakeUser {
  username: string;
  account: string;
}

export interface SnowflakeLogin {
  account: string;
  username: string;
  password: string;
}

// Analytics Interfaces
export interface CreditUsage {
  compute_pool_name: string;
  date: string;
  credits_used: number;
  credits_billed: number;
  period_type: string;
}

export interface CreditUsageFilter {
  start_date?: string;
  end_date?: string;
  period_type?: string;
  compute_pool_names?: string[];
}

export interface CreditUsageSummary {
  total_credits_used: number;
  total_credits_billed: number;
  active_compute_pools: number;
}

// Storage Usage Interfaces
export interface StorageUsage {
  usage_date: string;
  storage_bytes: number;
  stage_bytes: number;
  failsafe_bytes: number;
  hybrid_table_storage_bytes: number;
  total_bytes: number;
  period_type: string;
}

export interface DatabaseStorageUsage {
  database_name: string;
  usage_date: string;
  storage_bytes: number;
  failsafe_bytes: number;
  hybrid_table_storage_bytes: number;
  total_bytes: number;
  period_type: string;
}

export interface StorageUsageSummary {
  total_storage_gb: number;
  total_stage_gb: number;
  total_failsafe_gb: number;
  total_hybrid_gb: number;
  active_databases: number;
  average_storage_per_day_gb: number;
}

// Repository and Image Interfaces
export interface ImageRepository {
  name: string;
  database: string;
  schema: string;
  repository_url: string;
  created_at: string;
  updated_at?: string;
  owner: string;
  comment?: string;
}

export interface Database {
  name: string;
  created_on: string;
  comment: string;
  owner: string;
  retention_time: number;
}

export interface Schema {
  name: string;
  database_name: string;
  created_on: string;
  comment: string;
  owner: string;
}

// Network Rules and Policies
export interface NetworkRule {
  name: string;
  created_on: string;
  database_name?: string;
  schema_name?: string;
  owner?: string;
  comment?: string;
  type: string;
  mode: string;
  entries_in_valuelist: number;
  owner_role_type?: string;
}

export interface NetworkRuleCreate {
  name: string;
  type: string; // IPV4, AWSVPCEID, AZURELINKID, HOST_PORT, PRIVATE_HOST_PORT
  mode: string; // INGRESS, INTERNAL_STAGE, EGRESS
  value_list: string[];
  comment?: string;
}

export interface NetworkRuleUpdate {
  value_list: string[];
  comment?: string;
}

export interface NetworkPolicy {
  name: string;
  created_on: string;
  comment?: string;
  entries_in_allowed_ip_list: number;
  entries_in_blocked_ip_list: number;
  entries_in_allowed_network_rules: number;
  entries_in_blocked_network_rules: number;
  database_name?: string;
  schema_name?: string;
  owner?: string;
  is_active?: boolean; // Whether this policy is currently enabled
}

export interface NetworkPolicyCreate {
  name: string;
  allowed_network_rules?: string[];
  blocked_network_rules?: string[];
  allowed_ip_list?: string[];
  blocked_ip_list?: string[];
  comment?: string;
}

export interface NetworkPolicyUpdate {
  allowed_network_rules?: string[];
  blocked_network_rules?: string[];
  allowed_ip_list?: string[];
  blocked_ip_list?: string[];
  comment?: string;
}

export interface ContainerImage {
  repository_name: string;
  image_name: string;
  tag: string;
  digest: string;
  size_bytes: number;
  created_at: string;
  uploaded_at: string;
  architecture: string;
  os: string;
  media_type: string;
  repository_database?: string;
  repository_schema?: string;
  repository_url?: string;
}

// Solution API Key Interfaces
export interface SolutionAPIKey {
  id: string;
  solution_id: string;
  key_name: string;
  api_key: string;
  is_active: boolean;
  created_at?: string;
  last_used?: string;
  expires_at?: string;
}

export interface CreateSolutionAPIKey {
  key_name: string;
  expires_days?: number;
}

export interface SolutionAPIKeyResponse {
  id: string;
  solution_id: string;
  key_name: string;
  api_key: string;
  is_active: boolean;
  created_at?: string;
  expires_at?: string;
}

export interface SolutionAPIKeyList {
  id: string;
  solution_id: string;
  key_name: string;
  api_key_preview: string;
  is_active: boolean;
  created_at?: string;
  last_used?: string;
  expires_at?: string;
}

export interface ContainerService {
  name: string;
  compute_pool: string;
  status: string;
  spec?: string;
  min_instances: number;
  max_instances: number;
  created_at: string;
  updated_at?: string;
  endpoint_url?: string;
  dns_name?: string;
}

export interface ComputePool {
  name: string;
  state: string;
  min_nodes: number;
  max_nodes: number;
  instance_family: string;
  created_at: string;
  owner?: string;
  comment?: string;
  auto_resume?: string;
  auto_suspend_secs?: string;
  num_nodes?: number;
  active_nodes?: number;
  idle_nodes?: number;
  total_uptime?: string;
  resource_utilization?: string;
}

export interface CreateTag {
  name: string;
}

export interface ParameterFilter {
  solution_id?: string;
  tags?: string[];
  key_pattern?: string;
  is_secret?: boolean;
}

export interface BulkParameterOperation {
  parameter_ids: string[];
  operation: 'delete' | 'tag' | 'untag';
  tags?: string[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
}

export interface NetworkPolicyStatus {
  current_policy: string;
  is_enabled: boolean;
  message: string;
}

class ApiService {
  private axiosInstance: AxiosInstance;

  constructor() {
    // Use relative URLs when proxy is configured, absolute URLs otherwise
    const baseURL = process.env.REACT_APP_API_BASE_URL || '/api';
    this.axiosInstance = axios.create({
      baseURL: baseURL,
      timeout: 60000, // Increased to 30 seconds for storage queries
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle errors
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic HTTP methods
  async get<T = any>(url: string, config?: any): Promise<AxiosResponse<T>> {
    return this.axiosInstance.get(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> {
    return this.axiosInstance.post(url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> {
    return this.axiosInstance.put(url, data, config);
  }

  async delete<T = any>(url: string, config?: any): Promise<AxiosResponse<T>> {
    return this.axiosInstance.delete(url, config);
  }

  // Authentication
  async login(account: string, username: string, password: string) {
    return this.post('/token', { account, username, password });
  }

  // Get current user info
  async getCurrentUser() {
    return this.get('/user/me');
  }

  // Solutions
  async getSolutions(): Promise<AxiosResponse<Solution[]>> {
    return this.get('/solutions');
  }

  async getSolution(id: string): Promise<AxiosResponse<Solution>> {
    return this.get(`/solutions/${id}`);
  }

  async createSolution(solution: CreateSolution): Promise<AxiosResponse<Solution>> {
    return this.post('/solutions', solution);
  }

  async updateSolution(id: string, solution: UpdateSolution): Promise<AxiosResponse<Solution>> {
    return this.put(`/solutions/${id}`, solution);
  }

  async deleteSolution(id: string): Promise<AxiosResponse<ApiResponse>> {
    return this.delete(`/solutions/${id}`);
  }

  // Parameters
  async createParameter(parameter: CreateParameter): Promise<AxiosResponse<Parameter>> {
    return this.post('/parameters', parameter);
  }

  async updateParameter(id: string, parameter: UpdateParameter): Promise<AxiosResponse<Parameter>> {
    return this.put(`/parameters/${id}`, parameter);
  }

  async deleteParameter(id: string): Promise<AxiosResponse<ApiResponse>> {
    return this.delete(`/parameters/${id}`);
  }

  async searchParameters(filter: ParameterFilter): Promise<AxiosResponse<Parameter[]>> {
    return this.post('/parameters/search', filter);
  }

  async getUnassignedParameters(): Promise<AxiosResponse<Parameter[]>> {
    return this.get('/parameters/unassigned');
  }

  async assignParameterToSolution(solutionId: string, parameterId: string): Promise<AxiosResponse<ApiResponse>> {
    return this.post(`/solutions/${solutionId}/parameters/${parameterId}`, {});
  }

  async removeParameterFromSolution(solutionId: string, parameterId: string): Promise<AxiosResponse<ApiResponse>> {
    return this.delete(`/solutions/${solutionId}/parameters/${parameterId}`);
  }

  async bulkParameterOperation(operation: BulkParameterOperation): Promise<AxiosResponse<ApiResponse>> {
    return this.post('/parameters/bulk', operation);
  }

  // Tags
  async getTags(): Promise<AxiosResponse<Tag[]>> {
    return this.get('/tags');
  }

  async createTag(tag: CreateTag): Promise<AxiosResponse<Tag>> {
    return this.post('/tags', tag);
  }

  async deleteTag(id: string): Promise<AxiosResponse<ApiResponse>> {
    return this.delete(`/tags/${id}`);
  }



  // Health check
  async healthCheck(): Promise<AxiosResponse<any>> {
    return this.get('/health');
  }

  // Container Services
  async getContainerServices(): Promise<AxiosResponse<ContainerService[]>> {
    return this.get('/container-services');
  }

  async getContainerService(serviceName: string): Promise<AxiosResponse<ContainerService>> {
    return this.get(`/container-services/${serviceName}`);
  }

  async startContainerService(serviceName: string): Promise<AxiosResponse<ApiResponse>> {
    return this.post(`/container-services/${serviceName}/start`, {});
  }

  async stopContainerService(serviceName: string): Promise<AxiosResponse<ApiResponse>> {
    return this.post(`/container-services/${serviceName}/stop`, {});
  }

  async createContainerService(serviceData: {
    name: string;
    compute_pool: string;
    spec: string;
    min_instances?: number;
    max_instances?: number;
  }): Promise<AxiosResponse<ApiResponse>> {
    return this.post('/container-services', serviceData);
  }

  async deleteContainerService(serviceName: string): Promise<AxiosResponse<ApiResponse>> {
    return this.delete(`/container-services/${serviceName}`);
  }

  // Compute Pools
  async getComputePools(): Promise<AxiosResponse<ComputePool[]>> {
    return this.get('/compute-pools');
  }

  async describeComputePool(poolName: string): Promise<AxiosResponse<{success: boolean, data: any}>> {
    return this.get(`/compute-pools/${poolName}`);
  }

  // Image Repositories and Images
  async getImageRepositories(): Promise<AxiosResponse<ImageRepository[]>> {
    return this.get('/image-repositories');
  }

  async getRepositoryImages(repositoryName: string, databaseName?: string, schemaName?: string): Promise<AxiosResponse<ContainerImage[]>> {
    const params = new URLSearchParams();
    if (databaseName) params.append('database_name', databaseName);
    if (schemaName) params.append('schema_name', schemaName);
    
    const queryString = params.toString();
    const url = `/image-repositories/${repositoryName}/images${queryString ? `?${queryString}` : ''}`;
    return this.get(url);
  }

  async getAllImages(): Promise<AxiosResponse<ContainerImage[]>> {
    return this.get('/images');
  }

  async createComputePool(poolData: {
    name: string;
    instance_family: string;
    min_nodes: number;
    max_nodes: number;
    auto_resume: boolean;
    auto_suspend_secs: number;
  }): Promise<AxiosResponse<ApiResponse>> {
    return this.post('/compute-pools', poolData);
  }

  async deleteComputePool(poolName: string): Promise<AxiosResponse<ApiResponse>> {
    return this.delete(`/compute-pools/${poolName}`);
  }

  async createImageRepository(repoData: {
    name: string;
    database?: string;
    schema?: string;
  }): Promise<AxiosResponse<ApiResponse>> {
    return this.post('/image-repositories', repoData);
  }

  async deleteImageRepository(repositoryName: string, databaseName?: string, schemaName?: string): Promise<AxiosResponse<ApiResponse>> {
    const params = new URLSearchParams();
    if (databaseName) params.append('database_name', databaseName);
    if (schemaName) params.append('schema_name', schemaName);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.delete(`/image-repositories/${repositoryName}${queryString}`);
  }

  // Databases and Schemas
  async getDatabases(): Promise<AxiosResponse<{success: boolean, data: Database[]}>> {
    return this.get('/databases');
  }

  async getSchemas(databaseName: string): Promise<AxiosResponse<{success: boolean, data: Schema[]}>> {
    return this.get(`/databases/${databaseName}/schemas`);
  }

  // Network Rules
  async getNetworkRules(): Promise<AxiosResponse<{success: boolean, data: NetworkRule[]}>> {
    return this.get('/network-rules');
  }

  async createNetworkRule(ruleData: NetworkRuleCreate): Promise<AxiosResponse<{message: string}>> {
    return this.post('/network-rules', ruleData);
  }

  async updateNetworkRule(ruleName: string, ruleData: NetworkRuleUpdate): Promise<AxiosResponse<{message: string}>> {
    return this.put(`/network-rules/${ruleName}`, ruleData);
  }

  async deleteNetworkRule(ruleName: string): Promise<AxiosResponse<{message: string}>> {
    return this.delete(`/network-rules/${ruleName}`);
  }

  async describeNetworkRule(ruleName: string): Promise<AxiosResponse<{success: boolean, data: any}>> {
    return this.get(`/network-rules/${ruleName}`);
  }

  // Network Policies
  async getNetworkPolicies(): Promise<AxiosResponse<{success: boolean, data: NetworkPolicy[]}>> {
    return this.get('/network-policies');
  }

  async createNetworkPolicy(policyData: NetworkPolicyCreate): Promise<AxiosResponse<{message: string}>> {
    return this.post('/network-policies', policyData);
  }

  async updateNetworkPolicy(policyName: string, policyData: NetworkPolicyUpdate): Promise<AxiosResponse<{message: string}>> {
    return this.put(`/network-policies/${policyName}`, policyData);
  }

  async deleteNetworkPolicy(policyName: string): Promise<AxiosResponse<{message: string}>> {
    return this.delete(`/network-policies/${policyName}`);
  }

  async describeNetworkPolicy(policyName: string): Promise<AxiosResponse<{success: boolean, data: any}>> {
    return this.get(`/network-policies/${policyName}`);
  }

  // Analytics
  async getCreditUsage(filter: CreditUsageFilter): Promise<AxiosResponse<CreditUsage[]>> {
    return this.post('/analytics/credit-usage', filter);
  }

  async getCreditUsageSummary(filter: CreditUsageFilter): Promise<AxiosResponse<ApiResponse<CreditUsageSummary>>> {
    return this.post('/analytics/credit-usage-summary', filter);
  }

  async getWarehouseCreditUsage(filter: CreditUsageFilter): Promise<AxiosResponse<any[]>> {
    return this.post('/analytics/warehouse-credit-usage', filter);
  }

  async getWarehouseCreditUsageSummary(filter: CreditUsageFilter): Promise<AxiosResponse<ApiResponse<any>>> {
    return this.post('/analytics/warehouse-credit-usage-summary', filter);
  }

  // Storage Usage
  async getStorageUsage(filter: CreditUsageFilter): Promise<AxiosResponse<ApiResponse<StorageUsage[]>>> {
    return this.post('/analytics/storage-usage', filter);
  }

  async getDatabaseStorageUsage(filter: CreditUsageFilter): Promise<AxiosResponse<ApiResponse<DatabaseStorageUsage[]>>> {
    return this.post('/analytics/database-storage-usage', filter);
  }

  async getStorageUsageSummary(filter: CreditUsageFilter): Promise<AxiosResponse<ApiResponse<StorageUsageSummary>>> {
    return this.post('/analytics/storage-usage-summary', filter);
  }

  // Solution Export
  async exportSolutionConfig(solutionId: string, format: string = 'json'): Promise<void> {
    const response = await this.axiosInstance.get(`/solutions/${solutionId}/export?format=${format}`, {
      responseType: 'blob',
      headers: {
        'Accept': format === 'json' ? 'application/json' : 
                 format === 'yaml' ? 'application/x-yaml' : 
                 'text/plain'
      }
    });

    // Create blob and download
    const blob = new Blob([response.data], { 
      type: response.headers['content-type'] || 'application/octet-stream' 
    });
    
    // Extract filename from Content-Disposition header
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'solution_config';
    if (contentDisposition) {
      const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
      if (matches != null && matches[1]) {
        filename = matches[1].replace(/['"]/g, '');
      }
    }
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // Solution API Keys
  async createSolutionAPIKey(solutionId: string, keyData: CreateSolutionAPIKey): Promise<AxiosResponse<SolutionAPIKeyResponse>> {
    return this.post(`/solutions/${solutionId}/api-keys`, keyData);
  }

  async getSolutionAPIKeys(solutionId: string): Promise<AxiosResponse<SolutionAPIKeyList[]>> {
    return this.get(`/solutions/${solutionId}/api-keys`);
  }

  async deleteSolutionAPIKey(solutionId: string, apiKeyId: string): Promise<AxiosResponse<any>> {
    return this.delete(`/solutions/${solutionId}/api-keys/${apiKeyId}`);
  }

  async toggleSolutionAPIKey(solutionId: string, apiKeyId: string, isActive: boolean): Promise<AxiosResponse<any>> {
    return this.axiosInstance.patch(`/solutions/${solutionId}/api-keys/${apiKeyId}/toggle?is_active=${isActive}`);
  }

  // Generate public API URL for third-party access
  generatePublicAPIUrl(apiKey: string, format: string = 'json'): string {
    const baseUrl = this.axiosInstance.defaults.baseURL?.replace('/api', '') || window.location.origin;
    return `${baseUrl}/api/public/solutions/config?api_key=${apiKey}&format=${format}`;
  }

  // Compute Pool Management
  async suspendComputePool(poolName: string): Promise<AxiosResponse<any>> {
    return this.post(`/compute-pools/${poolName}/suspend`);
  }

  async resumeComputePool(poolName: string): Promise<AxiosResponse<any>> {
    return this.post(`/compute-pools/${poolName}/resume`);
  }

  async getComputePoolLogs(poolName: string, limit: number = 100): Promise<AxiosResponse<any>> {
    return this.get(`/compute-pools/${poolName}/logs?limit=${limit}`);
  }

  getNetworkPolicyStatus() {
    return this.get('/network-policy-status');
  }

  enableNetworkPolicy(policyName: string) {
    return this.post(`/network-policies/${policyName}/enable`);
  }

  disableNetworkPolicy() {
    return this.post('/network-policies/disable');
  }
}

export const api = new ApiService(); 