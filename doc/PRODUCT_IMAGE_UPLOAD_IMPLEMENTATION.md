# Product Image Upload Implementation

## Overview

This implementation enables product images to be uploaded directly from the client machine to AWS S3, with product data stored in RDS MySQL database.

### Architecture

```
Frontend (React)
    ↓
ProductImageUpload Component
    ↓
productImageApi.js (Upload + Validation)
    ↓
POST /api/products/upload-image
    ↓
Product Service (Java/Spring Boot)
    ↓
ImageUploadService
    ↓
S3Client (AWS SDK)
    ↓
AWS S3 Bucket (s3-dynamodb-phuc)
```

## Files Created/Modified

### Backend (Product Service - Java)

#### New Files:

1. **src/main/java/com/dtpshop/productservice/config/S3Config.java**
   - AWS S3 client configuration
   - Sets up credentials and region

2. **src/main/java/com/dtpshop/productservice/service/ImageUploadService.java**
   - Handles image uploads to S3
   - File validation (type, size)
   - Generates unique filenames using UUID
   - Returns S3 URL

3. **src/main/java/com/dtpshop/productservice/dto/ImageUploadResponse.java**
   - Response DTO for image uploads
   - Contains imageUrl, message, and success status

#### Modified Files:

1. **pom.xml**
   - Added AWS SDK S3 dependencies (v2.24.0)
   - Added AWS SDK Core dependency

2. **src/main/java/com/dtpshop/productservice/controller/ProductController.java**
   - Added `ImageUploadService` injection
   - Added `POST /api/products/upload-image` endpoint
   - Added `MultipartFile` import
   - Added error handling for upload failures

### Frontend (React)

#### New Files:

1. **src/api/productImageApi.js**
   - Utility functions for image operations
   - `uploadProductImage()` - Upload file to S3
   - `validateImageFile()` - Validate before upload
   - `createProductWithImage()` - Create product with image
   - `updateProductImage()` - Update product image

2. **src/components/ProductImageUpload.jsx**
   - React component for image upload UI
   - File preview before upload
   - Loading state during upload
   - Error and success messages
   - Responsive design

3. **src/styles/ProductImageUpload.css**
   - Styling for upload component
   - Animations and transitions
   - Responsive breakpoints

## Setup & Configuration

### Prerequisites

- Java 21+
- Spring Boot 3.2.6+
- Maven 3.6+
- Node.js 16+
- AWS S3 Bucket configured

### Backend Setup

1. **Add AWS S3 Credentials to S3Config.java**

   Currently hardcoded in `S3Config.java`. For production, use environment variables:

   ```java
   String accessKey = System.getenv("AWS_ACCESS_KEY_ID");
   String secretKey = System.getenv("AWS_SECRET_ACCESS_KEY");
   ```

2. **Build the Project**

   ```bash
   cd services/product-service
   mvn clean install
   ```

3. **Run the Service**

   ```bash
   mvn spring-boot:run
   ```

   The service will run on `http://localhost:3003`

### Frontend Setup

1. **Update API Configuration (optional)**

   In `.env` or `vite.config.js`:

   ```
   VITE_API_URL=http://localhost:3003/api
   ```

2. **Install Dependencies** (if not already done)

   ```bash
   cd frontend
   npm install
   ```

3. **Run the Frontend**

   ```bash
   npm run dev
   ```

## Usage Examples

### Using the React Component

```jsx
import ProductImageUpload from "./components/ProductImageUpload";

function CreateProductPage() {
  const [imageUrl, setImageUrl] = useState("");

  const handleImageUpload = (url) => {
    setImageUrl(url);
    console.log("Image uploaded:", url);
  };

  return (
    <div>
      <h1>Create Product</h1>
      <ProductImageUpload onImageUpload={handleImageUpload} />
      <input type="text" placeholder="Product Name" />
      <input type="number" placeholder="Price" />
      {imageUrl && <img src={imageUrl} alt="Product" />}
      <button onClick={() => createProduct({ imageUrl })}>Create</button>
    </div>
  );
}
```

### Using the API Directly (JavaScript)

```javascript
import {
  uploadProductImage,
  createProductWithImage,
} from "./api/productImageApi";

// Upload image only
const file = document.querySelector('input[type="file"]').files[0];
const imageUrl = await uploadProductImage(file);

// Create product with image
const productData = {
  name: "Product Name",
  price: 99.99,
  stockQuantity: 100,
  description: "Product description",
};
const product = await createProductWithImage(productData, file);
```

### Using cURL (Backend API)

