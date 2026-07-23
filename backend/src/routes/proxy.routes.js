const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const router = express.Router();

// POST /api/proxy/cloudinary
// Upload image to Cloudinary via backend proxy
router.post('/cloudinary', async (req, res) => {
  try {
    const { file, folder = 'site_logos' } = req.body;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      return res.status(500).json({
        success: false,
        error: 'Cloudinary not configured on server'
      });
    }

    // Create FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', folder);

    console.log('📤 Uploading to Cloudinary via proxy...');

    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      formData,
      {
        headers: formData.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 60000
      }
    );

    console.log('✅ Cloudinary upload successful');

    return res.json({
      success: true,
      url: response.data.secure_url,
      data: response.data
    });

  } catch (err) {
    console.error('❌ Cloudinary proxy error:', err.message);
    return res.status(500).json({
      success: false,
      error: err.response?.data?.error?.message || err.message || 'Upload failed'
    });
  }
});

// POST /api/proxy/smm
// Body: { apiUrl, apiKey, action, ...params }
router.post('/smm', async (req, res) => {
  const { apiUrl, apiKey, action, ...rest } = req.body;

  if (!apiUrl || !apiKey || !action) {
    return res.status(400).json({ 
      success: false,
      error: 'Missing required fields: apiUrl, apiKey, or action' 
    });
  }

  try {
    console.log('=== SMM PROXY REQUEST ===');
    console.log('Action:', action);
    console.log('API URL:', apiUrl);
    console.log('Params:', rest);

    const params = new URLSearchParams({ key: apiKey, action, ...rest });

    const response = await axios.post(apiUrl, params.toString(), {
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      timeout: 30000, // 30 seconds
      validateStatus: () => true, // Accept any status code
    });

    console.log('=== PROVIDER RESPONSE ===');
    console.log('Status:', response.status);
    console.log('Data type:', typeof response.data);
    console.log('Data sample:', JSON.stringify(response.data).substring(0, 200));

    // Check if response is valid JSON
    if (typeof response.data === 'string') {
      try {
        const parsed = JSON.parse(response.data);
        return res.json({ success: true, data: parsed });
      } catch (e) {
        console.error('JSON parse error:', e);
        return res.status(502).json({
          success: false,
          error: 'Provider returned invalid JSON response',
          rawResponse: response.data.substring(0, 500)
        });
      }
    }

    // Check for provider-level errors
    if (response.data && response.data.error) {
      return res.status(502).json({
        success: false,
        error: `Provider error: ${response.data.error}`
      });
    }

    return res.json({ success: true, data: response.data });
    
  } catch (err) {
    console.error('=== PROXY ERROR ===');
    console.error('Message:', err.message);
    console.error('Code:', err.code);
    if (err.response) {
      console.error('Response status:', err.response.status);
      console.error('Response data:', err.response.data);
    }

    let errorMessage = err.message;
    
    // Provide better error messages
    if (err.code === 'ECONNREFUSED') {
      errorMessage = 'Cannot connect to provider API. Please check the API URL.';
    } else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
      errorMessage = 'Provider API request timeout. The provider may be slow or down.';
    } else if (err.response?.status === 401 || err.response?.status === 403) {
      errorMessage = 'Invalid API credentials. Please check your API key.';
    } else if (err.response?.status === 404) {
      errorMessage = 'Provider API endpoint not found. Please check the API URL.';
    } else if (err.response?.data?.error) {
      errorMessage = err.response.data.error;
    }

    return res.status(502).json({
      success: false,
      error: errorMessage,
      details: err.code || err.response?.status
    });
  }
});

module.exports = router;