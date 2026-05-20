# Sơ đồ C2 toàn hệ thống DTPShop

Sơ đồ ảnh dễ xem hơn nằm ở [SYSTEM_C4_CONTAINER_DIAGRAM_CLEAN.png](SYSTEM_C4_CONTAINER_DIAGRAM_CLEAN.png). Bản Mermaid dưới đây giữ đúng luồng kiến trúc, trong đó `chat-service` đi qua `API Gateway` giống các service khác.

```mermaid
flowchart TB
  U[Người dùng / Trình duyệt]
  FE[Frontend React\n5173]
  GW[API Gateway\nNode.js :8080]

  subgraph CORE[Nhóm service nghiệp vụ]
    AUTH[auth-service\nNode.js :3001]
    USER[user-service\nSpring Boot :3002]
    PROD[product-service\nSpring Boot :3003]
    ORD[order-service\nSpring Boot :3004]
    PAY[payment-service\nSpring Boot :3005]
    AI[ai-service\nSpring Boot :3009]
    CHAT[chat-service\nNode.js :3008]
  end

  subgraph DATA[Lớp dữ liệu / hạ tầng]
    MYSQL[(AWS RDS MySQL\nauthdb, userdb, productdb, orderdb, paymentdb)]
    REDIS[(Redis shared\nOTP, refresh token, cache, cart)]
    CHATREDIS[(Redis chat)]
    DDB[(AWS DynamoDB\nrooms, messages, notifications)]
    MQ[(RabbitMQ\norder events)]
    S3[(AWS S3\nproduct images)]
  end

  subgraph EXTERNAL[Hệ thống ngoài]
    SMTP[SMTP Gmail]
    GEMINI[Google AI / Gemini]
    MOMO[MoMo]
  end

  U --> FE --> GW
  GW --> AUTH
  GW --> USER
  GW --> PROD
  GW --> ORD
  GW --> PAY
  GW --> AI
  GW --> CHAT

  AUTH --> MYSQL
  AUTH --> REDIS
  AUTH --> SMTP

  USER --> MYSQL

  PROD --> MYSQL
  PROD --> REDIS
  PROD --> S3

  ORD --> MYSQL
  ORD --> REDIS
  ORD --> MQ
  ORD --> PAY
  ORD --> PROD

  PAY --> MYSQL
  PAY --> MOMO

  AI --> MYSQL
  AI --> GEMINI

  CHAT --> CHATREDIS
  CHAT --> DDB
  CHAT --> S3

  ANNO[Chat traffic also goes through the gateway:\n/chat, /api/chat, /socket.io, /uploads]

  GW --- ANNO
```

Ghi chú: `AWS RDS MySQL` là CSDL chính theo schema riêng cho từng service; `chat-service` dùng thêm `DynamoDB` và một Redis cache riêng.
