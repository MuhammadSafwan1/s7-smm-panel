import axios from 'axios';
import { auth } from '@/firebase/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 3000, // 3 second timeout (faster than 5s)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Don't show timeout errors in console to avoid spam
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.log('API timeout - backend not deployed');
      return Promise.reject(new Error('Backend API not available'));
    }
    
    const message = error.response?.data?.error || error.message || 'An error occurred';
    return Promise.reject(new Error(message));
  }
);

// ==================== SMM API ====================

export const smmApi = {
  // Get all services from all providers
  getAllServices: () => apiClient.get('/smm/services'),

  // Get services from specific provider
  getProviderServices: (provider) => apiClient.get(`/smm/services/${provider}`),

  // Create new order
  createOrder: (orderData) => apiClient.post('/smm/orders', orderData),

  // Get user orders
  getUserOrders: (params) => apiClient.get('/smm/orders/user', { params }),

  // Get order status
  getOrderStatus: (orderId) => apiClient.get(`/smm/orders/${orderId}`),

  // Create refill
  createRefill: (orderId) => apiClient.post(`/smm/orders/${orderId}/refill`),

  // Cancel order
  cancelOrder: (orderId) => apiClient.post(`/smm/orders/${orderId}/cancel`),

  // Admin: Get all orders
  getAllOrders: (params) => apiClient.get('/smm/admin/orders', { params }),

  // Admin: Get provider balances
  getProviderBalances: () => apiClient.get('/smm/admin/balances'),
};

// ==================== PAYMENT API ====================

export const paymentApi = {
  // Add funds
  addFunds: (data) => apiClient.post('/payments/add-funds', data),

  // Get payment history
  getPaymentHistory: () => apiClient.get('/payments/history'),
};

// ==================== ADMIN API ====================

export const adminApi = {
  // Get all users
  getAllUsers: () => apiClient.get('/admin/users'),

  // Update user
  updateUser: (uid, data) => apiClient.put(`/admin/users/${uid}`, data),

  // Delete user
  deleteUser: (uid) => apiClient.delete(`/admin/users/${uid}`),

  // Get statistics
  getStatistics: () => apiClient.get('/admin/statistics'),
};

export default apiClient;
