@echo off
echo ============================================
echo Rebuilding Product Service
echo ============================================

echo.
echo Step 1: Clean Maven build...
call mvn clean

echo.
echo Step 2: Building with Maven...
call mvn package -DskipTests

echo.
echo Step 3: Rebuilding Docker image...
call docker-compose build --no-cache

echo.
echo Step 4: Starting containers...
call docker-compose down
call docker-compose up -d

echo.
echo Step 5: Checking container status...
call docker-compose ps

echo.
echo Step 6: Checking logs...
echo --- Redis Logs ---
call docker logs redis-cache-product

echo.
echo --- Product Service Logs ---
call docker logs product-service

echo.
echo Done! Rebuilt and restarted.
pause
