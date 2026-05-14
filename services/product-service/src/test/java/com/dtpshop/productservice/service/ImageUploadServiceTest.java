package com.dtpshop.productservice.service;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ImageUploadServiceTest {

    private S3Client s3Client;
    private ImageUploadService imageUploadService;

    @BeforeEach
    void setUp() {
        this.s3Client = createStubS3Client();
        imageUploadService = new ImageUploadService(s3Client, "s3-dynamodb-phuc", "ap-southeast-1");
    }

    @Test
    void shouldUploadImageSuccessfully() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "product.png",
                "image/png",
                "image-content".getBytes());

        String imageUrl = imageUploadService.uploadProductImage(file);

        assertThat(imageUrl).startsWith("https://s3-dynamodb-phuc.s3.ap-southeast-1.amazonaws.com/product-images/");
        assertThat(imageUrl).endsWith(".png");
    }

    @Test
    void shouldRejectEmptyFile() {
        MockMultipartFile emptyFile = new MockMultipartFile("file", "empty.png", "image/png", new byte[0]);

        assertThatThrownBy(() -> imageUploadService.uploadProductImage(emptyFile))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("File is empty");
    }

    @Test
    void shouldRejectInvalidContentType() {
        MockMultipartFile invalidFile = new MockMultipartFile(
                "file",
                "document.txt",
                "text/plain",
                "hello".getBytes());

        assertThatThrownBy(() -> imageUploadService.uploadProductImage(invalidFile))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed");
    }

    @Test
    void shouldRejectNullContentType() {
        MockMultipartFile invalidFile = new MockMultipartFile(
                "file",
                "unknown",
                null,
                "hello".getBytes());

        assertThatThrownBy(() -> imageUploadService.uploadProductImage(invalidFile))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed");
    }

    @Test
    void shouldUploadImageWithoutFileExtension() {
        MockMultipartFile fileWithoutExtension = new MockMultipartFile(
                "file",
                "product",
                "image/png",
                "image-content".getBytes());

        String imageUrl = imageUploadService.uploadProductImage(fileWithoutExtension);

        assertThat(imageUrl).startsWith("https://s3-dynamodb-phuc.s3.ap-southeast-1.amazonaws.com/product-images/");
        assertThat(imageUrl)
                .matches("https://s3-dynamodb-phuc.s3.ap-southeast-1.amazonaws.com/product-images/[0-9a-fA-F\\-]+$");
    }

    @Test
    void shouldRejectFileLargerThanFiveMegabytes() {
        byte[] largeBytes = new byte[5 * 1024 * 1024 + 1];
        MockMultipartFile largeFile = new MockMultipartFile(
                "file",
                "large.png",
                "image/png",
                largeBytes);

        assertThatThrownBy(() -> imageUploadService.uploadProductImage(largeFile))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("File size exceeds maximum limit of 5MB");
    }

    private S3Client createStubS3Client() {
        InvocationHandler handler = (proxy, method, args) -> {
            if ("putObject".equals(method.getName()) && args != null && args.length == 2) {
                return PutObjectResponse.builder().build();
            }
            if ("close".equals(method.getName())) {
                return null;
            }
            if ("toString".equals(method.getName())) {
                return "stub-s3-client";
            }
            if ("equals".equals(method.getName())) {
                return proxy == args[0];
            }
            if ("hashCode".equals(method.getName())) {
                return System.identityHashCode(proxy);
            }
            return null;
        };

        return (S3Client) Proxy.newProxyInstance(
                S3Client.class.getClassLoader(),
                new Class<?>[] { S3Client.class },
                handler);
    }
}
