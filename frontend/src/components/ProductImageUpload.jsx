import React, { useEffect, useId, useState } from "react";
import { uploadProductImage, validateImageFile } from "../api/productImageApi";
import "../styles/ProductImageUpload.css";

/**
 * Product Image Upload Component
 * Handles image upload to S3 and returns the image URL
 */
export default function ProductImageUpload({
  onImageUpload,
  initialImage = null,
}) {
  const inputId = useId();
  const [preview, setPreview] = useState(initialImage);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setPreview(initialImage);
  }, [initialImage]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error);
      setSuccess(false);
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload file
    setUploading(true);
    setError(null);

    try {
      const imageUrl = await uploadProductImage(file);
      setSuccess(true);
      setError(null);

      if (onImageUpload) {
        onImageUpload(imageUrl);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
      setSuccess(false);
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setPreview(null);
    setError(null);
    setSuccess(false);
  };

  return (
    <div className="product-image-upload">
      <div className="upload-container">
        <label htmlFor={inputId} className="upload-label">
          <div className="upload-area">
            {preview ? (
              <img
                src={preview}
                alt="Xem trước ảnh sản phẩm"
                className="preview-image"
              />
            ) : (
              <div className="upload-placeholder">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <p>Tải ảnh sản phẩm</p>
                <p className="sub-text">
                  Kéo thả hoặc bấm để chọn ảnh (JPEG, PNG, GIF, WebP - tối đa
                  5MB)
                </p>
              </div>
            )}
          </div>
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileChange}
            disabled={uploading}
            style={{ display: "none" }}
          />
        </label>

        {preview && (
          <button
            type="button"
            onClick={handleClear}
            className="clear-button"
            disabled={uploading}
          >
            Xóa ảnh
          </button>
        )}
      </div>

      {uploading && (
        <div className="status-message loading">
          <div className="spinner"></div>
          <span>Đang tải ảnh lên S3...</span>
        </div>
      )}

      {error && (
        <div className="status-message error">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="close-button"
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="status-message success">
          <span>Tải ảnh thành công!</span>
          <button
            type="button"
            onClick={() => setSuccess(false)}
            className="close-button"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
