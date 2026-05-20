# DTPShop - Service-Based E-Commerce System

**Status:** ✅ Production Ready | **Last Updated:** May 20, 2026

> **📚 SYNCHRONIZED DOCUMENTATION AVAILABLE**  
> All documentation is now synchronized with actual service implementations.  
> See documentation index below for detailed guides.

---

## 🎯 Quick Links

| Document                                                       | Purpose                                                   |
| -------------------------------------------------------------- | --------------------------------------------------------- |
| **[SERVICES_DOCUMENTATION.md](SERVICES_DOCUMENTATION.md)**     | 📋 Complete services catalog, architecture, and data flow |
| **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)**               | 📡 Full API reference with examples for all 8 services    |
| **[DEPLOYMENT_TESTING_GUIDE.md](DEPLOYMENT_TESTING_GUIDE.md)** | 🚀 Setup, deployment, testing, and troubleshooting        |

---

## 🏗️ System Overview

DTPShop is a modern microservices-based e-commerce platform with **8 specialized services**:

```
┌─────────────────────────────────────┐
│     Frontend (React + Vite)         │
│          Port: 5173                 │
└──────────────┬──────────────────────┘
               │ HTTP/WebSocket
               ↓
┌──────────────────────────────────────┐
│     API Gateway (Express.js)         │
│     Port: 3000 (Single entry point)  │
└─┬─────────┬────────┬──────┬────┬─┐──┘
  │         │        │      │    │ │
┌─▼─┐ ┌────▼─┐ ┌──┴──┐ ┌───▼─┐ ┌▼▼─┐ ┌──────┐
│Au │ │User  │ │Prod │ │Ord  │ │Pay│ │Chat  │
│3001│ │3002  │ │3003 │ │3004 │ │3005│ │3007  │
└───┘ └──────┘ └─────┘ └─────┘ └──┘ └──────┘
      + AI Service (3009)

 Database: AWS RDS MySQL | Cache: Redis | Queue: RabbitMQ
```

---

## 📦 Services Catalog

### 1. **Auth Service** (3001) - Node.js

- User registration with OTP verification
- JWT + Refresh token authentication
- Password reset & avatar upload
- **Tech:** Express.js + Redis + MySQL

### 2. **User Service** (3002) - Spring Boot

- Profile management (post-auth)
- Admin user administration
- Account lock/unlock capabilities
- **Tech:** Spring Boot 3.x + Java 21

### 3. **Product Service** (3003) - Spring Boot

- Product catalog with filtering & search
- Category management
- Cart operations (Redis-backed)
- Inventory management & stock reservation
- **Tech:** Spring Boot + Redis cache + MySQL

### 4. **Order Service** (3004) - Spring Boot

- Guest cart management (Session-based, Redis storage)
- Order creation & orchestration
- Cart merge after login
- Real-time WebSocket updates
- Event publishing to RabbitMQ
- **Tech:** Spring Boot + RabbitMQ + WebSocket

### 5. **Payment Service** (3005) - Spring Boot

- Payment processing (MoMo + COD)
- Webhook handling for payment callbacks
- Transaction tracking
- **Tech:** Spring Boot + MoMo API

### 6. **Chat Service** (3007) - Node.js

- Real-time messaging (Socket.io)
- File upload & sharing
- Conversation history
- **Tech:** Express.js + Socket.io + DynamoDB

### 7. **AI Service** (3009) - Spring Boot

- Customer support assistant (Google Gemini)
- Filtered context queries (user data only)
- Vietnamese language responses
- **Tech:** Spring Boot + Google Gemini API

### 8. **API Gateway** (3000) - Express.js

- Single entry point for all services
- JWT verification & optional auth
- Rate limiting & CORS
- Route proxying

---

## 🔐 User Roles & Permissions

### 👤 Guest

- Browse products & categories
- Add items to cart (Session-based)
- View cart
- ❌ Cannot checkout directly

### 👥 Customer (Registered)

- All guest functionality
- Login/logout with JWT
- Place orders (must be logged in)
- Track orders in real-time
- Chat with support
- Ask AI assistant
- Manage profile

### 🔑 Admin

- Manage products (CRUD)
- Manage categories
- Manage user accounts
- View & update all orders
- Monitor payment transactions

---

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Clone and navigate to project
cd service-base-ecommerce-system

# Start all services + infrastructure
docker-compose up -d --build

# Verify all services are running
docker-compose ps

# View logs for a specific service
docker-compose logs -f order-service
```

### Option 2: Local Development

See [DEPLOYMENT_TESTING_GUIDE.md](DEPLOYMENT_TESTING_GUIDE.md#local-development-setup) for detailed setup instructions.

---

## 📊 Architecture Highlights

### Data Flow

```
Guest Add to Cart:
  → Session + guest:<sessionId>
  → Cart saved to Redis (24h TTL)
  → Data synced to Product Service

Login & Merge:
  → JWT generated + stored
  → Guest cart merged to user cart
  → Guest token invalidated
  → Items appear immediately

Create Order:
  → OrderService reserves inventory
  → PaymentService creates payment
  → RabbitMQ publishes order.created event
  → WebSocket notifies dashboard
  → Email sent to customer
  → Cart cleared from Redis
