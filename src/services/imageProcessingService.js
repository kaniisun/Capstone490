/**
 * Image Processing Service
 * Handles client-side image validation, optimization and preparation for upload
 */

// Maximum allowed file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;
// Valid image MIME types
const VALID_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];
// Maximum image dimensions
const MAX_IMAGE_DIMENSION = 2000;

/**
 * Validates image file before processing
 *
 * @param {File} file - The image file to validate
 * @returns {Object} Object containing validation result and any error message
 */
export const validateImage = (file) => {
  // Check if file exists
  if (!file) {
    return {
      valid: false,
      error: "No file selected",
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds the maximum allowed size of ${
        MAX_FILE_SIZE / (1024 * 1024)
      }MB`,
    };
  }

  // Check file type
  if (!VALID_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Supported formats: JPEG, PNG, WebP`,
    };
  }

  return { valid: true };
};

/**
 * Optimizes an image by resizing and compressing it for upload
 *
 * @param {File} file - The image file to optimize
 * @param {Object} options - Options for optimization
 * @returns {Promise<Object>} Promise resolving to an object with the optimized image data
 */
export const optimizeImage = async (file, options = {}) => {
  try {
    const {
      maxWidth = MAX_IMAGE_DIMENSION,
      maxHeight = MAX_IMAGE_DIMENSION,
      quality = 0.85,
    } = options;

    return new Promise((resolve, reject) => {
      // Create a FileReader to read the file
      const reader = new FileReader();

      reader.onload = (event) => {
        // Create an image element to get dimensions
        const img = new Image();

        img.onload = () => {
          try {
            // Calculate new dimensions while maintaining aspect ratio
            let width = img.width;
            let height = img.height;

            if (width > maxWidth || height > maxHeight) {
              if (width > height) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              } else {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
              }
            }

            // Create canvas for resizing
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;

            // Draw and resize image
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to blob with compression
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error("Failed to convert image to blob"));
                  return;
                }

                // Create a new file from the blob
                const optimizedFile = new File([blob], file.name, {
                  type: "image/jpeg",
                });

                // Create a preview URL for the UI
                const previewUrl = URL.createObjectURL(optimizedFile);

                resolve({
                  file: optimizedFile,
                  preview: previewUrl,
                  width,
                  height,
                  originalSize: file.size,
                  optimizedSize: blob.size,
                  compressionRatio: blob.size / file.size,
                });
              },
              "image/jpeg",
              quality
            );
          } catch (error) {
            reject(new Error(`Image optimization failed: ${error.message}`));
          }
        };

        img.onerror = () => {
          reject(new Error("Failed to load image for optimization"));
        };

        img.src = event.target.result;
      };

      reader.onerror = () => {
        reject(new Error("Failed to read image file"));
      };

      reader.readAsDataURL(file);
    });
  } catch (error) {
    console.error("Image optimization error:", error);
    throw new Error(`Failed to optimize image: ${error.message}`);
  }
};

/**
 * Converts an image file to a base64 string for API requests
 *
 * @param {File} file - The image file to convert
 * @returns {Promise<string>} Promise resolving to base64 string
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Extract the base64 part (removing the data:image/jpeg;base64, prefix)
      const base64String = reader.result.split(",")[1];
      resolve(base64String);
    };
    reader.onerror = (error) => {
      reject(new Error(`Error converting file to base64: ${error}`));
    };
  });
};

/**
 * Checks if an image URL is accessible
 *
 * @param {string} url - Image URL to verify
 * @returns {Promise<boolean>} Promise resolving to true if URL is accessible
 */
export const verifyImageUrl = async (url) => {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch (error) {
    console.error("Image URL verification failed:", error);
    return false;
  }
};

export default {
  validateImage,
  optimizeImage,
  fileToBase64,
  verifyImageUrl,
};
