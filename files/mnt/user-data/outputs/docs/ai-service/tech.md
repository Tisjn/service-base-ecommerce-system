# AI Service — Technology & Design

## Công nghệ

- Spring Boot 3.x
- Java 21
- Spring AI
- xAI Grok API
- Spring Web
- Spring Data JPA hoặc JdbcTemplate
- AWS RDS MySQL
- Spring Security cho admin endpoint
- Validation, Lombok, Actuator, OpenAPI

## Mục tiêu thiết kế

ai-service được thiết kế như một lớp trợ lý truy vấn dữ liệu an toàn cho admin. Service không tự ý thay đổi dữ liệu, mà chỉ đọc từ RDS, trích xuất insight và trả lời bằng ngôn ngữ tự nhiên thông qua Grok AI.

## Kiến trúc xử lý

```text
Admin → REST API → Spring Boot Service → Spring AI → Grok AI
                                   │
                                   ├── Metadata / Schema Reader
                                   ├── SQL Read-only Query Layer
                                   ├── Guardrail Layer
                                   └── Response Formatter
```

## Cách tích hợp Spring AI + Grok AI

- Spring AI được dùng làm lớp abstraction để gọi model chat.
- Grok AI nhận prompt gồm câu hỏi của admin, schema tóm tắt và dữ liệu đã được chọn lọc.
- Service yêu cầu model trả về câu trả lời ngắn gọn, có số liệu cụ thể, ưu tiên tiếng Việt.
- Nếu model yêu cầu thêm dữ liệu, service chỉ cho phép sinh truy vấn đọc dữ liệu hợp lệ.

## Chiến lược truy vấn RDS

- Sử dụng `JdbcTemplate` hoặc JPA projection để đọc dữ liệu nhanh.
- Ưu tiên truy vấn tổng hợp như `COUNT`, `SUM`, `GROUP BY`, `HAVING`.
- Với câu hỏi chi tiết, chỉ trả về số dòng giới hạn theo cấu hình.
- Dữ liệu nhạy cảm phải được loại bỏ trước khi đưa cho model.

## Quy tắc an toàn

- Chỉ cho phép query read-only.
- Chặn mọi câu lệnh chứa `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`.
- Áp whitelist bảng và cột.
- Với câu hỏi mơ hồ, service phải hỏi lại hoặc trả lời bằng cảnh báo thiếu ngữ cảnh.
- Log toàn bộ request để phục vụ audit.

## Biến môi trường

```env
# Server
SERVER_PORT=3009
SPRING_PROFILES_ACTIVE=prod

# RDS
SPRING_DATASOURCE_URL=jdbc:mysql://your-rds-endpoint:3306/ecommerce_db
SPRING_DATASOURCE_USERNAME=admin
SPRING_DATASOURCE_PASSWORD=your_rds_password

# Grok / xAI
SPRING_AI_XAI_BASE_URL=https://api.x.ai/v1
SPRING_AI_XAI_API_KEY=your_xai_api_key
SPRING_AI_XAI_CHAT_MODEL=grok-2-latest

# AI behavior
AI_MAX_SQL_ROWS=100
AI_MAX_TABLES_PER_QUESTION=5
AI_DEFAULT_LANGUAGE=vi
AI_ENABLE_AUDIT_LOG=true

# Security
ADMIN_JWT_SECRET=your_admin_jwt_secret
```

## Prompt rules

- Luôn trả lời bằng tiếng Việt trừ khi admin yêu cầu ngôn ngữ khác.
- Nếu có số liệu, phải nêu con số rõ ràng.
- Nếu không đủ dữ liệu, phải nói rõ bảng nào chưa được truy cập hoặc thiếu quyền.
- Không bịa số liệu, không suy đoán khi chưa có dữ liệu.
- Ưu tiên format ngắn gọn: tổng quan → số liệu chính → cảnh báo → gợi ý hành động.

## Những loại câu hỏi phù hợp

- Tổng số sản phẩm, danh mục, đơn hàng, người dùng.
- Sản phẩm sắp hết hàng hoặc đã hết hàng.
- Sản phẩm theo từng danh mục.
- Xu hướng tồn kho theo thời gian.
- Các bảng đang có dữ liệu bất thường.
- So sánh số lượng giữa các nhóm sản phẩm.

## Những loại câu hỏi cần chặn

- Câu hỏi yêu cầu sửa dữ liệu trong DB.
- Câu hỏi yêu cầu xoá bảng hoặc thay đổi schema.
- Câu hỏi đòi hỏi truy cập mật khẩu, token, dữ liệu thanh toán.
- Câu hỏi ngoài phạm vi whitelist bảng.

## Kết quả mong đợi

- Admin hỏi bằng ngôn ngữ tự nhiên.
- Hệ thống trả về số lượng hàng, số loại, cảnh báo tồn kho và insight nhanh.
- Câu trả lời có thể được dùng để điều hành kho hàng hoặc kiểm tra sức khỏe CSDL trong RDS.
