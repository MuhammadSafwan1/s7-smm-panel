// Cloudinary upload helper - 100% FREE!
// Free tier: 25GB storage, 25GB bandwidth/month

const CLOUDINARY_CLOUD_NAME = 'demo'; // Replace with your cloud name
const CLOUDINARY_UPLOAD_PRESET = 'ml_default'; // Replace with your upload preset

export const uploadToCloudinary = async (file, onProgress = null) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'smm-panel/avatars');

    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
      // Progress tracking
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            onProgress(Math.round(progress));
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          resolve({ url: response.secure_url, error: null });
        } else {
          reject({ url: null, error: 'Upload failed' });
        }
      });

      xhr.addEventListener('error', () => {
        reject({ url: null, error: 'Network error' });
      });

      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`);
      xhr.send(formData);
    });
  } catch (error) {
    return { url: null, error: error.message };
  }
};

// Alternative: ImgBB (100% free, no signup needed for basic use)
const IMGBB_API_KEY = 'demo'; // Get free key from https://api.imgbb.com/

export const uploadToImgBB = async (file, onProgress = null) => {
  try {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('key', IMGBB_API_KEY);

    if (onProgress) onProgress(50); // Fake progress

    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    
    if (onProgress) onProgress(100);

    if (data.success) {
      return { url: data.data.url, error: null };
    } else {
      return { url: null, error: 'Upload failed' };
    }
  } catch (error) {
    return { url: null, error: error.message };
  }
};
