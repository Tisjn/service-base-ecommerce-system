# Chat Service — Project Structure

## Cấu trúc thư mục

```
src/
├── index.js                        # Entry point - khởi tạo HTTP + WebSocket server
├── app.js                          # Express setup, middleware, routes
│
├── config/
│   ├── dynamo.js                   # DynamoDB DocumentClient config
│   ├── redis.js                    # ioredis client (cache + pub/sub)
│   ├── websocket.js                # Socket.io configuration
│   └── env.js                      # Load & validate biến môi trường
│
├── routes/
│   ├── chat.routes.js              # REST API routes (/chat/rooms, /chat/messages)
│   └── upload.routes.js            # File upload routes (/chat/upload)
│
├── controllers/
│   ├── chat.controller.js          # REST API handlers
│   └── upload.controller.js        # File upload handlers
│
├── services/                       # [Business Layer]
│   ├── chat.service.js             # createRoom(), sendMessage(), closeRoom()
│   ├── websocket.service.js        # handleMessage(), handleTyping(), broadcast()
│   ├── notification.service.js     # sendPushNotification(), sendEmail()
│   └── file.service.js             # uploadFile(), validateFile(), getFileUrl()
│
├── repositories/                   # [Persistence Layer]
│   ├── room.repository.js          # DynamoDB: findRooms(), createRoom(), updateRoom()
│   ├── message.repository.js       # DynamoDB: saveMessage(), getMessages()
│   └── notification.repository.js  # Redis: saveNotification(), getPendingNotifications()
│
├── middlewares/
│   ├── auth.js                     # JWT authentication middleware
│   ├── rateLimiter.js              # express-rate-limit cho API calls
│   ├── errorHandler.js             # Global error handler
│   ├── validateRequest.js          # express-validator middleware
│   └── cors.js                     # CORS configuration cho WebSocket
│
├── utils/
│   ├── jwt.utils.js                # verifyToken() - dùng chung với auth-service
│   ├── file.utils.js               # generateFileName(), getFileExtension()
│   ├── logger.js                   # Winston logger
│   └── sanitizer.js                # Sanitize HTML trong messages
│
├── sockets/                        # [WebSocket Layer]
│   ├── chat.socket.js              # Socket.io event handlers
│   ├── auth.socket.js              # WebSocket authentication
│   └── room.socket.js              # Room management (join/leave)
│
└── models/
    ├── ChatRoom.js                 # Room model/schema
    ├── ChatMessage.js              # Message model/schema
    └── ChatNotification.js         # Notification model/schema
```

## API Endpoints (REST)

| Method | Path                           | Auth | Mô tả                         |
| ------ | ------------------------------ | ---- | ----------------------------- |
| GET    | `/chat/rooms`                  | JWT  | Lấy danh sách chat rooms      |
| POST   | `/chat/rooms`                  | JWT  | Tạo chat room mới (customer)  |
| GET    | `/chat/rooms/:roomId`          | JWT  | Lấy chi tiết room             |
| PUT    | `/chat/rooms/:roomId/close`    | JWT  | Đóng chat room                |
| GET    | `/chat/rooms/:roomId/messages` | JWT  | Lấy lịch sử chat (pagination) |
| POST   | `/chat/upload`                 | JWT  | Upload file/image             |
| GET    | `/chat/notifications`          | JWT  | Lấy pending notifications     |
| PUT    | `/chat/notifications/:id/read` | JWT  | Đánh dấu notification đã đọc  |

## WebSocket Events

| Event         | Direction     | Handler File     | Mô tả                        |
| ------------- | ------------- | ---------------- | ---------------------------- |
| `connection`  | Client→Server | `auth.socket.js` | Xác thực JWT khi connect     |
| `join_room`   | Client→Server | `room.socket.js` | Tham gia chat room           |
| `leave_room`  | Client→Server | `room.socket.js` | Rời khỏi chat room           |
| `message`     | Client→Server | `chat.socket.js` | Gửi tin nhắn                 |
| `typing`      | Client→Server | `chat.socket.js` | Chỉ báo đang gõ              |
| `disconnect`  | Client→Server | `auth.socket.js` | Cleanup khi disconnect       |
| `message`     | Server→Client | `chat.socket.js` | Broadcast tin nhắn           |
| `typing`      | Server→Client | `chat.socket.js` | Broadcast typing indicator   |
| `user_joined` | Server→Client | `room.socket.js` | User tham gia room           |
| `user_left`   | Server→Client | `room.socket.js` | User rời room                |
| `room_closed` | Server→Client | `chat.socket.js` | Room đã đóng                 |
| `new_room`    | Server→Admin  | `chat.socket.js` | Thông báo room mới cho admin |

## DynamoDB Tables

```text
Table: chat_rooms
- PK: roomId (String)
- Attributes: customerId, adminId, status, createdAt, updatedAt
- GSI1 (customerId-createdAt-index): query rooms theo customer
- GSI2 (status-createdAt-index): query danh sách room active cho admin

Table: chat_messages
- PK: roomId (String)
- SK: sentAt#messageId (String)
- Attributes: messageId, senderId, senderType, message, messageType, fileUrl
- Query theo roomId để lấy lịch sử chat theo thời gian

Table: chat_notifications
- PK: userId (String)
- SK: createdAt#notificationId (String)
- Attributes: roomId, messageId, isRead

Redis keys (notification queue)
- notifications:{userId} - list of pending notification IDs
- notification:{id} - notification payload (JSON)
```

## File Storage Structure

```
uploads/
├── chat/
│   ├── images/                     # Chat images (jpg, png, gif)
│   │   ├── 2024/
│   │   │   ├── 01/
│   │   │   │   ├── room_123_1704067200.jpg
│   │   │   │   └── room_123_1704067300.png
│   └── files/                      # Chat files (pdf, doc, txt)
│       ├── 2024/
│       │   ├── 01/
│       │   │   ├── room_123_1704067400.pdf
│       │   │   └── room_123_1704067500.docx
```

## Environment Variables

````env
# AWS DynamoDB
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
DDB_CHAT_ROOMS_TABLE=chat_rooms
DDB_CHAT_MESSAGES_TABLE=chat_messages
DDB_CHAT_NOTIFICATIONS_TABLE=chat_notifications

# Redis
REDIS_HOST=redis-cache-chat
REDIS_PORT=6379

# JWT (shared with auth-service)
JWT_SECRET=your_jwt_secret_key

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880  # 5MB
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/gif
ALLOWED_FILE_TYPES=application/pdf,text/plain,application/msword

# Server
PORT=3008
NODE_ENV=production

# CORS
FRONTEND_URL=http://localhost:5173
```</content>
<parameter name="filePath">d:\2.University\4.Semester_2_2025-2026\2.Software_architecture\1.Final_Project\service-base-ecommerce-system\files\chat-structure.md
````
