/**
 * Product Service API - Image Upload Utility
 * Handles image uploads to S3 via product-service
 */

const API_GATEWAY_URL =
  import.meta.env.VITE_API_GATEWAY_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:8081";
const API_BASE_URL = `${API_GATEWAY_URL.replace(/\/$/, "")}/api`;

function getAuthHeaders() {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function requestWithFallback(path, options = {}) {
  return fetch(`${API_BASE_URL}${path}`, options);
}

/**
 * Upload product image to S3
 * @param {File} file - Image file to upload
 * @returns {Promise<string>} - S3 image URL
 */
export async function uploadProductImage(file) {
  if (!file) {
    throw new Error("No file provided");
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await requestWithFallback("/product-images", {
      method: "POST",
      headers: getAuthHeaders(),
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to upload image");
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message);
    }

    return data.imageUrl;
  } catch (error) {
    throw error;
  }
}

/**
 * Validate image before upload
 * @param {File} file - Image file to validate
 * @returns {Object} - Validation result
 */
export function validateImageFile(file) {
  const result = {
    valid: true,
    error: null,
  };

  // Check if file exists
  if (!file) {
    result.valid = false;
    result.error = "No file selected";
    return result;
  }

  // Validate file type
  const validTypes = [
    "image/jpeg",
    "image/jpg",
    "image/pjpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  if (!validTypes.includes(file.type)) {
    result.valid = false;
    result.error =
      "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed";
    return result;
  }

  // Validate file size (5MB max)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    result.valid = false;
    result.error = `File size exceeds maximum limit of 5MB (Current: ${(file.size / 1024 / 1024).toFixed(2)}MB)`;
    return result;
  }

  return result;
}

/**
 * Create product with image upload
 * @param {Object} productData - Product data
 * @param {File} imageFile - Product image file
 * @returns {Promise<Object>} - Created product
 */
export async function createProductWithImage(productData, imageFile) {
  try {
    // Validate image
    const validation = validateImageFile(imageFile);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Upload image to S3
    const imageUrl = await uploadProductImage(imageFile);

    // Create product with image URL
    const response = await requestWithFallback("/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        ...productData,
        imageUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create product");
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * Update product image
 * @param {number} productId - Product ID
 * @param {File} imageFile - New product image file
 * @returns {Promise<Object>} - Updated product
 */
export async function updateProductImage(productId, imageFile) {
  try {
    // Validate image
    const validation = validateImageFile(imageFile);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Upload image to S3
    const imageUrl = await uploadProductImage(imageFile);

    // Update product with new image URL
    const response = await requestWithFallback(`/products/${productId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        imageUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update product image");
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

export default {
  uploadProductImage,
  validateImageFile,
  createProductWithImage,
  updateProductImage,
};
