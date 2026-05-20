# 📚 Complete Documentation Index

**Last Synchronized:** May 20, 2026  
**Status:** ✅ All Documentation Updated & Verified

---

## 🎯 Start Here

**New to the project?** Start with [README.md](README.md) for a quick overview.

**Need technical details?** Follow the guide below based on your role.

---

## 👥 Documentation by Role

### 🔨 Developer

| Goal                       | Document                                                                              | Read Time |
| -------------------------- | ------------------------------------------------------------------------------------- | --------- |
| Understand all services    | [SERVICES_DOCUMENTATION.md](SERVICES_DOCUMENTATION.md)                                | 20 min    |
| Use APIs to build frontend | [API_DOCUMENTATION.md](API_DOCUMENTATION.md)                                          | 30 min    |
| Setup local development    | [DEPLOYMENT_TESTING_GUIDE.md](DEPLOYMENT_TESTING_GUIDE.md#local-development-setup)    | 15 min    |
| Test your changes          | [DEPLOYMENT_TESTING_GUIDE.md](DEPLOYMENT_TESTING_GUIDE.md#service-by-service-testing) | 20 min    |
| Debug issues               | [DEPLOYMENT_TESTING_GUIDE.md](DEPLOYMENT_TESTING_GUIDE.md#troubleshooting)            | 10 min    |

**Typical Flow:**

1. Read main README
2. Study SERVICES_DOCUMENTATION
3. Reference API_DOCUMENTATION while coding
4. Use DEPLOYMENT_TESTING_GUIDE for testing

### 🏛️ Architect / Tech Lead

| Goal                         | Document                                                                              | Read Time |
| ---------------------------- | ------------------------------------------------------------------------------------- | --------- |
| System architecture overview | [SERVICES_DOCUMENTATION.md](SERVICES_DOCUMENTATION.md#-system-architecture-overview)  | 10 min    |
| Service interactions         | [SERVICES_DOCUMENTATION.md](SERVICES_DOCUMENTATION.md#-data-synchronization-patterns) | 15 min    |
| Database design              | [SERVICES_DOCUMENTATION.md](SERVICES_DOCUMENTATION.md#-database-schema-distribution)  | 5 min     |
| Security model               | [SERVICES_DOCUMENTATION.md](SERVICES_DOCUMENTATION.md#-security-layers)               | 10 min    |
| Performance optimization     | [DEPLOYMENT_TESTING_GUIDE.md](DEPLOYMENT_TESTING_GUIDE.md#performance-monitoring)     | 10 min    |

### 🧪 QA / Tester

| Goal                     | Document                                                                               | Read Time |
| ------------------------ | -------------------------------------------------------------------------------------- | --------- |
| System overview          | [README.md](README.md)                                                                 | 5 min     |
| Test scenarios           | [DEPLOYMENT_TESTING_GUIDE.md](DEPLOYMENT_TESTING_GUIDE.md#end-to-end-workflow-testing) | 25 min    |
| Service-by-service tests | [DEPLOYMENT_TESTING_GUIDE.md](DEPLOYMENT_TESTING_GUIDE.md#service-by-service-testing)  | 20 min    |
| Deployment checklist     | [DEPLOYMENT_TESTING_GUIDE.md](DEPLOYMENT_TESTING_GUIDE.md#deployment-checklist)        | 5 min     |

### 🚀 DevOps / SRE

| Goal                   | Document                                                                             | Read Time |
| ---------------------- | ------------------------------------------------------------------------------------ | --------- |
| Quick overview         | [README.md](README.md)                                                               | 5 min     |
| Docker deployment      | [DEPLOYMENT_TESTING_GUIDE.md](DEPLOYMENT_TESTING_GUIDE.md#docker-compose-deployment) | 15 min    |
| Performance monitoring | [DEPLOYMENT_TESTING_GUIDE.md](DEPLOYMENT_TESTING_GUIDE.md#performance-monitoring)    | 15 min    |
| Health checks          | [DEPLOYMENT_TESTING_GUIDE.md](DEPLOYMENT_TESTING_GUIDE.md#health-check-endpoints)    | 5 min     |

### 📊 Project Manager

| Goal                | Document                                 | Read Time |
| ------------------- | ---------------------------------------- | --------- |
| Project status      | [README.md](README.md#-quick-links)      | 3 min     |
| System capabilities | [README.md](README.md#-key-features)     | 5 min     |
| Technology stack    | [README.md](README.md#-technology-stack) | 3 min     |

---

## 📂 Document Descriptions

### [README.md](README.md)

**Purpose:** Project overview and quick reference  
**Content:**

- Quick start guide (Docker & local)
- Services overview with diagram
- User roles and permissions
- Testing examples
- Technology stack
- Troubleshooting quick tips

**Best for:** Everyone - start here first

---

### [SERVICES_DOCUMENTATION.md](SERVICES_DOCUMENTATION.md)

**Purpose:** Comprehensive service descriptions and architecture  
**Content:**

- Complete system architecture diagram
- 8 services detailed breakdown:
  - Purpose and role
  - Key functions
  - API routes
  - Technology stack
- Data synchronization patterns
- Database schema distribution
- Security layers
- Environment configuration
- Performance optimization

**Best for:** Technical teams, architects, developers

**Key Sections:**

- [Services Catalog](#-services-catalog) - All 8 services explained
- [Data Synchronization](#-data-synchronization-patterns) - How services communicate
- [Security Layers](#-security-layers) - Authentication & authorization

---

### [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

**Purpose:** Complete API reference with examples  
**Content:**

- 7 service APIs (Auth, User, Product, Cart/Order, Payment, Chat, AI)
- Real curl examples for every endpoint
- Request/response formats
- Authentication requirements
- Query parameters
- Common response formats
- Rate limiting info
- Error handling

**Best for:** Frontend developers, API consumers, testing

**Quick Navigation:**

- [Auth Service API](#auth-service-api) - Login/register examples
- [Product Service API](#product-service-api) - Product & cart operations
- [Cart & Order Service API](#cart--order-service-api) - Order workflows
- [Payment Service API](#payment-service-api) - Payment creation
- [AI Service API](#ai-service-api) - Assistant queries

---

### [DEPLOYMENT_TESTING_GUIDE.md](DEPLOYMENT_TESTING_GUIDE.md)

**Purpose:** Setup, deployment, testing, and troubleshooting  
**Content:**

- Local development environment setup
- Docker Compose deployment
- Service-by-service testing with curl
- End-to-end workflow testing (3 scenarios)
- Troubleshooting common issues
- Performance monitoring
- Health check endpoints

**Best for:** DevOps, QA, developers setting up locally

**Key Sections:**

- [Local Development Setup](#local-development-setup)
- [Docker Compose Deployment](#docker-compose-deployment)
- [End-to-End Workflow Testing](#end-to-end-workflow-testing)
- [Troubleshooting](#troubleshooting)

---

### Individual Service READMEs

Each service has its own README with:

- Service-specific configuration
- Running instructions
- Database schema (if applicable)
- API overview

**Locations:**

- `services/auth-service/README.md`
- `services/user-service/README.md`
- `services/product-service/README.md`
- `services/order-service/README.md`
- `services/payment-service/README.md`
- `services/chat-service/` (structure.md, tech.md, product.md)
- `services/ai-service/README.md`

---

## 🔍 Quick Reference

### Common Tasks

**I want to...**

| Task                       | Document                                                                                  | Section               |
| -------------------------- | ----------------------------------------------------------------------------------------- | --------------------- |
| Start the system           | [DEPLOYMENT_TESTING_GUIDE.md](DEPLOYMENT_TESTING_GUIDE.md#docker-compose-deployment)      | Docker Compose        |
| Add a new API endpoint     | [API_DOCUMENTATION.md](API_DOCUMENTATION.md)                                              | Relevant service API  |
| Debug cart not syncing     | [DEPLOYMENT_TESTING_GUIDE.md](DEPLOYMENT_TESTING_GUIDE.md#troubleshooting)                | Cart Data Not Syncing |
| Test guest → customer flow | [DEPLOYMENT_TESTING_GUIDE.md](DEPLOYMENT_TESTING_GUIDE.md#scenario-1-guest-checkout-flow) | Scenario 1            |
| Deploy to production       | [DEPLOYMENT_TESTING_GUIDE.md](DEPLOYMENT_TESTING_GUIDE.md#deployment-checklist)           | Checklist             |
| Monitor performance        | [DEPLOYMENT_TESTING_GUIDE.md](DEPLOYMENT_TESTING_GUIDE.md#performance-monitoring)         | Health Checks         |
| List all products via API  | [API_DOCUMENTATION.md](API_DOCUMENTATION.md#1-get-products-list)                          | Product Service       |
| Create a payment           | [API_DOCUMENTATION.md](API_DOCUMENTATION.md#1-create-payment)                             | Payment Service       |
| Handle payment webhook     | [API_DOCUMENTATION.md](API_DOCUMENTATION.md#5-momo-webhook-handler-internal)              | Payment Service       |
| Add real-time updates      | [SERVICES_DOCUMENTATION.md](SERVICES_DOCUMENTATION.md#-services-catalog)                  | Order Service         |
| Use AI assistant           | [API_DOCUMENTATION.md](API_DOCUMENTATION.md#ai-service-api)                               | AI Service API        |

---

## 📊 Service Port Map

```
┌─────────────────────────────────────────┐
│ API Gateway → :3000 (Public Entry Point)│
└─────────────────────────────────────────┘
           ↓
    ┌──────┴──────────┐
    │                 │
    ↓                 ↓
  Auth Service    User Service      Product Service    Order Service
     :3001            :3002             :3003             :3004
  (Node.js)      (Spring Boot)     (Spring Boot)     (Spring Boot)

Payment Service    Chat Service     AI Service       Frontend
    :3005            :3007            :3009           :5173
(Spring Boot)     (Node.js)      (Spring Boot)      (React+Vite)
```

---

## 🔗 Database & Infrastructure

```
AWS RDS MySQL (ecommerce_data)
├── authdb (auth-service)
├── userdb (user-service)
├── productdb (product-service)
├── orderdb (order-service)
└── paymentdb (payment-service)

Redis (Cache & Session)
├── Product cache
├── Cart data (24h TTL)
└── Session/OTP data

RabbitMQ (Message Broker)
├── order.created events
└── order.cancelled events

DynamoDB (Chat messages)
└── Conversations & messages

AWS S3 (File Storage)
├── Product images
├── Chat files
└── User avatars (optional)
```

---

## ✅ Synchronization Checklist

Documentation has been synchronized with:

- ✅ **Auth Service (3001)** - Node.js microservice
- ✅ **User Service (3002)** - Spring Boot microservice
- ✅ **Product Service (3003)** - Spring Boot microservice
- ✅ **Order Service (3004)** - Spring Boot microservice
- ✅ **Payment Service (3005)** - Spring Boot microservice
- ✅ **Chat Service (3007)** - Node.js microservice
- ✅ **AI Service (3009)** - Spring Boot microservice
- ✅ **API Gateway (3000)** - Express.js router
- ✅ **Frontend** - React application
- ✅ **Infrastructure** - Redis, RabbitMQ, MySQL

---

## 🔄 Document Update History

| Date       | Update                                     | Files                                                               |
| ---------- | ------------------------------------------ | ------------------------------------------------------------------- |
| 2026-05-20 | Complete synchronization with all services | SERVICES_DOCUMENTATION, API_DOCUMENTATION, DEPLOYMENT_TESTING_GUIDE |
| 2026-05-14 | Guest cart fix implementation              | README, various services                                            |

---

## 💡 Tips for Using This Documentation

1. **Start with README.md** - Get oriented with the project
2. **Reference SERVICES_DOCUMENTATION** - Understand architecture
3. **Use API_DOCUMENTATION** - When implementing features
4. **Consult DEPLOYMENT_TESTING_GUIDE** - For testing & troubleshooting
5. **Check service READMEs** - For service-specific details

---

## 🆘 Getting Help

### I'm confused about...

- **System architecture** → [SERVICES_DOCUMENTATION.md](SERVICES_DOCUMENTATION.md#-system-architecture-overview)
- **How a specific API works** → [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- **How to run the system** → [DEPLOYMENT_TESTING_GUIDE.md](DEPLOYMENT_TESTING_GUIDE.md#docker-compose-deployment)
- **How services communicate** → [SERVICES_DOCUMENTATION.md](SERVICES_DOCUMENTATION.md#-data-synchronization-patterns)
- **Security & roles** → [SERVICES_DOCUMENTATION.md](SERVICES_DOCUMENTATION.md#-security-layers)

### Something is broken...

1. Check [DEPLOYMENT_TESTING_GUIDE.md - Troubleshooting](DEPLOYMENT_TESTING_GUIDE.md#troubleshooting)
2. Verify service health checks: [DEPLOYMENT_TESTING_GUIDE.md - Health Checks](DEPLOYMENT_TESTING_GUIDE.md#health-check-endpoints)
3. Review the relevant service README
4. Check Docker logs: `docker-compose logs <service-name>`

---

## 📈 Documentation Quality Metrics

- ✅ **Completeness:** All 8 services documented
- ✅ **Accuracy:** Verified against actual source code
- ✅ **Freshness:** Updated May 20, 2026
- ✅ **Examples:** 50+ API curl examples
- ✅ **Accessibility:** Organized by role and task
- ✅ **Consistency:** Unified format and terminology

---

## 🙏 Contributing to Documentation

When updating code:

1. Update corresponding API documentation
2. Update service description if functionality changes
3. Add example requests/responses
4. Update this index if new documents added
5. Note the date of update

---

**Questions?** Check the appropriate section above or review the service README files.
