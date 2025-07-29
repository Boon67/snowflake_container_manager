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

// User Management Interfaces
export interface User {
  id: string;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role: string;
  is_active: boolean;
  is_sso_user: boolean;
  sso_provider?: string;
  sso_user_id?: string;
  use_snowflake_auth: boolean;
  last_login?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateUser {
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  password?: string;
  role?: string;
  is_active?: boolean;
  is_sso_user?: boolean;
  sso_provider?: string;
  sso_user_id?: string;
  use_snowflake_auth?: boolean;
}

export interface UpdateUser {
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  is_active?: boolean;
  is_sso_user?: boolean;
  sso_provider?: string;
  sso_user_id?: string;
  use_snowflake_auth?: boolean;
}

export interface PasswordResetRequest {
  username: string;
}

export interface PasswordReset {
  username: string;
  new_password: string;
  reset_token?: string;
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
  period_start: string;
  period_end: string;
  compute_pools: CreditUsage[];
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
  data?: T;
}

class ApiService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api',
      timeout: 10000,
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
  async login(username: string, password: string) {
    return this.post('/token', { username, password });
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

  // User Management
  async getUsers(): Promise<AxiosResponse<User[]>> {
    return this.get('/users');
  }

  async createUser(user: CreateUser): Promise<AxiosResponse<User>> {
    return this.post('/users', user);
  }

  async getUser(id: string): Promise<AxiosResponse<User>> {
    return this.get(`/users/${id}`);
  }

  async updateUser(id: string, user: UpdateUser): Promise<AxiosResponse<User>> {
    return this.put(`/users/${id}`, user);
  }

  async deleteUser(id: string): Promise<AxiosResponse<ApiResponse>> {
    return this.delete(`/users/${id}`);
  }

  async requestPasswordReset(request: PasswordResetRequest): Promise<AxiosResponse<any>> {
    return this.post('/users/password-reset-request', request);
  }

  async resetPassword(reset: PasswordReset): Promise<AxiosResponse<ApiResponse>> {
    return this.post('/users/password-reset', reset);
  }

  async adminResetPassword(userId: string, newPassword: string): Promise<AxiosResponse<ApiResponse>> {
    return this.post(`/users/${userId}/reset-password`, { new_password: newPassword });
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

  // Compute Pools
  async getComputePools(): Promise<AxiosResponse<ComputePool[]>> {
    return this.get('/compute-pools');
  }

  // Analytics
  async getCreditUsage(filter: CreditUsageFilter): Promise<AxiosResponse<CreditUsage[]>> {
    return this.post('/analytics/credit-usage', filter);
  }

  async getCreditUsageSummary(filter: CreditUsageFilter): Promise<AxiosResponse<CreditUsageSummary>> {
    return this.post('/analytics/credit-usage-summary', filter);
  }

  async getDailyCreditRollup(filter: CreditUsageFilter): Promise<AxiosResponse<any>> {
    return this.post('/analytics/daily-credit-rollup', filter);
  }

  async getHourlyHeatmap(filter: CreditUsageFilter): Promise<AxiosResponse<any>> {
    return this.post('/analytics/hourly-heatmap', filter);
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
}

export const api = new ApiService(); 