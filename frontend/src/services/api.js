import axios from 'axios';

const BASE_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8000/api';

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    this.client.interceptors.response.use(
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

  setAuthToken(token) {
    if (token) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.client.defaults.headers.common['Authorization'];
    }
  }

  // Authentication endpoints
  async login(username, password) {
    return this.client.post('/auth/login', { username, password });
  }

  async getCurrentUser() {
    return this.client.get('/auth/me');
  }

  // Configuration tables metadata
  async getConfigTables() {
    return this.client.get('/config/tables');
  }

  // App Settings endpoints
  async getAppSettings() {
    return this.client.get('/config/app-settings');
  }

  async createAppSetting(data) {
    return this.client.post('/config/app-settings', data);
  }

  async updateAppSetting(id, data) {
    return this.client.put(`/config/app-settings/${id}`, data);
  }

  async deleteAppSetting(id) {
    return this.client.delete(`/config/app-settings/${id}`);
  }

  // Database Settings endpoints
  async getDatabaseSettings() {
    return this.client.get('/config/database-settings');
  }

  async createDatabaseSetting(data) {
    return this.client.post('/config/database-settings', data);
  }

  async updateDatabaseSetting(id, data) {
    return this.client.put(`/config/database-settings/${id}`, data);
  }

  async deleteDatabaseSetting(id) {
    return this.client.delete(`/config/database-settings/${id}`);
  }

  // API Settings endpoints
  async getApiSettings() {
    return this.client.get('/config/api-settings');
  }

  async createApiSetting(data) {
    return this.client.post('/config/api-settings', data);
  }

  async updateApiSetting(id, data) {
    return this.client.put(`/config/api-settings/${id}`, data);
  }

  async deleteApiSetting(id) {
    return this.client.delete(`/config/api-settings/${id}`);
  }

  // Feature Flags endpoints
  async getFeatureFlags() {
    return this.client.get('/config/feature-flags');
  }

  async createFeatureFlag(data) {
    return this.client.post('/config/feature-flags', data);
  }

  async updateFeatureFlag(id, data) {
    return this.client.put(`/config/feature-flags/${id}`, data);
  }

  async deleteFeatureFlag(id) {
    return this.client.delete(`/config/feature-flags/${id}`);
  }

  // Health check
  async healthCheck() {
    return this.client.get('/health');
  }
}

export const api = new ApiService(); 