FROM maven:3.9.8-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN mvn -B package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/target/order-service-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 3004
ENTRYPOINT ["java", "-jar", "app.jar"]
