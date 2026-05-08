# API Gateway — Product, Tech & Structure

## Product Description

**API Gateway** là điểm vào duy nhất (single entry point) của toàn bộ hệ thống. Mọi request từ User Interface hoặc Chat AI đều đi qua đây trước khi được forward đến các microservice. Đây là thành phần bắt buộc theo tiêu chí chấm (0.25 điểm).

### Chức năng

| Chức năng | Mô tả |
|-----------|-------|
| **Routing** | Định tuyến request đến đúng service theo path |
| **JWT Verification** | Gọi auth-service verify token trước khi forward |
| **Header Injection** | Inject `X-User-Id`, `X-User-Role`, `X-User-Email` vào request |
| **Rate Limiter Server** | Giới hạn request theo IP ở server level (tiêu chí #14) |
| **CORS** | Xử lý Cross-Origin cho frontend |
| **Load Balancing** | Round-robin nếu có nhiều instance (mở rộng sau) |
| **Request Logging** | Log tất cả request/response |

### Routing Table

| Path Prefix | Forward đến | Auth Required |
|-------------|-------------|---------------|
| `/auth/*` | auth-service:3001 | No |
| `/users/*` | user-service:3002 | Yes |
| `/products/*` | product-service:3003 | Partial (GET: No, Write: Yes) |
| `/orders/*` | order-service:3004 | Yes |
| `/payments/*` | payment-service:3005 | Yes |
| `/chat/*` | chat-ai:3006 | Yes |

---

## Tech Stack

**Node.js + Express.js** hoặc có thể dùng **http-proxy-middleware**:

```js
import { createProxyMiddleware } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';

// Server-side Rate Limiter (Tiêu chí #14)
const serverLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,            // 100 req/phút/IP cho toàn gateway
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(serverLimiter);

// JWT Verification Middleware
async function verifyJWT(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  const result = await axios.post('http://auth-service:3001/auth/verify', { token });
  req.headers['X-User-Id'] = result.data.userId;
  req.headers['X-User-Role'] = result.data.role;
  req.headers['X-User-Email'] = result.data.email;
  next();
}

// Route proxies
app.use('/auth', createProxyMiddleware({ target: 'http://auth-service:3001' }));
app.use('/products', createProxyMiddleware({ target: 'http://product-service:3003' }));
app.use('/orders', [verifyJWT, createProxyMiddleware({ target: 'http://order-service:3004' })]);
```

### Biến môi trường

```env
PORT=8080
AUTH_SERVICE_URL=http://auth-service:3001
USER_SERVICE_URL=http://user-service:3002
PRODUCT_SERVICE_URL=http://product-service:3003
ORDER_SERVICE_URL=http://order-service:3004
PAYMENT_SERVICE_URL=http://payment-service:3005
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8080
CMD ["node", "src/index.js"]
```

---

## Project Structure

```
src/
├── index.js
├── app.js
│
├── config/
│   └── routes.config.js        # Mapping path → service URL
│
├── middlewares/
│   ├── jwtVerify.js            # Gọi auth-service verify
│   ├── injectUserHeaders.js    # Inject X-User-* vào request
│   ├── rateLimiter.server.js   # Server Rate Limiter (tiêu chí #14)
│   ├── cors.js                 # CORS config
│   └── requestLogger.js        # Log mọi request
│
├── proxy/
│   └── proxyRouter.js          # Setup proxy middleware cho từng route
│
└── utils/
    └── logger.js
```
