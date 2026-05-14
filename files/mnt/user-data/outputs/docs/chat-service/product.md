# Chat Service — Product Description

## Tổng quan

**chat-service** là dịch vụ chat real-time giữa khách hàng và admin của hệ thống thương mại điện tử. Service này cung cấp giao tiếp tức thời qua WebSocket, lưu trữ lịch sử chat, và gửi thông báo khi có tin nhắn mới. Chat được tổ chức theo phòng (chat room) riêng biệt cho từng khách hàng.

## Actors & Use Cases

| Actor    | Hành động                                                              |
| -------- | ---------------------------------------------------------------------- |
| Customer | Khởi tạo chat room với admin → gửi tin nhắn text/image → nhận phản hồi |
| Customer | Xem lịch sử chat → đóng chat room                                      |
| Admin    | Nhận thông báo chat mới → trả lời khách hàng → quản lý nhiều chat room |
| Admin    | Xem danh sách chat room active → chuyển trạng thái chat                |
| System   | Push notification khi có tin nhắn mới (email/SMS nếu cần)              |

## Chức năng chính

### 1. Khởi tạo Chat Room (`POST /chat/rooms`)

**Customer tạo chat room mới:**

- Nhận `userId` từ JWT token
- Kiểm tra chưa có chat room active với user này
- Tạo chat room với status `active`, `customerId`, `adminId = null`
- Trả về `roomId` và WebSocket connection info
- Broadcast event "new_chat_room" đến tất cả admin online

**Admin tham gia chat room:**

- Admin chọn room từ danh sách → join room qua WebSocket
- Update `adminId` trong DynamoDB
- Broadcast "admin_joined" event đến customer

### 2. Real-time Messaging (WebSocket)

**Kết nối WebSocket (`/ws/chat`):**

- Authenticate bằng JWT token trong handshake
- Join room dựa trên `roomId` trong query params
- Listen events: `message`, `typing`, `join`, `leave`

**Gửi tin nhắn:**

```javascript
// Customer/Admin gửi tin nhắn
socket.emit("message", {
  roomId: "123",
  message: "Xin chào admin!",
  type: "text", // hoặc 'image', 'file'
});

// Server broadcast đến tất cả members trong room
io.to(roomId).emit("message", {
  id: "msg_456",
  senderId: "user_789",
  senderType: "customer",
  message: "Xin chào admin!",
  type: "text",
  timestamp: "2024-01-01T10:00:00Z",
});
```

**Typing indicator:**

```javascript
// Đang gõ
socket.emit("typing", { roomId: "123", isTyping: true });

// Server broadcast
io.to(roomId).emit("typing", {
  userId: "user_789",
  userType: "customer",
  isTyping: true,
});
```

### 3. Chat Management

**Xem danh sách chat rooms (`GET /chat/rooms`):**

- **Customer**: Chỉ xem rooms của mình
- **Admin**: Xem tất cả rooms, filter theo status (active/closed)

**Đóng chat room (`PUT /chat/rooms/{roomId}/close`):**

- Customer/Admin có thể đóng room
- Set status = `closed`
- Broadcast "room_closed" event

**Lịch sử chat (`GET /chat/rooms/{roomId}/messages`):**

- Pagination messages trong room
- Cache recent messages trong Redis

### 4. File Upload (Images/Files)

**Upload file (`POST /chat/upload`):**

- Accept: images (png/jpg), files (pdf/doc/txt) ≤ 5MB
- Lưu vào local storage hoặc cloud (AWS S3)
- Trả về file URL
- Gửi message với `type: 'image'` hoặc `type: 'file'`

### 5. Notifications

**Push notifications khi offline:**

- Nếu user offline → lưu notification vào Redis
- Khi user online lại → gửi tất cả pending notifications
- Tích hợp email/SMS notifications (tùy chọn)

**Real-time notifications:**

- Admin nhận "new_message" event ngay lập tức
- Customer nhận phản hồi từ admin

## Data Schema (DynamoDB)

```text
Table: chat_rooms
- PK: roomId (String)
- Attributes: customerId, adminId, status, createdAt, updatedAt
- GSI1: customerId-createdAt-index (rooms theo từng customer)
- GSI2: status-createdAt-index (rooms active/closed cho admin)

Table: chat_messages
- PK: roomId (String)
- SK: sentAt#messageId (String)
- Attributes: messageId, senderId, senderType, message, messageType, fileUrl
- Query theo roomId để lấy timeline theo thời gian

Table: chat_notifications
- PK: userId (String)
- SK: createdAt#notificationId (String)
- Attributes: roomId, messageId, isRead
```

## WebSocket Events

| Event         | Direction     | Payload                        | Mô tả                     |
| ------------- | ------------- | ------------------------------ | ------------------------- |
| `join_room`   | Client→Server | `{ roomId }`                   | Tham gia chat room        |
| `leave_room`  | Client→Server | `{ roomId }`                   | Rời khỏi chat room        |
| `message`     | Client→Server | `{ roomId, message, type }`    | Gửi tin nhắn              |
| `typing`      | Client→Server | `{ roomId, isTyping }`         | Chỉ báo đang gõ           |
| `message`     | Server→Client | `{ id, senderId, message... }` | Nhận tin nhắn             |
| `typing`      | Server→Client | `{ userId, isTyping }`         | User đang gõ              |
| `user_joined` | Server→Client | `{ userId, userType }`         | User tham gia room        |
| `user_left`   | Server→Client | `{ userId, userType }`         | User rời room             |
| `room_closed` | Server→Client | `{ roomId }`                   | Room đã đóng              |
| `new_room`    | Server→Admin  | `{ roomId, customerId }`       | Chat room mới (cho admin) |

## Security Considerations

- **JWT Authentication**: Mọi WebSocket connection cần valid JWT
- **Room Authorization**: Chỉ members của room mới nhận được messages
- **Rate Limiting**: Giới hạn messages/s per user (5 msg/s)
- **File Upload Security**: Validate file type, size, scan malware
- **XSS Protection**: Sanitize messages trước khi lưu/broadcast</content>
  <parameter name="filePath">d:\2.University\4.Semester_2_2025-2026\2.Software_architecture\1.Final_Project\service-base-ecommerce-system\files\chat.md
