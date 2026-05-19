# AI Service

`ai-service` is the customer support assistant for DTPShop. It reads a safe, fixed subset of the e-commerce database, builds a filtered context for the current user, and asks Google AI Studio/Gemini to answer in Vietnamese.

## Security Model

The service does not let Gemini generate or run SQL. All database reads are fixed `JdbcTemplate` queries.

Allowed tables:

- `products`
- `categories`
- `orders`, only rows where `orders.user_id = X-User-Id`
- `order_items`, only rows joined through orders owned by `X-User-Id`
- `faq_policy`

`X-User-Id` is expected to be injected by `api-gateway` after JWT verification. Direct calls without `X-User-Id` return `401`.

## Environment

```env
RDS_HOST=database-1-instance-1.cvwyy4mmuaiw.ap-southeast-1.rds.amazonaws.com
RDS_PORT=3306
RDS_DB=ecommerce_data
RDS_USER=admin
RDS_PASSWORD=your-password
RDS_SSL=false

GOOGLE_AI_API_KEY=your-google-ai-studio-api-key
GOOGLE_AI_MODEL=gemini-2.5-flash
SERVER_PORT=3009
```

Keep `GOOGLE_AI_API_KEY` in environment variables or `.env`; do not commit it.

## API

### Ask Assistant

```http
POST /api/ai/ask
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "question": "Don hang gan nhat cua toi dang o trang thai nao?"
}
```

Response:

```json
{
  "answer": "Don hang gan nhat cua ban...",
  "readableTables": [
    "products",
    "categories",
    "orders:self_only",
    "order_items:self_only",
    "faq_policy"
  ]
}
```

### Read Filtered Context

```http
GET /api/ai/summary
Authorization: Bearer <access-token>
```

This endpoint is useful for debugging. It returns the exact filtered context used by the assistant.

### Health

```http
GET /api/ai/health
```

## Run Locally

From `services/ai-service`:

```bash
mvn spring-boot:run
```

Or with Docker Compose:

```bash
docker compose up --build
```

## Gateway

`api-gateway` proxies these routes to this service:

- `/api/ai/*`
- `/ai/*`
- `/api/admin/ai/*`

All AI routes require JWT at the gateway so user-specific order data stays scoped to the authenticated user.
