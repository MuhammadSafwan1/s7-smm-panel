const { db } = require('../config/firebaseAdmin');
const { Timestamp, FieldValue } = require('firebase-admin/firestore');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const smmProviderService = require('../services/smmProvider.service');

/**
 * Sync services from ALL providers and detect changes
 * This endpoint should be called periodically (e.g., every 6-12 hours)
 */
const syncProvidersServices = async (req, res) => {
  try {
    const syncResults = {
      totalProviders: 0,
      syncedProviders: 0,
      failedProviders: [],
      totalServices: 0,
      newServices: 0,
      updatedServices: 0,
      deletedServices: 0,
      priceChanges: [],
    };

    // Get all active providers
    const providersSnapshot = await db.collection('providers')
      .where('isActive', '==', true)
      .get();

    syncResults.totalProviders = providersSnapshot.size;

    for (const providerDoc of providersSnapshot.docs) {
      const providerId = providerDoc.id;
      const providerData = providerDoc.data();

      try {
        console.log(`[SYNC] Starting sync for provider: ${providerData.name}`);

        // Fetch services from provider API
        const providerServices = await smmProviderService.getServices(providerId);

        if (!providerServices || !Array.isArray(providerServices)) {
          throw new Error('Invalid response from provider API');
        }

        console.log(`[SYNC] Fetched ${providerServices.length} services from ${providerData.name}`);

        // Get existing services for this provider from Firestore
        const existingServicesSnapshot = await db.collection('services')
          .where('provider', '==', providerId)
          .get();

        const existingServices = {};
        existingServicesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          existingServices[data.providerServiceId] = {
            id: doc.id,
            ...data,
          };
        });

        // Track provider service IDs that still exist
        const activeProviderServiceIds = new Set();

        // Process each service from provider
        for (const providerService of providerServices) {
          const providerServiceId = String(providerService.service);
          activeProviderServiceIds.add(providerServiceId);

          const providerPrice = parseFloat(providerService.rate);
          const existingService = existingServices[providerServiceId];

          if (existingService) {
            // Service exists - check for updates
            const updates = {};
            let hasChanges = false;

            // Check price change
            if (Math.abs(existingService.providerPrice - providerPrice) > 0.001) {
              updates.providerPrice = providerPrice;
              updates.oldProviderPrice = existingService.providerPrice;
              updates.priceChanged = true;
              updates.priceChangedAt = Timestamp.now();
              
              // Recalculate selling price (keep same profit)
              updates.price = providerPrice + (existingService.profit || 0);
              
              hasChanges = true;

              // Track price change
              syncResults.priceChanges.push({
                serviceId: existingService.id,
                serviceName: existingService.name,
                provider: providerData.name,
                oldPrice: existingService.providerPrice,
                newPrice: providerPrice,
                change: providerPrice - existingService.providerPrice,
                changePercent: ((providerPrice - existingService.providerPrice) / existingService.providerPrice * 100).toFixed(2),
              });
            }

            // Update service name if changed
            if (providerService.name && providerService.name !== existingService.name) {
              updates.name = providerService.name;
              hasChanges = true;
            }

            // Update min/max if changed
            if (providerService.min && parseInt(providerService.min) !== existingService.minQuantity) {
              updates.minQuantity = parseInt(providerService.min);
              hasChanges = true;
            }
            if (providerService.max && parseInt(providerService.max) !== existingService.maxQuantity) {
              updates.maxQuantity = parseInt(providerService.max);
              hasChanges = true;
            }

            if (hasChanges) {
              updates.updatedAt = Timestamp.now();
              updates.lastSyncedAt = Timestamp.now();
              
              await db.collection('services').doc(existingService.id).update(updates);
              syncResults.updatedServices++;
              console.log(`[SYNC] Updated service: ${existingService.name}`);
            } else {
              // No changes, just update lastSyncedAt
              await db.collection('services').doc(existingService.id).update({
                lastSyncedAt: Timestamp.now(),
              });
            }
          } else {
            // New service - could be auto-added (but disabled by default)
            // For now, just log it - admin can manually add if needed
            console.log(`[SYNC] New service detected (not auto-added): ${providerService.name} (ID: ${providerServiceId})`);
            syncResults.newServices++;
          }
        }

        // Find deleted services (exist in Firestore but not in provider API)
        for (const [providerServiceId, existingService] of Object.entries(existingServices)) {
          if (!activeProviderServiceIds.has(providerServiceId)) {
            // Service no longer exists in provider
            console.log(`[SYNC] Service deleted from provider: ${existingService.name}`);
            
            // Mark as inactive and deleted
            await db.collection('services').doc(existingService.id).update({
              isActive: false,
              deletedFromProvider: true,
              deletedAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            });
            
            syncResults.deletedServices++;
          }
        }

        syncResults.totalServices += providerServices.length;
        syncResults.syncedProviders++;

        // Update provider last synced time
        await db.collection('providers').doc(providerId).update({
          lastSyncedAt: Timestamp.now(),
        });

      } catch (error) {
        console.error(`[SYNC] Error syncing provider ${providerData.name}:`, error);
        syncResults.failedProviders.push({
          id: providerId,
          name: providerData.name,
          error: error.message,
        });
      }
    }

    // Store sync log
    await db.collection('syncLogs').add({
      ...syncResults,
      syncedAt: Timestamp.now(),
      status: syncResults.failedProviders.length === 0 ? 'success' : 'partial',
    });

    console.log('[SYNC] Sync completed:', syncResults);

    return successResponse(res, syncResults, 'Provider services sync completed');
  } catch (error) {
    console.error('[SYNC] Sync error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get price change alerts for admin
 */
const getPriceChangeAlerts = async (req, res) => {
  try {
    const { limit: limitParam } = req.query;
    const limitValue = parseInt(limitParam) || 50;

    // Get services with recent price changes
    const servicesSnapshot = await db.collection('services')
      .where('priceChanged', '==', true)
      .orderBy('priceChangedAt', 'desc')
      .limit(limitValue)
      .get();

    const alerts = [];

    for (const doc of servicesSnapshot.docs) {
      const service = { id: doc.id, ...doc.data() };
      
      // Get provider name
      const providerDoc = await db.collection('providers').doc(service.provider).get();
      const providerName = providerDoc.exists ? providerDoc.data().name : 'Unknown';

      alerts.push({
        serviceId: service.id,
        serviceName: service.name,
        provider: providerName,
        oldPrice: service.oldProviderPrice,
        newPrice: service.providerPrice,
        change: service.providerPrice - service.oldProviderPrice,
        changePercent: ((service.providerPrice - service.oldProviderPrice) / service.oldProviderPrice * 100).toFixed(2),
        changedAt: service.priceChangedAt,
      });
    }

    return successResponse(res, alerts, 'Price change alerts retrieved successfully');
  } catch (error) {
    console.error('Get price alerts error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Mark price change as acknowledged
 */
const acknowledgePriceChange = async (req, res) => {
  try {
    const { serviceId } = req.params;

    await db.collection('services').doc(serviceId).update({
      priceChanged: false,
      priceAcknowledgedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return successResponse(res, null, 'Price change acknowledged');
  } catch (error) {
    console.error('Acknowledge price change error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get sync history logs
 */
const getSyncLogs = async (req, res) => {
  try {
    const { limit: limitParam } = req.query;
    const limitValue = parseInt(limitParam) || 20;

    const logsSnapshot = await db.collection('syncLogs')
      .orderBy('syncedAt', 'desc')
      .limit(limitValue)
      .get();

    const logs = logsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return successResponse(res, logs, 'Sync logs retrieved successfully');
  } catch (error) {
    console.error('Get sync logs error:', error);
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  syncProvidersServices,
  getPriceChangeAlerts,
  acknowledgePriceChange,
  getSyncLogs,
};
