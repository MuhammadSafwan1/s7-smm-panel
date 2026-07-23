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
    console.error('❌ Cloudinary config missing:', { CLOUD_NAME: !!CLOUD_NAME, UPLOAD_PRESET: !!UPLOAD_PRESET });
    return { url: null, error: 'Cloudinary not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env.local' };
  }

  console.log('📤 Cloudinary Upload Config:', {
    cloudName: CLOUD_NAME,
    uploadPreset: UPLOAD_PRESET,
    folder,
    fileSize: file.size,
    fileName: file.name,
    fileType: file.type
  });

  return new Promise((resolve) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', folder);

    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = Math.round((e.loaded / e.total) * 100);
        console.log(`📊 Upload progress: ${e.loaded} / ${e.total} bytes (${progress}%)`);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      console.log('📥 Upload response status:', xhr.status);
      if (xhr.status === 200) {
        try {
          const data = JSON.parse(xhr.responseText);
          console.log('✅ Upload successful:', data.secure_url);
          resolve({ url: data.secure_url, error: null });
        } catch (parseError) {
          console.error('❌ Parse error:', parseError);
          resolve({ url: null, error: 'Invalid response from Cloudinary' });
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          console.error('❌ Upload failed:', err);
          resolve({ url: null, error: err.error?.message || `Upload failed (${xhr.status})` });
        } catch {
          console.error('❌ Upload failed with status:', xhr.status, xhr.responseText);
          resolve({ url: null, error: `Upload failed (${xhr.status})` });
        }
      }
    });

    xhr.addEventListener('error', (e) => {
      console.error('❌ Network error:', e);
      console.error('XHR details:', {
        readyState: xhr.readyState,
        status: xhr.status,
        statusText: xhr.statusText
      });
      resolve({ url: null, error: 'Network error during upload. Please check your internet connection.' });
    });

    xhr.addEventListener('abort', () => {
      console.warn('⚠️ Upload aborted');
      resolve({ url: null, error: 'Upload cancelled' });
    });

    xhr.addEventListener('timeout', () => {
      console.error('⏱️ Upload timeout');
      resolve({ url: null, error: 'Upload timed out. Please try again.' });
    });

    // Set timeout to 60 seconds
    xhr.timeout = 60000;

    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;
    console.log('🌐 Uploading to:', uploadUrl);
    
    xhr.open('POST', uploadUrl);
    xhr.send(formData);
  });
}
