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
}

export const api = new ApiService(); 