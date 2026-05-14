# AI Service

`ai-service` là service trợ lý dữ liệu cho admin, được xây dựng bằng **Spring Boot** + **Spring AI** để kết nối với **Grok AI API** và đọc dữ liệu từ **AWS RDS**. Mục tiêu của service là cho phép admin hỏi bằng ngôn ngữ tự nhiên và nhận lại câu trả lời ngắn gọn, có số liệu rõ ràng về sản phẩm, danh mục, tồn kho, đơn hàng và các bảng liên quan trong CSDL.

## Mục đích

- Trả lời nhanh các câu hỏi như còn bao nhiêu hàng, có bao nhiêu loại, sản phẩm nào sắp hết.
- Tổng hợp dữ liệu từ nhiều bảng trong RDS để tạo insight cho admin.
- Chỉ cho phép truy vấn đọc dữ liệu, không cho phép ghi, xóa hoặc thay đổi schema.
- Dùng Grok AI để diễn giải kết quả DB thành câu trả lời tự nhiên, dễ hiểu.

## Cách hoạt động

1. Admin gửi câu hỏi đến REST API của `ai-service`.
2. Spring AI chuyển prompt và ngữ cảnh schema đến Grok AI.
3. Grok AI xác định bảng/cột cần truy vấn.
4. Service chạy truy vấn read-only trên RDS.
5. Kết quả được tổng hợp và trả lại bằng câu trả lời tự nhiên.

## API chính

- `POST /api/admin/ai/ask` - Hỏi bất kỳ câu hỏi nào về dữ liệu trong RDS.
- `GET /api/admin/ai/summary` - Xem tóm tắt nhanh về số hàng, số loại, tồn kho và cảnh báo.
- `GET /api/admin/ai/schema` - Xem metadata của các bảng được whitelist.
- `GET /api/admin/ai/table/{tableName}` - Xem thống kê của một bảng cụ thể.
- `POST /api/admin/ai/insights` - Sinh báo cáo AI theo phạm vi đã chọn.

## Công nghệ

- Spring Boot 3.x
- Java 21
- Spring AI
- xAI Grok API
- Spring Web
- Spring Data JPA hoặc JdbcTemplate
- AWS RDS MySQL
- Spring Security cho endpoint admin

## Tài liệu chi tiết

- [Product Description](./product.md)
- [Project Structure](./structure.md)
- [Technology & Design](./tech.md)

## Lưu ý vận hành

- Chỉ whitelist các bảng an toàn để truy vấn.
- Luôn loại bỏ dữ liệu nhạy cảm trước khi đưa vào prompt cho AI.
- Ưu tiên truy vấn tổng hợp như `COUNT`, `SUM`, `GROUP BY` để trả lời nhanh.
- Nếu schema thay đổi, chỉ cần cập nhật whitelist và prompt mà không cần đổi cách hỏi của admin.