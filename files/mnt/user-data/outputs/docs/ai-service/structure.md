# AI Service — Project Structure

## Cấu trúc thư mục

```text
src/
├── main/
│   ├── java/com/ecommerce/ai/
│   │   ├── AiServiceApplication.java      # Entry point của Spring Boot
│   │   ├── config/
│   │   │   ├── AiConfig.java             # Cấu hình Spring AI / Grok client
│   │   │   ├── DbConfig.java             # DataSource, JdbcTemplate, transaction
│   │   │   ├── PromptConfig.java         # Template prompt cho admin Q&A
│   │   │   └── SecurityConfig.java       # Bảo vệ endpoint admin
│   │   │
│   │   ├── controller/
│   │   │   └── AdminAiController.java    # REST API cho admin
│   │   │
│   │   ├── service/
│   │   │   ├── AdminAiService.java       # Xử lý câu hỏi, điều phối AI
│   │   │   ├── RdsQueryService.java      # Chạy truy vấn đọc dữ liệu từ RDS
│   │   │   ├── SchemaService.java        # Lấy metadata bảng / cột trong DB
│   │   │   └── InsightService.java       # Tổng hợp số liệu, cảnh báo, phân tích
│   │   │
│   │   ├── ai/
│   │   │   ├── GrokClient.java           # Wrapper gọi Grok AI API
│   │   │   ├── QueryPlanner.java         # Lập kế hoạch bảng/cột cần đọc
│   │   │   ├── ResponseComposer.java     # Ghép kết quả DB vào câu trả lời cuối
│   │   │   └── GuardrailService.java     # Chặn query ghi / xóa / schema change
│   │   │
│   │   ├── repository/
│   │   │   ├── ProductRepository.java    # Đọc dữ liệu sản phẩm
│   │   │   ├── CategoryRepository.java   # Đọc dữ liệu danh mục
│   │   │   ├── InventoryRepository.java  # Đọc dữ liệu tồn kho
│   │   │   ├── OrderRepository.java      # Đọc dữ liệu đơn hàng
│   │   │   └── MetadataRepository.java   # Đọc metadata từ information_schema
│   │   │
│   │   ├── dto/
│   │   │   ├── QuestionRequest.java      # { question, scope, language }
│   │   │   ├── AnswerResponse.java       # { answer, metrics, tablesUsed }
│   │   │   ├── TableMetricDto.java       # Số lượng, tồn kho, cảnh báo
│   │   │   └── SchemaDto.java            # Tên bảng, cột, kiểu dữ liệu
│   │   │
│   │   ├── entity/
│   │   │   ├── Product.java
│   │   │   ├── Category.java
│   │   │   ├── Inventory.java
│   │   │   └── OrderSummary.java
│   │   │
│   │   ├── exception/
│   │   │   ├── ApiExceptionHandler.java
│   │   │   ├── InvalidQuestionException.java
│   │   │   └── UnsafeQueryException.java
│   │   │
│   │   └── util/
│   │       ├── SqlSanitizer.java         # Lọc câu lệnh không an toàn
│   │       ├── TableWhitelist.java       # Danh sách bảng được phép truy cập
│   │       └── MetricFormatter.java      # Format số liệu để trả lời ngắn gọn
│   │
│   └── resources/
│       ├── application.yml
│       └── prompts/
│           ├── admin-summary-prompt.txt
│           ├── sql-planner-prompt.txt
│           └── safety-rules-prompt.txt
└── test/
    └── java/com/ecommerce/ai/
        ├── service/
        ├── ai/
        └── controller/
```

## API Endpoints

| Method | Path                              | Auth      | Mô tả                                                     |
| ------ | --------------------------------- | --------- | --------------------------------------------------------- |
| POST   | `/api/admin/ai/ask`               | Admin JWT | Hỏi bất kỳ câu hỏi nào về dữ liệu trong RDS               |
| GET    | `/api/admin/ai/summary`           | Admin JWT | Trả về tóm tắt nhanh: số hàng, số loại, tồn kho, cảnh báo |
| GET    | `/api/admin/ai/schema`            | Admin JWT | Xem metadata các bảng được whitelist                      |
| GET    | `/api/admin/ai/table/{tableName}` | Admin JWT | Xem thống kê của một bảng cụ thể                          |
| POST   | `/api/admin/ai/insights`          | Admin JWT | Sinh báo cáo AI theo phạm vi đã chọn                      |

## Luồng xử lý chính

```text
Admin Request
    │
    ▼
AdminAiController
    │
    ▼
AdminAiService
    ├── GuardrailService            → chặn query nguy hiểm
    ├── QueryPlanner                → xác định bảng/cột cần truy vấn
    ├── RdsQueryService             → đọc dữ liệu từ AWS RDS
    ├── InsightService              → gom số liệu, tính tổng hợp
    └── GrokClient                  → sinh câu trả lời cuối cùng
    │
    ▼
AnswerResponse
```

## Phạm vi truy vấn dữ liệu

- Chỉ đọc các bảng được cấu hình trong `TableWhitelist`.
- Chỉ dùng `SELECT`, `SHOW`, hoặc metadata query dạng an toàn.
- Không cho phép truy vấn thay đổi dữ liệu hoặc thay đổi cấu trúc bảng.
- Mỗi câu hỏi có thể map sang nhiều bảng nếu cần tổng hợp chéo.

## Gợi ý nhóm bảng phổ biến

- `products`
- `categories`
- `inventory`
- `product_images`
- `orders`
- `order_items`
- `users`

## Ghi chú kỹ thuật

- Nếu cần mở rộng thêm bảng mới, chỉ việc thêm vào whitelist và bổ sung prompt.
- Có thể cache metadata schema để giảm số lần gọi DB.
- Có thể tách riêng phần thống kê nhanh và phần trả lời tự nhiên để giảm độ trễ.
