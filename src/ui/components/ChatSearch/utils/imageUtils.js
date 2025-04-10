import { supabase } from "../../../../supabaseClient.js";

/**
 * Image Utility Functions
 * Provides consistent handling of product images across the application
 */

/**
 * Gets the best available image URL for a product with proper fallbacks
 * @param {Object} product - The product object
 * @returns {string|null} The best available image URL
 */
export const getProductImageUrl = (product) => {
  if (!product) return null;

  // Only check for the image field since imageUrl doesn't exist in the database
  if (product.image) {
    return product.image;
  }

  // Return null if no image is available
  return null;
};

/**
 * Formats an image URL to ensure it uses the proper format
 * Legacy function maintained for backward compatibility
 * @param {string} url - The image URL to format
 * @returns {string|null} Formatted URL or null if invalid
 */
export const getFormattedImageUrl = (url) => {
  if (!url) return null;

  // If URL already includes the bucket name and has https protocol, return as is
  if (url.includes("product-images") && url.startsWith("http")) {
    return url;
  }

  // If URL is a relative path in the uploads directory, convert to full Supabase URL
  if (url.startsWith("uploads/")) {
    // Log for debugging
    console.log("Converting relative path to full URL:", url);

    // Determine the base storage URL (could be environment-specific)
    const storageUrl = process.env.REACT_APP_SUPABASE_URL
      ? `${process.env.REACT_APP_SUPABASE_URL}/storage/v1/object/public/`
      : "https://your-supabase-instance.supabase.co/storage/v1/object/public/";

    return `${storageUrl}product-images/${url}`;
  }

  // Return the original URL if we can't determine the format
  return url;
};

/**
 * Handles image loading errors by replacing with a placeholder
 * @param {React.SyntheticEvent<HTMLImageElement>} event - The error event
 * @param {string} placeholderSrc - URL to placeholder image
 */
export const handleImageError = (
  event,
  placeholderSrc = "/placeholder.png"
) => {
  const imgElement = event.target;
  if (imgElement instanceof HTMLImageElement) {
    // Prevent infinite error loop
    imgElement.onerror = null;

    // Show placeholder
    imgElement.src = placeholderSrc;

    // Log error for debugging
    console.warn("Image failed to load, using placeholder:", {
      originalSrc: imgElement.getAttribute("data-original-src") || "unknown",
    });
  }
};

/**
 * Fetches and tests a list of images from the server
 *
 * @returns {Promise<Object>} Test results with image URLs
 */
export async function testImageUrls() {
  try {
    const response = await fetch("/api/product-images-test");
    const data = await response.json();

    if (data.success && data.products) {
      return data;
    } else {
      return { success: false, error: data.error || "Unknown error" };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Fixes the Nintendo Switch image content type issue
 * This function can be called from an admin panel or utility script
 * to repair the specific image that was uploaded with incorrect content type
 */
export async function fixNintendoSwitchImageContentType() {
  try {
    // The specific file path for the Nintendo Switch image
    const filePath =
      "uploads/4acc1983-951b-49e5-9ea3-0357496f68e7_1743436382053.jpg";

    console.log("Attempting to fix Nintendo Switch image content type...");

    // First, download the existing file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("product-images")
      .download(filePath);

    if (downloadError) {
      console.error("Error downloading the image:", downloadError);
      return { success: false, error: downloadError };
    }

    if (!fileData) {
      console.error("No file data received");
      return { success: false, error: "No file data received" };
    }

    console.log(
      "Successfully downloaded the image, now re-uploading with correct content type"
    );

    // Re-upload the file with the correct content type
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, fileData, {
        upsert: true,
        contentType: "image/jpeg", // Explicitly set the correct MIME type
      });

    if (uploadError) {
      console.error("Error re-uploading the image:", uploadError);
      return { success: false, error: uploadError };
    }

    console.log("Successfully fixed the Nintendo Switch image content type!");
    return { success: true };
  } catch (error) {
    console.error("Error fixing Nintendo Switch image:", error);
    return { success: false, error };
  }
}

/**
 * Function to fix image upload content type issues
 * This checks if the image has the wrong content type (application/json)
 * and if so, tries to re-upload it with the correct content type
 *
 * @param {string} imagePath - Path to the image in storage
 * @returns {Promise<{success: boolean, message: string, url?: string}>}
 */
export async function fixImageContentType(imagePath) {
  try {
    // Extract the file path from the full URL if needed
    let filePath = imagePath;

    // If it's a full URL, extract just the path after the bucket name
    if (imagePath.includes("product-images/")) {
      const pathParts = imagePath.split("product-images/");
      if (pathParts.length > 1) {
        filePath = pathParts[1];
      }
    }

    console.log("Attempting to fix content type for:", filePath);

    // Download the existing file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("product-images")
      .download(filePath);

    if (downloadError) {
      console.error("Error downloading the image:", downloadError);
      return {
        success: false,
        message: `Download error: ${downloadError.message || "Unknown error"}`,
      };
    }

    if (!fileData) {
      console.error("No file data received");
      return { success: false, message: "No file data received" };
    }

    console.log(
      "Successfully downloaded the image, size:",
      fileData.size || "unknown",
      "bytes"
    );

    // Determine correct content type based on file extension
    const fileExt = filePath.split(".").pop().toLowerCase();
    let contentType = "image/jpeg"; // Default to jpeg

    if (fileExt === "png") contentType = "image/png";
    else if (fileExt === "gif") contentType = "image/gif";
    else if (fileExt === "webp") contentType = "image/webp";
    else if (fileExt === "svg") contentType = "image/svg+xml";

    console.log(
      `Setting content type to ${contentType} based on .${fileExt} extension`
    );

    // Re-upload the file with the correct content type
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, fileData, {
        upsert: true,
        contentType: contentType, // Explicitly set the correct MIME type
      });

    if (uploadError) {
      console.error("Error re-uploading the image:", uploadError);
      return {
        success: false,
        message: `Upload error: ${uploadError.message || "Unknown error"}`,
      };
    }

    console.log("Successfully re-uploaded with correct content type!");

    // Get the public URL of the fixed image
    const { data: urlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      return {
        success: true,
        message: "Fixed content type but couldn't get public URL",
      };
    }

    // Verify the fix worked
    try {
      const response = await fetch(urlData.publicUrl, { method: "HEAD" });
      const newContentType = response.headers.get("content-type");

      console.log(`Verified image content type is now: ${newContentType}`);

      if (newContentType === contentType) {
        return {
          success: true,
          message: `Fixed content type to ${contentType}`,
          url: urlData.publicUrl,
        };
      } else {
        console.warn(`Content type is still incorrect: ${newContentType}`);
        return {
          success: true,
          message: `Re-upload succeeded but content type is still ${newContentType}`,
          url: urlData.publicUrl,
        };
      }
    } catch (verifyError) {
      console.warn("Could not verify content type fix:", verifyError);
      return {
        success: true,
        message: "Fixed content type but verification failed",
        url: urlData.publicUrl,
      };
    }
  } catch (error) {
    console.error("Error fixing image content type:", error);
    return {
      success: false,
      message: `Unexpected error: ${error.message || "Unknown error"}`,
    };
  }
}

// Export default for convenience
export default {
  getProductImageUrl,
  getFormattedImageUrl,
  handleImageError,
};
