import { trace } from 'firebase/performance';
import { performance } from '@/firebase/firebase.config';

/**
 * Track custom performance metric
 * @param {string} traceName - Name of the trace
 * @param {Function} operation - Async operation to track
 */
export const trackPerformance = async (traceName, operation) => {
  if (!performance) {
    return await operation();
  }

  const perfTrace = trace(performance, traceName);
  perfTrace.start();

  try {
    const result = await operation();
    perfTrace.stop();
    return result;
  } catch (error) {
    perfTrace.stop();
    throw error;
  }
};

/**
 * Track API call performance
 */
export const trackAPICall = async (apiName, apiCall) => {
  return trackPerformance(`api_${apiName}`, apiCall);
};

/**
 * Track page load performance
 */
export const trackPageLoad = (pageName) => {
  if (!performance) return;

  const perfTrace = trace(performance, `page_load_${pageName}`);
  perfTrace.start();

  // Stop trace after page fully loaded
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      perfTrace.stop();
    });
  }
};

/**
 * Track order creation performance
 */
export const trackOrderCreation = async (orderOperation) => {
  return trackPerformance('order_creation', orderOperation);
};

/**
 * Track service fetch performance
 */
export const trackServiceFetch = async (serviceFetchOperation) => {
  return trackPerformance('service_fetch', serviceFetchOperation);
};
