/**
 * Storage Service
 * Handles file uploads to Supabase storage with error handling and retry logic
 */

import { supabase } from "../supabaseClient.js";
import { verifyImageUrl } from "./imageProcessingService.js";

// Storage buckets
const BUCKETS = {
  PRODUCT_IMAGES: "product-images",
};

// Default configuration
const DEFAULT_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  debug: false,
};

/**
 * Uploads a file to Supabase storage with retry logic
 *
 * @param {File} file - File to upload
 * @param {string} path - Storage path (without bucket name)
 * @param {string} bucket - Storage bucket name
 * @param {Object} options - Upload options
 * @param {Object} config - Configuration for retry behavior
 * @returns {Promise<Object>} Promise resolving to upload result with public URL
 */
export const uploadFile = async (
  file,
  path,
  bucket = BUCKETS.PRODUCT_IMAGES,
  options = {},
  config = {}
) => {
  // Merge config with defaults
  const { maxRetries, retryDelay, debug } = { ...DEFAULT_CONFIG, ...config };

  if (!file) {
    throw new Error("No file provided for upload");
  }

  // Clean filename and ensure unique path to prevent collisions
  const timestamp = Date.now();
  const fileExtension = file.name.split(".").pop().toLowerCase() || "jpg";
  const filePath =
    path ||
    `uploads/${timestamp}-${Math.random()
      .toString(36)
      .substring(2, 10)}.${fileExtension}`;

  if (debug) {
    console.log(`Preparing to upload file to ${bucket}/${filePath}`);
    console.log(`File type: ${file.type}, size: ${file.size} bytes`);
  }

  // Default upload options
  const uploadOptions = {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type || "image/jpeg",
    ...options,
  };

  // Track retry attempts
  let attempts = 0;
  let lastError = null;

  // Retry loop
  while (attempts < maxRetries) {
    try {
      if (debug && attempts > 0) {
        console.log(`Upload attempt ${attempts + 1}/${maxRetries}`);
      }

      // Upload file to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, uploadOptions);

      if (uploadError) {
        throw new Error(`Storage upload error: ${uploadError.message}`);
      }

      if (!uploadData) {
        throw new Error("Upload completed but no data returned");
      }

      // Get the public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      if (!urlData || !urlData.publicUrl) {
        throw new Error("Failed to get public URL for uploaded file");
      }

      const publicUrl = urlData.publicUrl;

      // Verify the URL is accessible (important for ensuring upload was successful)
      const isUrlAccessible = await verifyImageUrl(publicUrl);

      if (!isUrlAccessible) {
        throw new Error("Uploaded file URL is not accessible");
      }

      if (debug) {
        console.log(`File successfully uploaded to ${bucket}/${filePath}`);
        console.log(`Public URL: ${publicUrl}`);
      }

      return {
        path: filePath,
        publicUrl,
        bucket,
        size: file.size,
        contentType: file.type,
      };
    } catch (error) {
      attempts++;
      lastError = error;

      // Log retry attempts
      if (debug) {
        console.warn(
          `Upload failed (attempt ${attempts}/${maxRetries}):`,
          error.message
        );
      }

      // Check if we should retry
      if (attempts >= maxRetries) {
        break;
      }

      // Handle specific errors that might be temporary
      const isTemporaryError =
        error.message.includes("network") ||
        error.message.includes("timeout") ||
        error.message.includes("connection") ||
        error.message.includes("temporarily");

      if (!isTemporaryError) {
        if (debug) {
          console.warn(
            "Non-temporary error, stopping retry attempts:",
            error.message
          );
        }
        break;
      }

      // Calculate delay with exponential backoff
      const backoffDelay = retryDelay * Math.pow(2, attempts - 1);
      const jitter = Math.random() * 200;
      const delay = backoffDelay + jitter;

      if (debug) {
        console.log(`Waiting ${Math.round(delay)}ms before retry...`);
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // If we get here, all retries failed
  throw new Error(
    `File upload failed after ${maxRetries} attempts: ${lastError?.message}`
  );
};

/**
 * Deletes a file from Supabase storage
 *
 * @param {string} path - Storage path to delete
 * @param {string} bucket - Storage bucket name
 * @returns {Promise<boolean>} Promise resolving to true if deletion was successful
 */
export const deleteFile = async (path, bucket = BUCKETS.PRODUCT_IMAGES) => {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      console.error("Error deleting file:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to delete file:", error);
    return false;
  }
};

/**
 * Generates a clean, unique path for a product image
 *
 * @param {string} userId - User ID
 * @param {string} filename - Original filename
 * @returns {string} Clean storage path
 */
export const generateProductImagePath = (userId, filename = "") => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 10);

  // Clean the filename to remove unsafe characters
  const cleanFilename = filename.replace(/[^a-zA-Z0-9.]/g, "_").toLowerCase();

  // Get the file extension or default to jpg
  const extension = cleanFilename.split(".").pop() || "jpg";

  // Create a user-specific subfolder in the uploads directory
  const path = `uploads/${userId}/${timestamp}-${randomSuffix}.${extension}`;

  // Log the generated path for debugging
  console.log("Generated storage path:", {
    originalFilename: filename,
    cleanedFilename: cleanFilename,
    userId: userId,
    timestamp: timestamp,
    finalPath: path,
  });

  return path;
};

export default {
  uploadFile,
  deleteFile,
  generateProductImagePath,
  BUCKETS,
};
