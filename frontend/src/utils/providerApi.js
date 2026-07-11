import apiClient from './api';

/**
 * Provider Management API
 * Admin-only endpoints for managing SMM providers
 */

export const providerApi = {
  // Get all providers
  getAllProviders: async (activeOnly = false) => {
    return apiClient.get('/providers', {
      params: { active: activeOnly }
    });
  },

  // Get single provider
  getProvider: async (id) => {
    return apiClient.get(`/providers/${id}`);
  },

  // Create new provider
  createProvider: async (providerData) => {
    return apiClient.post('/providers', providerData);
  },

  // Update provider
  updateProvider: async (id, providerData) => {
    return apiClient.put(`/providers/${id}`, providerData);
  },

  // Delete provider
  deleteProvider: async (id) => {
    return apiClient.delete(`/providers/${id}`);
  },

  // Test provider connection
  testConnection: async (id) => {
    return apiClient.post(`/providers/${id}/test`);
  },

  // Check provider balance
  checkBalance: async (id) => {
    return apiClient.get(`/providers/${id}/balance`);
  },

  // Get provider services (for syncing)
  getProviderServices: async (id) => {
    return apiClient.get(`/providers/${id}/services`);
  },

  // Sync services from provider
  syncServices: async (providerId, platformId = null, categoryId = null) => {
    return apiClient.post('/services/sync', {
      providerId,
      platformId,
      categoryId
    });
  },
};

export default providerApi;
