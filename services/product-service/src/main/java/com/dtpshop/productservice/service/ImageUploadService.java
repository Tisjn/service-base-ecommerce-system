package com.dtpshop.productservice.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectResponse;
import java.io.IOException;
import java.util.UUID;

@Service
public class ImageUploadService {

    private final S3Client s3Client;
    private final String bucketName;
    private final String s3UrlPattern;

    public ImageUploadService(S3Client s3Client,
            @Value("${S3_BUCKET_NAME:s3-dynamodb-phuc}") String bucketName,
            @Value("${AWS_REGION:ap-southeast-1}") String awsRegion) {
        this.s3Client = s3Client;
        this.bucketName = bucketName;
        this.s3UrlPattern = String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, awsRegion, "%s");
    }

    /**
     * Upload product image to S3
     *
     * @param file MultipartFile containing the image
     * @return S3 URL of the uploaded image
     */
    public String uploadProductImage(MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        // Validate file type
        String contentType = file.getContentType();
        if (!isValidImageType(contentType)) {
            throw new IllegalArgumentException("Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed");
        }

        // Validate file size (max 5MB)
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("File size exceeds maximum limit of 5MB");
        }

        try {
            // Generate unique key for the image
            String fileName = generateFileName(file.getOriginalFilename());
            String key = "product-images/" + fileName;

            // Upload to S3
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(contentType)
                    .build();

            PutObjectResponse response = s3Client.putObject(
                    putObjectRequest,
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

            // Return S3 URL
            return String.format(s3UrlPattern, key);

        } catch (IOException e) {
            throw new RuntimeException("Failed to upload file to S3: " + e.getMessage(), e);
        }
    }

    /**
     * Generate unique filename with UUID to avoid collisions
     */
    private String generateFileName(String originalFilename) {
        String extension = getFileExtension(originalFilename);
        return UUID.randomUUID().toString() + extension;
    }

    /**
     * Get file extension from original filename
     */
    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf("."));
    }

    /**
     * Validate image file type
     */
    private boolean isValidImageType(String contentType) {
        if (contentType == null) {
            return false;
        }
        return contentType.equals("image/jpeg")
                || contentType.equals("image/jpg")
                || contentType.equals("image/pjpeg")
                || contentType.equals("image/png")
                || contentType.equals("image/gif")
                || contentType.equals("image/webp");
    }
}
