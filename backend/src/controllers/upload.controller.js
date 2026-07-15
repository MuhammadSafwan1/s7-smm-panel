const axios = require('axios');
const FormData = require('form-data');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Upload image via backend proxy (bypasses CORS)
const uploadImage = async (req, res) => {
  try {
    const { image } = req.body; // base64 image
    
    if (!image) {
      return errorResponse(res, 'No image provided', 400);
    }

    // Upload to Imgur via backend
    const formData = new FormData();
    formData.append('image', image);
    formData.append('type', 'base64');

    const response = await axios.post('https://api.imgur.com/3/image', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': 'Client-ID 546c25a59c58ad7',
      },
    });

    if (response.data.success) {
      return successResponse(res, {
        url: response.data.data.link,
      }, 'Image uploaded successfully');
    } else {
      return errorResponse(res, 'Upload failed', 500);
    }
  } catch (error) {
    console.error('Upload error:', error.response?.data || error.message);
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  uploadImage,
};
