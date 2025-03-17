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
    return "https://via.placeholder.com/150?text=No+Image";
  }

  // If it's already a full URL, return it
  if (imagePath.startsWith("http")) {
    return imagePath;
  }

  try {
    // Remove leading slash if present
    const cleanPath = imagePath.startsWith("/")
      ? imagePath.substring(1)
      : imagePath;

    // Use the hardcoded Supabase URL instead of trying to access the protected property
    const supabaseUrl = "https://vfjcutqzhhcvqjqjzwaf.supabase.co";

    // Construct the public URL directly
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/product-images/${cleanPath}`;

    return publicUrl;
  } catch (error) {
    return "https://via.placeholder.com/150?text=No+Image";
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
