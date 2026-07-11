
const express = require('express');
const router = express.Router();

/**
 * Generic provider proxy — bypasses CORS by making the request server-side
 * Accepts: { apiUrl, apiKey, action, search }
 */
router.post('/provider-proxy', async (req, res) => {
  try {
    const { apiUrl, apiKey, action, search } = req.body;

    if (!apiUrl || !apiKey || !action) {
      return res.status(400).json({ success: false, error: 'Missing apiUrl, apiKey, or action' });
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
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        error: `Provider responded with status ${response.status}`,
      });
    }

    const data = await response.json();
    return res.json({ success: true, data });
  } catch (err) {
    console.error('Provider proxy error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Proxy request failed' });
  }
});

module.exports = router;