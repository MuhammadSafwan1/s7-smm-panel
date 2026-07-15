/**
 * Upload image to Cloudinary (free, no backend needed)
 * Free plan: 25GB storage + 25GB bandwidth/month, forever
 *
 * Setup:
 * 1. Sign up at https://cloudinary.com
 * 2. Dashboard → Settings → Upload → Add Upload Preset → set to Unsigned
 * 3. Add to .env.local:
 *    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
 *    NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_preset_name
 */

const CLOUD_NAME   = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

/**
 * Upload a file to Cloudinary
 * @param {File} file - The file to upload
 * @param {string} folder - Folder path in Cloudinary (e.g. 'support/userId')
 * @param {function} onProgress - Progress callback (0-100)
 * @returns {Promise<{url: string|null, error: string|null}>}
 */
export async function uploadToCloudinary(file, folder = 'support', onProgress = null) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    return { url: null, error: 'Cloudinary not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env.local' };
  }

  return new Promise((resolve) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', folder);

    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({ url: data.secure_url, error: null });
        } catch {
          resolve({ url: null, error: 'Invalid response from Cloudinary' });
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          resolve({ url: null, error: err.error?.message || `Upload failed (${xhr.status})` });
        } catch {
          resolve({ url: null, error: `Upload failed (${xhr.status})` });
        }
      }
    });

    xhr.addEventListener('error', () => {
      resolve({ url: null, error: 'Network error during upload' });
    });

    xhr.addEventListener('abort', () => {
      resolve({ url: null, error: 'Upload cancelled' });
    });

    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);
    xhr.send(formData);
  });
}
