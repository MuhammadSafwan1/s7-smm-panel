import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
} from 'firebase/storage';
import app from './firebase.config';

const storage = getStorage(app);

// Upload a file to Firebase Storage
export const uploadFile = async (file, path, onProgress = null) => {
  try {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(progress);
        },
        (error) => {
          reject({ url: null, error: error.message });
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({ url: downloadURL, error: null });
          } catch (error) {
            reject({ url: null, error: error.message });
          }
        }
      );
    });
  } catch (error) {
    return { url: null, error: error.message };
  }
};

// Upload multiple files
export const uploadMultipleFiles = async (files, basePath, onProgress = null) => {
  try {
    const uploadPromises = files.map((file, index) => {
      const timestamp = Date.now();
      const extension = file.name.split('.').pop();
      const fileName = `${timestamp}_${index}.${extension}`;
      const filePath = `${basePath}/${fileName}`;
      return uploadFile(file, filePath, (progress) => {
        if (onProgress) onProgress(progress, index);
      });
    });

    const results = await Promise.all(uploadPromises);
    const urls = results.map((r) => r.url).filter(Boolean);
    return { urls, error: null };
  } catch (error) {
    return { urls: [], error: error.message };
  }
};

// Delete a file
export const deleteFile = async (url) => {
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

// Upload account image
export const uploadAccountImage = async (file, accountId, onProgress = null) => {
  const path = `accounts/${accountId}/${Date.now()}_${file.name}`;
  return uploadFile(file, path, onProgress);
};

// Upload category image
export const uploadCategoryImage = async (file, categoryId, onProgress = null) => {
  const path = `categories/${categoryId}/${Date.now()}_${file.name}`;
  return uploadFile(file, path, onProgress);
};

// Upload avatar image
export const uploadAvatar = async (file, userId, onProgress = null) => {
  const path = `avatars/${userId}/${Date.now()}_${file.name}`;
  return uploadFile(file, path, onProgress);
};

export { storage };