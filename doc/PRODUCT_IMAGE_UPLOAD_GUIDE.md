# Product Management with Image Upload - Step-by-Step Guide

## For Administrators/Product Managers

### Creating a New Product with Image

Follow these steps to create a product with an image:

#### Step 1: Navigate to Create Product Page

- Go to Admin Dashboard → Products → Create New Product
- Or access the URL: `/admin/products/create`

#### Step 2: Fill in Product Information

- **Product Name**: Enter the product name
- **Description**: Enter detailed product description
- **Price**: Enter the product price (e.g., 99.99)
- **Stock Quantity**: Enter the available stock
- **Category**: Select from dropdown

#### Step 3: Upload Product Image

1. Click on the image upload area
2. Either:
   - Drag and drop an image file into the area
   - Click to browse and select from your computer
3. Supported formats: JPEG, PNG, GIF, WebP
4. Maximum file size: 5MB

**Image Upload Progress**:

- You'll see a preview of the image
- "Uploading to S3..." message appears during upload
- Success message shows once uploaded

#### Step 4: Submit Form

- Review all information
- Click "Create Product" button
- Product will be saved to RDS with image URL

### Updating Product Image

#### Step 1: Navigate to Edit Product

- Go to Admin Dashboard → Products → Find Product
- Click "Edit" button

#### Step 2: Update Image

1. Click on the image upload area
2. Select a new image (same supported formats)
3. Wait for upload to complete
4. Click "Save Changes"

#### Step 3: Verify

- Image URL is updated in database
- Old image remains in S3 (can be cleaned up manually if needed)

### Viewing Products with Images

- Product images display in:
  - Product listing page
  - Product detail page
  - Shopping cart
  - Order details

### Image Best Practices

✅ **Do**:

- Use square or rectangular images (e.g., 1000x1000, 800x600)
- Compress images before upload (use online tools if needed)
- Use consistent image dimensions for better UI
- Use descriptive filenames when uploading
- Ensure good lighting and clear product view

❌ **Don't**:

- Upload files larger than 5MB
- Use unsupported file formats
- Upload blurry or low-quality images
- Use images with watermarks (unless branding approved)
- Upload personal or unrelated images

### Troubleshooting

**Problem**: "Invalid file type" error

- **Solution**: Convert file to JPEG, PNG, GIF, or WebP format

**Problem**: "File size exceeds maximum limit" error

- **Solution**: Use an image compression tool to reduce file size below 5MB

**Problem**: Image upload hangs/times out

- **Solution**:
  - Check internet connection
  - Try a smaller file
  - Refresh page and try again

**Problem**: Image appears broken after upload

- **Solution**:
  - Check S3 bucket permissions are public
  - Try uploading again
  - Contact system administrator

---

## For Developers

### Integration Guide

#### Using the ProductImageUpload Component

```jsx
import ProductImageUpload from "@/components/ProductImageUpload";
import { createProductWithImage } from "@/api/productImageApi";

function CreateProductForm() {
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    stockQuantity: "",
    categoryId: "",
  });

  const handleImageUpload = (url) => {
    setImageUrl(url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const product = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          imageUrl,
        }),
      }).then((r) => r.json());

      alert("Product created successfully!");
      // Redirect or reset form
    } catch (error) {
      alert("Failed to create product: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <ProductImageUpload onImageUpload={handleImageUpload} />

      <input
        type="text"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="Product Name"
        required
      />

      {/* More form fields... */}

      <button type="submit" disabled={loading || !imageUrl}>
        {loading ? "Creating..." : "Create Product"}
      </button>
    </form>
  );
}
```

#### Direct API Usage

```javascript
import { uploadProductImage, validateImageFile } from "@/api/productImageApi";

// Step 1: Get file from input
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];

// Step 2: Validate
const validation = validateImageFile(file);
if (!validation.valid) {
  console.error(validation.error);
  return;
}

// Step 3: Upload
try {
  const imageUrl = await uploadProductImage(file);
  console.log("Uploaded to:", imageUrl);

  // Step 4: Use in product creation
  const response = await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Product",
      imageUrl: imageUrl,
      // ... other fields
    }),
  });
} catch (error) {
  console.error("Upload failed:", error);
}
```

### Backend API Details

#### Image Upload Endpoint

```
POST /api/products/upload-image
Content-Type: multipart/form-data

Parameters:
  - file (MultipartFile): The image file to upload

Response:
{
  "imageUrl": "https://s3-dynamodb-phuc.s3.us-east-1.amazonaws.com/product-images/...",
  "message": "Image uploaded successfully",
  "success": true
}
```

#### Error Handling

```javascript
try {
  const response = await fetch("/api/products/upload-image", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Upload error:", data.message);
    // Handle error
  } else {
    console.log("Success:", data.imageUrl);
  }
} catch (error) {
  console.error("Network error:", error);
}
```

### Environment Variables

For development, ensure these are configured:

```env
# .env.local (Frontend)
VITE_API_URL=http://localhost:3003/api

# application.properties (Backend)
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/productdb
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=password
```

For production:

```env
# Use environment variables instead of hardcoded credentials
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=s3-dynamodb-phuc
```

### Testing Examples

```javascript
// Mock image upload for testing
const mockFile = new File(["test"], "test.jpg", { type: "image/jpeg" });

// Test validation
import { validateImageFile } from "@/api/productImageApi";

test("validates image file correctly", () => {
  const result = validateImageFile(mockFile);
  expect(result.valid).toBe(true);
});

// Test with invalid file
const invalidFile = new File(["test"], "test.pdf", { type: "application/pdf" });
const result = validateImageFile(invalidFile);
expect(result.valid).toBe(false);
expect(result.error).toContain("Invalid file type");
```

### Monitoring & Logs

Monitor uploads in:

- **Frontend**: Browser console (DevTools)
- **Backend**: Application logs
- **AWS**: CloudWatch logs and S3 metrics

Example backend log:

```
2024-05-13 10:30:45 [INFO] Image uploaded: s3://s3-dynamodb-phuc/product-images/123e4567.jpg
```

---

## AWS S3 Configuration

### Bucket Setup

1. Create S3 bucket: `s3-dynamodb-phuc`
2. Set bucket permissions to public read
3. Create folder: `product-images/`

### Bucket Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicRead",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::s3-dynamodb-phuc/product-images/*"
    }
  ]
}
```

### CORS Configuration

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["http://localhost:5173", "https://yourdomain.com"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

---

## Common Issues & Solutions

| Issue                 | Cause                | Solution                        |
| --------------------- | -------------------- | ------------------------------- |
| 403 Forbidden         | S3 bucket not public | Update bucket policy            |
| 400 Bad Request       | Wrong file type      | Use JPEG, PNG, GIF, WebP        |
| 413 Payload Too Large | File > 5MB           | Compress image                  |
| 504 Gateway Timeout   | Slow upload          | Check network, try smaller file |
| Image not loading     | Bucket/path issue    | Verify S3 URL in browser        |

---

## Performance Tips

1. **Image Optimization**
   - Compress before upload (use TinyPNG, ImageOptim)
   - Use WebP format for smaller files
   - Aim for 100-500KB per image

2. **Frontend**
   - Show loading spinner during upload
   - Display upload progress percentage
   - Cache images with service workers

3. **Backend**
   - Validate file type and size
   - Generate unique filenames
   - Use connection pooling for RDS

4. **AWS**
   - Enable CloudFront CDN
   - Set up lifecycle policies for old images
   - Monitor S3 costs
