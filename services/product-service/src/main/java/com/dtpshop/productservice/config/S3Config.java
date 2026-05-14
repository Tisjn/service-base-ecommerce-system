package com.dtpshop.productservice.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;

@Configuration
public class S3Config {

        @Value("${AWS_REGION:us-east-1}")
        private String awsRegion;

        @Value("${AWS_ACCESS_KEY_ID:}")
        private String awsAccessKey;

        @Value("${AWS_SECRET_ACCESS_KEY:}")
        private String awsSecretKey;

        @Bean
        public S3Client s3Client() {
                AwsBasicCredentials awsCredentials = AwsBasicCredentials.create(
                                awsAccessKey,
                                awsSecretKey);

                return S3Client.builder()
                                .region(Region.of(awsRegion))
                                .credentialsProvider(StaticCredentialsProvider.create(awsCredentials))
                                .serviceConfiguration(S3Configuration.builder()
                                                .pathStyleAccessEnabled(false)
                                                .build())
                                .build();
        }
}
