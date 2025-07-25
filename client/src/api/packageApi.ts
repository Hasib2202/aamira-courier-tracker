// src/api/packageApi.ts
import axios from 'axios';
import { Package, PackageDetail } from '../types/package';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

interface GetPackagesParams {
  status?: string;
  active_only?: boolean;
  limit?: number;
  offset?: number;
  search?: string;
}

interface GetPackagesResponse {
  packages: Package[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export const packageApi = {
  async getPackages(params: GetPackagesParams = {}): Promise<GetPackagesResponse> {
    const response = await apiClient.get('/packages', { params });
    return response.data;
  },

  async getPackageDetail(packageId: string): Promise<PackageDetail> {
    const response = await apiClient.get(`/packages/${packageId}`);
    return response.data;
  },

  async updatePackage(packageData: {
    package_id: string;
    status: string;
    lat?: number;
    lon?: number;
    timestamp: string;
    note?: string;
    eta?: string;
  }) {
    const response = await apiClient.post('/packages/update', packageData);
    return response.data;
  },
};

export const authApi = {
  async login(email: string, password: string) {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  async getApiToken(deviceId: string) {
    const response = await apiClient.post('/auth/api-token', { deviceId });
    return response.data;
  },
};
