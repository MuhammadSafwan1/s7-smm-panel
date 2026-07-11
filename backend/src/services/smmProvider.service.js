const axios = require('axios');
const { db } = require('../config/firebaseAdmin');

/**
 * Dynamic SMM Provider Service
 * Works with ANY provider stored in Firestore
 * No hardcoded API keys or URLs!
 */

class SMMProviderService {
  /**
   * Get provider configuration from Firestore
   */
  async getProviderConfig(providerId) {
    try {
      const doc = await db.collection('providers').doc(providerId).get();
      
      if (!doc.exists) {
        throw new Error(`Provider not found: ${providerId}`);
      }
      
      const provider = doc.data();
      
      if (!provider.isActive) {
        throw new Error(`Provider is inactive: ${provider.name}`);
      }
      
      if (!provider.apiKey || !provider.apiUrl) {
        throw new Error(`Provider not properly configured: ${provider.name}`);
      }
      
      return {
        id: doc.id,
        name: provider.name,
        apiUrl: provider.apiUrl,
        apiKey: provider.apiKey,
        type: provider.type || 'api_v2',
      };
    } catch (error) {
      console.error('Get provider config error:', error);
      throw error;
    }
  }

  /**
   * Get all active providers
   */
  async getAllActiveProviders() {
    try {
      const snapshot = await db.collection('providers')
        .where('isActive', '==', true)
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Get all active providers error:', error);
      return [];
    }
  }

  /**
   * Make API request to SMM provider (API v2 format)
   */
  async makeRequest(providerId, params) {
    try {
      const providerConfig = await this.getProviderConfig(providerId);

      const response = await axios.post(
        providerConfig.apiUrl,
        null,
        {
          params: {
            key: providerConfig.apiKey,
            ...params,
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 30000, // 30 seconds timeout
        }
      );

      return { 
        success: true, 
        data: response.data, 
        provider: providerConfig.name,
        providerId: providerConfig.id 
      };
    } catch (error) {
      const providerConfig = await this.getProviderConfig(providerId).catch(() => ({ name: providerId }));
      console.error(`${providerConfig.name} API Error:`, error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        provider: providerConfig.name,
        providerId,
      };
    }
  }

  /**
   * Test provider connection
   */
  async testConnection(providerId) {
    try {
      const result = await this.getBalance(providerId);
      return {
        success: result.success,
        message: result.success ? 'Connection successful' : `Connection failed: ${result.error}`,
        balance: result.data?.balance,
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection test failed: ${error.message}`,
      };
    }
  }

  /**
   * Get services from a provider
   */
  async getServices(providerId) {
    const result = await this.makeRequest(providerId, { action: 'services' });
    
    if (result.success && Array.isArray(result.data)) {
      return result.data;
    }
    
    throw new Error(result.error || 'Failed to get services');
  }

  /**
   * Get services from all active providers
   */
  async getAllServices() {
    const providers = await this.getAllActiveProviders();
    
    const results = await Promise.allSettled(
      providers.map(provider => this.getServices(provider.id))
    );

    const services = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const provider = providers[index];
        const providerServices = result.value.map((service) => ({
          ...service,
          provider: provider.id,
          providerName: provider.name,
        }));
        services.push(...providerServices);
      }
    });

    return { success: true, data: services };
  }

  /**
   * Create order (renamed from addOrder for clarity)
   */
  async createOrder(providerId, orderData) {
    const { service, link, quantity, runs, interval } = orderData;
    const params = {
      action: 'add',
      service,
      link,
      quantity,
    };

    if (runs) params.runs = runs;
    if (interval) params.interval = interval;

    const result = await this.makeRequest(providerId, params);
    
    if (result.success && result.data) {
      return result.data;
    }
    
    throw new Error(result.error || 'Failed to create order');
  }

  /**
   * Get order status
   */
  async getOrderStatus(providerId, orderId) {
    const result = await this.makeRequest(providerId, {
      action: 'status',
      order: orderId,
    });
    
    if (result.success && result.data) {
      return result.data;
    }
    
    throw new Error(result.error || 'Failed to get order status');
  }

  /**
   * Get multiple orders status
   */
  async getMultipleOrdersStatus(providerId, orderIds) {
    const result = await this.makeRequest(providerId, {
      action: 'status',
      orders: orderIds.join(','),
    });
    
    if (result.success && result.data) {
      return result.data;
    }
    
    throw new Error(result.error || 'Failed to get orders status');
  }

  /**
   * Create refill
   */
  async createRefill(providerId, orderId) {
    const result = await this.makeRequest(providerId, {
      action: 'refill',
      order: orderId,
    });
    
    if (result.success && result.data) {
      return result.data;
    }
    
    throw new Error(result.error || 'Failed to create refill');
  }

  /**
   * Get refill status
   */
  async getRefillStatus(providerId, refillId) {
    const result = await this.makeRequest(providerId, {
      action: 'refill_status',
      refill: refillId,
    });
    
    if (result.success && result.data) {
      return result.data;
    }
    
    throw new Error(result.error || 'Failed to get refill status');
  }

  /**
   * Cancel order(s)
   */
  async cancelOrder(providerId, orderIds) {
    const result = await this.makeRequest(providerId, {
      action: 'cancel',
      orders: Array.isArray(orderIds) ? orderIds.join(',') : orderIds,
    });
    
    if (result.success && result.data) {
      return result.data;
    }
    
    throw new Error(result.error || 'Failed to cancel order');
  }

  /**
   * Get provider balance
   */
  async getBalance(providerId) {
    const result = await this.makeRequest(providerId, { action: 'balance' });
    
    if (result.success && result.data) {
      return result;
    }
    
    throw new Error(result.error || 'Failed to get balance');
  }

  /**
   * Get balance from all active providers
   */
  async getAllBalances() {
    const providers = await this.getAllActiveProviders();
    
    const results = await Promise.allSettled(
      providers.map(provider => this.getBalance(provider.id))
    );

    const balances = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        const provider = providers[index];
        balances.push({
          providerId: provider.id,
          providerName: provider.name,
          balance: result.value.data.balance,
          currency: result.value.data.currency || 'USD',
        });
      }
    });

    return { success: true, data: balances };
  }
}

module.exports = new SMMProviderService();
