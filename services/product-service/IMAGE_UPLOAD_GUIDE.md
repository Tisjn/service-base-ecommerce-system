# Product Service - Image Upload Guide

## Overview

Product images are now stored in AWS S3 and saved to RDS database. The image upload workflow:

1. **Upload Image to S3**: `POST /api/products/upload-image` - Returns S3 image URL
2. **Create/Update Product**: Use the returned image URL in product creation or update

## API Endpoints

### 1. Upload Product Image

**Endpoint**: `POST /api/products/upload-image`

**Request**:

- Content-Type: `multipart/form-data`
- Form parameter: `file` (required) - Image file

**Supported File Types**:

- JPEG (image/jpeg)
- PNG (image/png)
- GIF (image/gif)
- WebP (image/webp)

**File Size Limit**: 5MB

**Response** (Success - 200 OK):

```json
{
  "imageUrl": "https://s3-dynamodb-phuc.s3.us-east-1.amazonaws.com/product-images/123e4567-e89b-12d3-a456-426614174000.jpg",
  "message": "Image uploaded successfully",
  "success": true
}
```

**Response** (Error):

```json
{
  "imageUrl": null,
  "message": "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed",
  "success": false
}
```

### 2. Create Product with Image URL

**Endpoint**: `POST /api/products`

**Request Body**:

```json
{
  "name": "Product Name",
  "description": "Product Description",
  "price": 99.99,
  "stockQuantity": 100,
  "imageUrl": "https://s3-dynamodb-phuc.s3.us-east-1.amazonaws.com/product-images/...",
  "categoryId": 1,
  "status": "ACTIVE"
}
```

### 3. Update Product Image

**Endpoint**: `PATCH /api/products/{id}`

**Request Body**:

```json
{
  "imageUrl": "https://s3-dynamodb-phuc.s3.us-east-1.amazonaws.com/product-images/..."
}
```

## Frontend Usage Example

### JavaScript/React Example

```javascript
// Step 1: Upload image to S3
async function uploadProductImage(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    "http://localhost:3003/api/products/upload-image",
    {
      method: "POST",
      body: formData,
    },
  );

  const data = await response.json();

  if (data.success) {
    return data.imageUrl;
  } else {
    throw new Error(data.message);
  }
}

// Step 2: Create product with image URL
async function createProduct(productData, imageFile) {
  try {
    const imageUrl = await uploadProductImage(imageFile);

    const response = await fetch("http://localhost:3003/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...productData,
        imageUrl: imageUrl,
      }),
    });

    return await response.json();
  } catch (error) {
    console.error("Error creating product:", error);
  }
}

// Usage
const productFile = document.querySelector('input[type="file"]').files[0];
const productData = {
  name: "My Product",
  description: "Product description",
  price: 99.99,
  stockQuantity: 100,
  categoryId: 1,
};

createProduct(productData, productFile);
```

### HTML Form Example

```html
<form id="productForm">
  <input type="text" id="productName" placeholder="Product Name" required />
  <textarea id="productDesc" placeholder="Description"></textarea>
  <input type="number" id="productPrice" placeholder="Price" required />
  <input
    type="number"
    id="productStock"
    placeholder="Stock Quantity"
    required
  />
  <input type="file" id="productImage" accept="image/*" required />
  <button type="submit">Create Product</button>
</form>

<script>
  document
    .getElementById("productForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const file = document.getElementById("productImage").files[0];

      // Upload image
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/products/upload-image", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadData.success) {
        alert(uploadData.message);
        return;
      }

      // Create product
      const productRes = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: document.getElementById("productName").value,
          description: document.getElementById("productDesc").value,
          price: document.getElementById("productPrice").value,
          stockQuantity: document.getElementById("productStock").value,
          imageUrl: uploadData.imageUrl,
        }),
      });

      if (productRes.ok) {
        alert("Product created successfully!");
      }
    });
</script>
```

## AWS S3 Configuration

The service uses AWS S3 with the following configuration:

- **Bucket**: `s3-dynamodb-phuc`
- **Region**: `us-east-1`
- **Image Storage Path**: `product-images/`
- **URL Format**: `https://s3-dynamodb-phuc.s3.us-east-1.amazonaws.com/product-images/{filename}`

### Credentials

The S3 client is configured with AWS credentials in [S3Config.java](src/main/java/com/dtpshop/productservice/config/S3Config.java)

## Database Schema

The `products` table in RDS has been updated to include:

```sql
ALTER TABLE products ADD COLUMN image_url VARCHAR(2048);
```

Each product can have:

- One `image_url` stored in RDS
- Actual image file stored in S3 bucket

## Error Handling

Common errors and their meanings:

| Error                             | Cause                | Solution                                   |
| --------------------------------- | -------------------- | ------------------------------------------ |
| "File is empty"                   | No file provided     | Ensure file is selected before upload      |
| "Invalid file type"               | File is not an image | Use JPEG, PNG, GIF, or WebP format         |
| "File size exceeds maximum limit" | File larger than 5MB | Compress image to less than 5MB            |
| "Failed to upload file to S3"     | AWS connection issue | Check AWS credentials and S3 bucket access |

## Security Considerations

1. **File Type Validation**: Only image MIME types are accepted
2. **File Size Limit**: Maximum 5MB per image to prevent abuse
3. **Unique Filenames**: UUID-based naming prevents filename collisions
4. **AWS Credentials**: Should be moved to environment variables for production
5. **CORS**: Configure CORS on S3 bucket if uploading from frontend

## Future Improvements

- [ ] Move AWS credentials to environment variables
- [ ] Add image processing/resizing
- [ ] Add image deletion from S3 when product is deleted
- [ ] Add multiple image support per product
- [ ] Add image compression before S3 upload
- [ ] Add CloudFront CDN for faster image delivery
