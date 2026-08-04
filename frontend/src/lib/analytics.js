import { logEvent } from 'firebase/analytics';
import { analytics } from '@/firebase/firebase.config';

/**
 * Log page view to Google Analytics
 * @param {string} page_title - Title of the page
 * @param {string} page_path - Path of the page
 */
export const logPageView = (page_title, page_path) => {
  if (analytics) {
    logEvent(analytics, 'page_view', {
      page_title,
      page_path,
      page_location: window.location.href,
    });
    console.log('📊 Page view logged:', page_path);
  }
};

/**
 * Log custom event to Google Analytics
 * @param {string} eventName - Name of the event
 * @param {object} eventParams - Parameters for the event
 */
export const logAnalyticsEvent = (eventName, eventParams = {}) => {
  if (analytics) {
    logEvent(analytics, eventName, eventParams);
    console.log('📊 Event logged:', eventName, eventParams);
  }
};

/**
 * Log order creation
 */
export const logOrderCreated = (orderId, serviceId, amount) => {
  logAnalyticsEvent('order_created', {
    order_id: orderId,
    service_id: serviceId,
    value: amount,
    currency: 'PKR',
  });
};

/**
 * Log payment/add funds
 */
export const logPayment = (method, amount) => {
  logAnalyticsEvent('payment_initiated', {
    payment_method: method,
    value: amount,
    currency: 'PKR',
  });
};

/**
 * Log user registration
 */
export const logUserRegistration = (method = 'email') => {
  logAnalyticsEvent('sign_up', {
    method,
  });
};

/**
 * Log user login
 */
export const logUserLogin = (method = 'email') => {
  logAnalyticsEvent('login', {
    method,
  });
};

/**
 * Log search
 */
export const logSearch = (searchTerm, category = 'service') => {
  logAnalyticsEvent('search', {
    search_term: searchTerm,
    category,
  });
};
