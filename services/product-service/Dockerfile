# Multi-stage build: Build stage
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /build

# Copy pom.xml and src
COPY pom.xml .
COPY src ./src

# Build the application
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre

WORKDIR /app

# Copy the built JAR from builder stage
COPY --from=builder /build/target/product-service-0.0.1-SNAPSHOT.jar app.jar

# Expose port
EXPOSE 3003

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]