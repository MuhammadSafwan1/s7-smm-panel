const functions = require('firebase-functions');
const cors = require('cors');
const express = require('express');
const fetch = require('node-fetch');

// Import your backend app
const app = require('../backend/src/server');

// Wrap Express app for Cloud Functions
const api = express();

// Enable CORS
api.use(cors({ 
  origin: true,
  credentials: true 
}));

// Mount backend routes
api.use('/api', app);

// Export as Cloud Function
exports.api = functions.https.onRequest(api);

/**
 * Standalone provider proxy function — bypasses CORS
 * Call this from the frontend to fetch services from SMM providers
 */
exports.providerProxy = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { apiUrl, apiKey, action } = req.body;

    if (!apiUrl || !apiKey || !action) {
      res.status(400).json({ success: false, error: 'Missing apiUrl, apiKey, or action' });
      return;
    }

    // Build the request params
    const params = new URLSearchParams();
    params.append('key', apiKey);
    params.append('action', action);

    // Build URL
    const url = `${apiUrl}?${params.toString()}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000,
    });

    if (!response.ok) {
      res.status(502).json({
        success: false,
        error: `Provider responded with status ${response.status}`,
      });
      return;
    }

    const data = await response.json();
    res.json({ success: true, data });
  } catch (err) {
    console.error('Provider proxy error:', err);
    res.status(500).json({ success: false, error: err.message || 'Proxy request failed' });
  }
});