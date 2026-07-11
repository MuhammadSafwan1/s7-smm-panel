const express = require('express');
const axios = require('axios');
const router = express.Router();

// POST /api/proxy/smm
// Body: { apiUrl, apiKey, action, ...params }
router.post('/smm', async (req, res) => {
  const { apiUrl, apiKey, action, ...rest } = req.body;

  if (!apiUrl || !apiKey || !action) {
    return res.status(400).json({ error: 'Missing apiUrl, apiKey, or action' });
  }

  try {
    const params = new URLSearchParams({ key: apiKey, action, ...rest });

    const response = await axios.post(apiUrl, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 20000,
    });

    return res.json({ success: true, data: response.data });
  } catch (err) {
    return res.status(502).json({
      success: false,
      error: err.response?.data?.error || err.message,
    });
  }
});

module.exports = router;