```

### Caching Strategy

- **Products:** Cache-aside pattern with Redis
- **Cart:** Redis with 24-hour TTL
- **Sessions:** Server-side + cookie-based for guests

### Event-Driven Communication

- **RabbitMQ:** Async tasks (email, notifications)
- **HTTP Client:** Sync calls (inventory, payment)
- **WebSocket:** Real-time order updates

---

## 🔑 Environment Configuration

### Unified Approach (Recommended)

Create `.env` file in project root:

```env
# AWS RDS MySQL (Shared by all services)
RDS_HOST=database-1-instance-1.cvwyy4mmuaiw.ap-southeast-1.rds.amazonaws.com
RDS_PORT=3306
RDS_USER=admin
RDS_PASSWORD=your_rds_password
RDS_SSL=false

# Redis (Shared cache)
REDIS_HOST=localhost
REDIS_PORT=6379

# RabbitMQ (Shared message broker)
SPRING_RABBITMQ_HOST=localhost
SPRING_RABBITMQ_PORT=5672
```

Individual services have additional config (see [SERVICES_DOCUMENTATION.md](SERVICES_DOCUMENTATION.md))

---

## 🧪 Testing

### Health Checks

```bash
# All services
for port in 3000 3001 3002 3003 3004 3005 3007 3009; do
  echo "Testing :$port"
  curl http://localhost:$port/health || curl http://localhost:$port/api/health
done
```

### Sample Test Scenarios

See [DEPLOYMENT_TESTING_GUIDE.md](DEPLOYMENT_TESTING_GUIDE.md#end-to-end-workflow-testing) for complete workflows:

- Guest → Register → Login → Merge Cart → Checkout
- Customer Profile Management
- Admin Operations

### API Examples

```bash
# List products
curl http://localhost:3000/api/products?page=0&size=10

# Add to cart (guest)
curl -X POST http://localhost:3000/api/cart/guest:abc123/items \
  -H "Content-Type: application/json" \
  -d '{"productId": 1, "quantity": 2}'

# Create order (authenticated)
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"shippingAddress": "123 Main St", "paymentMethod": "MOMO"}'
```

Full API reference: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

---

## 📋 Database Schema Distribution

| Service         | Database       | Purpose                         |
| --------------- | -------------- | ------------------------------- |
| auth-service    | authdb         | Users, OTP logs, refresh tokens |
| user-service    | userdb         | User profiles                   |
| product-service | productdb      | Products, categories, inventory |
| order-service   | orderdb        | Orders, order items, cart       |
| payment-service | paymentdb      | Payment records, transactions   |
| chat-service    | DynamoDB       | Messages, conversations         |
| ai-service      | ecommerce_data | Read-only access to FAQ         |

---

## 🔄 Key Features

### ✅ Guest Cart System

- Session-based identification
- Redis data persistence
- Automatic 24-hour expiration
- Seamless merge after login

### ✅ Hybrid Orchestration

- Synchronous HTTP calls for critical operations
- Asynchronous RabbitMQ events for notifications
- Compensating transactions for failures

### ✅ Real-Time Updates

- WebSocket for order status
- Socket.io for chat messaging
- Immediate UI updates without polling

### ✅ Security

- JWT authentication with refresh tokens
- OTP-based registration
- Password hashing (bcrypt)
- Role-based access control

### ✅ Payment Integration

- MoMo sandbox support
- COD (Cash on Delivery)
- Webhook verification (HMAC SHA256)

### ✅ AI Assistant

- Google Gemini integration
- User-filtered context queries
- Vietnamese language support

---

## 📞 Support & Troubleshooting

### Common Issues

**Port already in use?**

```bash
lsof -i :3000  # Find PID
kill -9 <PID>  # Kill process
```

**Database not connecting?**

```bash
# Test MySQL connection
mysql -h <RDS_HOST> -u <RDS_USER> -p

# Test Redis connection
redis-cli ping
```

**Cart not syncing?**

```bash
# Check Redis
redis-cli GET "cart:guest:abc123"

# Flush if needed
redis-cli FLUSHDB
```

See [DEPLOYMENT_TESTING_GUIDE.md](DEPLOYMENT_TESTING_GUIDE.md#troubleshooting) for more solutions.

---

## 📚 Documentation Index

| File                                                       | Content                                         |
| ---------------------------------------------------------- | ----------------------------------------------- |
| [SERVICES_DOCUMENTATION.md](SERVICES_DOCUMENTATION.md)     | Complete service descriptions, roles, workflows |
| [API_DOCUMENTATION.md](API_DOCUMENTATION.md)               | Full API reference with curl examples           |
| [DEPLOYMENT_TESTING_GUIDE.md](DEPLOYMENT_TESTING_GUIDE.md) | Setup, testing, deployment, monitoring          |
| Individual Service READMEs                                 | Service-specific details                        |

---

## 🔧 Technology Stack

| Layer                | Technology                          |
| -------------------- | ----------------------------------- |
| **Frontend**         | React 18 + Vite + Tailwind CSS      |
| **API Gateway**      | Express.js                          |
| **Services**         | Spring Boot 3.x (Java 21) + Node.js |
| **Database**         | AWS RDS MySQL 8                     |
| **Cache**            | Redis 7                             |
| **Message Queue**    | RabbitMQ 3                          |
| **Real-time**        | Socket.io + WebSocket               |
| **Payment**          | MoMo Sandbox API                    |
| **AI**               | Google Gemini API                   |
| **Containerization** | Docker & Docker Compose             |

---

## 📝 License & Contributing

This is an academic project for Software Architecture demonstration.

---

## ✨ Last Synchronized

**Documentation Updated:** May 20, 2026  
**All Services:** ✅ Verified & Synchronized  
**Status:** Production Ready