```bash
# Upload image
curl -X POST http://localhost:3003/api/products/upload-image \
  -F "file=@product.jpg"

# Create product
curl -X POST http://localhost:3003/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product Name",
    "price": 99.99,
    "stockQuantity": 100,
    "imageUrl": "https://s3-dynamodb-phuc.s3.us-east-1.amazonaws.com/product-images/..."
  }'
```

## API Reference

### Upload Image Endpoint

**POST** `/api/products/upload-image`

**Request:**

- Content-Type: `multipart/form-data`
- Body: `file` (MultipartFile)

**Response (Success):**

```json
{
  "imageUrl": "https://s3-dynamodb-phuc.s3.us-east-1.amazonaws.com/product-images/123e4567.jpg",
  "message": "Image uploaded successfully",
  "success": true
}
```

**Response (Error):**

```json
{
  "imageUrl": null,
  "message": "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed",
  "success": false
}
```

**Error Codes:**

- 400: Bad Request (invalid file type, size too large)
- 500: Internal Server Error (AWS connection issue)

## Validation Rules

### File Type Validation

- ✅ JPEG (image/jpeg)
- ✅ PNG (image/png)
- ✅ GIF (image/gif)
- ✅ WebP (image/webp)
- ❌ All other formats

### File Size Validation

- Maximum: 5 MB
- Validated on both frontend and backend

### Error Messages

- "File is empty" - No file provided
- "Invalid file type" - File is not an image
- "File size exceeds maximum limit" - File > 5MB
- "Failed to upload file to S3" - AWS connection error

## Security Features

1. **MIME Type Validation**: Only image files accepted
2. **File Size Limit**: Prevents abuse with 5MB cap
3. **UUID Filename**: Prevents filename collisions and path traversal
4. **S3 Path Isolation**: Images stored in `product-images/` prefix
5. **AWS Credentials**: Should use IAM roles or environment variables

## Database Schema

The `products` table stores:

```sql
ALTER TABLE products ADD COLUMN image_url VARCHAR(2048) AFTER name;
```

**Column Details:**

- `image_url`: VARCHAR(2048)
- Stores full S3 URL
- Nullable (product can exist without image)
- Example: `https://s3-dynamodb-phuc.s3.us-east-1.amazonaws.com/product-images/uuid.jpg`

## Performance Considerations

1. **S3 Upload**: Direct browser-to-S3 would be faster with presigned URLs
2. **Image Processing**: Consider adding thumbnail generation
3. **CDN**: CloudFront can be used for faster image delivery
4. **Caching**: Product images cached in Redis along with product data

## Testing

### Manual Testing

1. **Upload Test**
   - Select image file
   - Verify S3 URL returned
   - Check image accessible in browser

2. **Product Creation Test**
   - Create product with uploaded image
   - Verify image URL saved in RDS
   - Retrieve product and verify image loads

3. **Error Handling**
   - Upload invalid file type (should fail)
   - Upload file > 5MB (should fail)
   - Upload with AWS credentials error (should handle gracefully)

### Example Test Cases

```javascript
// Test file validation
const testCases = [
  {
    file: new File([""], "image.jpg", { type: "image/jpeg" }),
    expected: "valid",
  },
  {
    file: new File([""], "image.pdf", { type: "application/pdf" }),
    expected: "invalid",
  },
  {
    file: new File(["x".repeat(6 * 1024 * 1024)], "large.jpg", {
      type: "image/jpeg",
    }),
    expected: "too large",
  },
];
```

## Troubleshooting

### Issue: "AWS credentials not found"

**Solution**: Check S3Config.java credentials are correct

### Issue: "Access Denied" from S3

**Solution**: Verify IAM permissions for S3 bucket

### Issue: Image not appearing after upload

**Solution**: Check S3 bucket URL is public and accessible

### Issue: Frontend can't reach backend

**Solution**: Verify CORS configuration and API URL

## Future Enhancements

- [ ] Direct browser-to-S3 upload with presigned URLs
- [ ] Image compression before upload
- [ ] Multiple images per product
- [ ] Image cropping/editing before upload
- [ ] CloudFront CDN integration
- [ ] Image deletion when product deleted
- [ ] Image optimization (resize, convert to WebP)
- [ ] Progress indicator for large uploads
- [ ] Drag & drop support improvement

## References

- [AWS SDK for Java](https://docs.aws.amazon.com/sdk-for-java/)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Spring Boot Multipart File Upload](https://spring.io/guides/gs/uploading-files/)
- [React File Upload](https://react.dev/)

## Support

For issues or questions, please refer to the respective service README files:

- Backend: [Product Service README](./README.md)
- Frontend: [Frontend README](../../frontend/README.md)
