import { supabase } from "../../../../supabaseClient.js";

/**
 * Formats image URLs from Supabase Storage
 *
 * @param {string} imagePath - The image path or URL
 * @returns {string} The properly formatted image URL
 */
export function getFormattedImageUrl(imagePath) {
  // Return placeholder for empty paths
  if (!imagePath || imagePath === "" || imagePath === "null") {
    console.log("Empty image path, using placeholder");
    return "https://via.placeholder.com/150?text=No+Image";
  }

  // Log the original image path for debugging
  console.log("getFormattedImageUrl processing:", imagePath);

  try {
    // If it's already a full URL (including Supabase storage URL), return it
    if (imagePath.startsWith("http")) {
      console.log("Image is already a full URL:", imagePath);

      // Check if URL already has uploads/ in it to avoid duplication
      if (imagePath.includes("uploads/uploads/")) {
        // Fix duplicate uploads/ in path
        console.log("Found duplicate 'uploads/' in URL, fixing...");
        return imagePath.replace("uploads/uploads/", "uploads/");
      }

      // If this is the Nintendo Switch image with the specific format that's failing
      if (
        imagePath.includes("4acc1983-951b-49e5-9ea3-0357496f68e7") &&
        imagePath.includes("product-images/uploads/")
      ) {
        console.log("Nintendo Switch specific image detected, using as is");
        return imagePath;
      }

      // Don't modify URLs that already have the uploads/ path
      if (imagePath.includes("product-images/uploads/")) {
        console.log("URL already includes correct uploads/ path");
        return imagePath;
      }

      // Special case fix for problematic images
      if (!imagePath.includes("uploads/")) {
        // If URL doesn't include uploads folder but should, try to fix it
        const urlParts = imagePath.split("/");
        const fileName = urlParts[urlParts.length - 1];

        if (fileName && !imagePath.includes("uploads/")) {
          console.log(
            "Potentially problematic URL detected, trying to fix by adding uploads/ prefix"
          );

          // Extract the base URL without the filename
          const baseUrl = imagePath.substring(
            0,
            imagePath.lastIndexOf("/") + 1
          );
          const fixedUrl = `${baseUrl}uploads/${fileName}`;

          console.log("Fixed URL:", fixedUrl);
          return fixedUrl;
        }
      }

      return imagePath;
    }

    // Normalize the path (handle uploads/ prefix if needed)
    let normalizedPath = imagePath;

    // Prevent duplicate uploads/ prefixes
    if (normalizedPath.startsWith("uploads/uploads/")) {
      console.log("Found duplicate uploads/ prefix, removing one");
      normalizedPath = normalizedPath.replace("uploads/uploads/", "uploads/");
    }

    // If path doesn't start with 'uploads/' but we know images are in that folder,
    // add the prefix (this handles cases where only the filename was stored)
    if (
      !normalizedPath.startsWith("uploads/") &&
      !normalizedPath.includes("/")
    ) {
      console.log("Adding 'uploads/' prefix to path");
      normalizedPath = `uploads/${normalizedPath}`;
    }

    console.log("Normalized path:", normalizedPath);

    // Get the public URL using Supabase
    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(normalizedPath);

    if (data?.publicUrl) {
      const url = data.publicUrl;
      console.log("Generated public URL:", url);

      // Final check for duplicate uploads/
      if (url.includes("uploads/uploads/")) {
        const fixedUrl = url.replace("uploads/uploads/", "uploads/");
        console.log("Fixed duplicate 'uploads/' in final URL:", fixedUrl);
        return fixedUrl;
      }

      return url;
    }

    // Fallback: construct URL manually if getPublicUrl fails
    const supabaseUrl =
      process.env.REACT_APP_SUPABASE_URL ||
      "https://vfjcutqzhhcvqjqjzwaf.supabase.co";

    let fallbackUrl;

    // Try both with and without uploads/ prefix
    if (normalizedPath.startsWith("uploads/")) {
      fallbackUrl = `${supabaseUrl}/storage/v1/object/public/product-images/${normalizedPath}`;
    } else {
      // If the path doesn't start with uploads/, try both versions
      const directPath = `${supabaseUrl}/storage/v1/object/public/product-images/${normalizedPath}`;
      const uploadsPath = `${supabaseUrl}/storage/v1/object/public/product-images/uploads/${normalizedPath}`;

      console.log("Trying multiple path variants:");
      console.log("1. Direct path:", directPath);
      console.log("2. With uploads/ prefix:", uploadsPath);

      // Check if the normalized path already has the user ID in it
      if (normalizedPath.includes("4acc1983-951b-49e5-9ea3-0357496f68e7")) {
        console.log("Using direct path for Nintendo Switch image");
        fallbackUrl = directPath;
      } else {
        // Use the uploads path as fallback
        fallbackUrl = uploadsPath;
      }
    }

    // Final check for duplicate uploads/
    if (fallbackUrl.includes("uploads/uploads/")) {
      fallbackUrl = fallbackUrl.replace("uploads/uploads/", "uploads/");
      console.log("Fixed duplicate 'uploads/' in fallback URL");
    }

    console.log("Using fallback URL:", fallbackUrl);
    return fallbackUrl;
  } catch (error) {
    console.error("Error formatting image URL:", error);
    return "https://via.placeholder.com/150?text=Error+Loading+Image";
  }
}

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
