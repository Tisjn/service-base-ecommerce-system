# Chat Service — Tech Stack

## Ngôn ngữ & Runtime

**Node.js (v20 LTS)** — Lý do chọn:

- Socket.io (WebSocket library) hoạt động tốt nhất trên Node.js
- Real-time bidirectional communication phù hợp với event-driven model
- I/O-bound workload (DB + Redis + WebSocket) → Node async model tối ưu
- NPM ecosystem phong phú cho WebSocket, file upload, validation
- Docker image nhỏ gọn (~180MB)

## Framework & Thư viện

| Thư viện               | Mục đích                                     |
| ---------------------- | -------------------------------------------- |
| **Express.js**         | HTTP server, REST API routing                |
| **Socket.io**          | WebSocket real-time communication            |
| **jsonwebtoken**       | Verify JWT tokens từ auth-service            |
| **multer**             | File upload middleware (images/files)        |
| **ioredis**            | Redis client — cache + pub/sub notifications |
| **@aws-sdk/client-dynamodb** | DynamoDB low-level client              |
| **@aws-sdk/lib-dynamodb**    | DynamoDB DocumentClient (query/put/update) |
| **express-rate-limit** | Rate limiting cho API calls                  |
| **express-validator**  | Validate request body                        |
| **sharp**              | Image processing (resize, compress)          |
| **uuid**               | Generate unique file names                   |
| **dompurify**          | Sanitize HTML trong chat messages            |
| **winston**            | Structured logging                           |
| **dotenv**             | Environment variables                        |
| **cors**               | CORS configuration                           |

## WebSocket Configuration (Socket.io)

```js
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
  // Authentication middleware
  allowRequest: (req, callback) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return callback(new Error("Authentication required"), false);
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      callback(null, true);
    } catch (error) {
      callback(new Error("Invalid token"), false);
    }
  },
});

// Room-based messaging
io.on("connection", (socket) => {
  console.log(`User ${socket.user.id} connected`);

  // Join chat room
  socket.on("join_room", (roomId) => {
    socket.join(`room_${roomId}`);
    // Broadcast user joined
    socket.to(`room_${roomId}`).emit("user_joined", {
      userId: socket.user.id,
      userType: socket.user.role === "admin" ? "admin" : "customer",
    });
  });

  // Handle messages
  socket.on("message", async (data) => {
    const { roomId, message, type } = data;
    // Save to DB
    const savedMessage = await chatService.saveMessage({
      roomId,
      senderId: socket.user.id,
      senderType: socket.user.role === "admin" ? "admin" : "customer",
      message,
      type,
    });
    // Broadcast to room
    io.to(`room_${roomId}`).emit("message", savedMessage);
  });
});
```

## Database Configuration (DynamoDB)

```js
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const ddb = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

// Health check
async function testDynamoConnection() {
  try {
    await ddbClient.send(
      new DescribeTableCommand({
        TableName: process.env.DDB_CHAT_ROOMS_TABLE,
      }),
    );
    console.log("✅ DynamoDB connected successfully");
  } catch (error) {
    console.error("❌ DynamoDB connection failed:", error);
    process.exit(1);
  }
}
```

## Redis Configuration (Cache + Pub/Sub)

```js
import Redis from "ioredis";

// Main Redis client (cache)
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
});

// Pub/Sub client for notifications
const pubClient = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

const subClient = pubClient.duplicate();

// Notification system
class NotificationService {
  async sendNotification(userId, notification) {
    const key = `notifications:${userId}`;
    await redis.lpush(key, JSON.stringify(notification));
    await redis.expire(key, 7 * 24 * 60 * 60); // 7 days

    // Publish to pub/sub channel
    await pubClient.publish(
      `notifications:${userId}`,
      JSON.stringify(notification),
    );
  }

  async getPendingNotifications(userId) {
    const key = `notifications:${userId}`;
    const notifications = await redis.lrange(key, 0, -1);
    return notifications.map((n) => JSON.parse(n));
  }
}
```

## File Upload Configuration (Multer + Sharp)

```js
import multer from "multer";
import sharp from "sharp";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");

    let folder = "files";
    if (file.mimetype.startsWith("image/")) {
      folder = "images";
    }

    const uploadPath = path.join(
      process.env.UPLOAD_PATH,
      "chat",
      folder,
      year.toString(),
      month,
    );

    // Ensure directory exists
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${req.roomId}_${Date.now()}_${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedImages = ["image/jpeg", "image/png", "image/gif"];
  const allowedFiles = ["application/pdf", "text/plain", "application/msword"];

  if (
    allowedImages.includes(file.mimetype) ||
    allowedFiles.includes(file.mimetype)
  ) {
    cb(null, true);
  } else {
    cb(new Error("File type not allowed"), false);
  }
};

// Multer configuration
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE), // 5MB
  },
});

// Image processing middleware
export const processImage = async (req, res, next) => {
  if (!req.file || !req.file.mimetype.startsWith("image/")) {
    return next();
  }

  try {
    const processedPath = req.file.path.replace(/\.[^.]+$/, "_processed.jpg");

    await sharp(req.file.path)
      .resize(800, 600, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(processedPath);

    // Replace original with processed
    fs.unlinkSync(req.file.path);
    req.file.path = processedPath;
    req.file.filename = path.basename(processedPath);

    next();
  } catch (error) {
    next(error);
  }
};
```

## Docker Configuration

```dockerfile
FROM node:20-alpine

# Install dependencies for image processing
RUN apk add --no-cache \
    imagemagick \
    graphicsmagick \
    libjpeg-turbo-dev \
    libpng-dev

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Create uploads directory
RUN mkdir -p uploads/chat/images uploads/chat/files

EXPOSE 3008

CMD ["npm", "start"]
```

## Environment Variables

```env
# AWS DynamoDB
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
DDB_CHAT_ROOMS_TABLE=chat_rooms
DDB_CHAT_MESSAGES_TABLE=chat_messages
DDB_CHAT_NOTIFICATIONS_TABLE=chat_notifications

# Redis
REDIS_HOST=redis-cache-chat
REDIS_PORT=6379

# JWT
JWT_SECRET=your_jwt_secret_key_here

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/gif
ALLOWED_FILE_TYPES=application/pdf,text/plain,application/msword

# Server
PORT=3008
NODE_ENV=production

# CORS & Frontend
FRONTEND_URL=http://localhost:5173

# Logging
LOG_LEVEL=info
```

## Monitoring & Logging

````js
import winston from "winston";

// Logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/chat-service.log" }),
  ],
});

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });
  next();
});
```</content>
<parameter name="filePath">d:\2.University\4.Semester_2_2025-2026\2.Software_architecture\1.Final_Project\service-base-ecommerce-system\files\chat-tech.md
````
