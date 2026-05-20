@echo off
REM Test Product Image Upload API

echo ============================================
echo Testing Product Image Upload
echo ============================================

REM Test 1: Check if service is running
echo.
echo [TEST 1] Checking if service is running...
curl -s http://localhost:3003/api/products || (
    echo ERROR: Service not running on localhost:3003
    exit /b 1
)
echo OK - Service is running

REM Test 2: Upload image
echo.
echo [TEST 2] Uploading test image...
set TEST_IMAGE=d:\2.University\4.Semester_2_2025-2026\2.Software_architecture\1.Final_Project\service-base-ecommerce-system\frontend\public\favicon.svg

REM Convert SVG to PNG using ImageMagick (if available), or test with the SVG directly
REM For now, let's use a different approach - create a minimal JPEG

echo Creating minimal test image...

REM Create test response file
curl -X POST http://localhost:3003/api/products/upload-image ^
  -F "file=@%TEST_IMAGE%" ^
  -w "\nHTTP Status: %%{http_code}\n" ^
  -o test_response.json

type test_response.json

echo.
echo [TEST 3] Testing product creation...
echo Testing with sample product data...

REM Extract image URL from response (if successful)
REM For now, test creating a product with a placeholder image URL

curl -X POST http://localhost:3003/api/products ^
  -H "Content-Type: application/json" ^
  -d {^
    \"name\": \"Test Product Image\",^
    \"description\": \"Testing image upload functionality\",^
    \"price\": 99.99,^
    \"stockQuantity\": 10,^
    \"imageUrl\": \"https://s3-dynamodb-phuc.s3.us-east-1.amazonaws.com/product-images/test.jpg\",^
    \"categoryId\": 1,^
    \"status\": \"ACTIVE\"^
  } ^
  -w "\nHTTP Status: %%{http_code}\n" ^
  -o product_response.json

echo.
echo === Product Response ===
type product_response.json

echo.
echo ============================================
echo Test completed
echo ============================================
