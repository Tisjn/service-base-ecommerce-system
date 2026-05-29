# AI Agent Design cho `ai-service`

Tài liệu này mô tả thiết kế Agent cho trang Admin DTPShop. Agent không tự sinh HTTP request tùy ý; nó chỉ tạo `action plan` có cấu trúc, sau đó backend kiểm tra policy và gọi các tool đã allowlist.

## Mục tiêu

`ai-service` đang có trợ lý hỏi đáp dựa trên context thương mại điện tử. Phần Agent mở rộng thêm khả năng:

- Lập kế hoạch thao tác admin từ câu lệnh tự nhiên.
- Hiển thị plan cho admin kiểm tra trước khi chạy.
- Chỉ thực thi khi admin xác nhận.
- Ghi audit log cho plan và kết quả thực thi.

Ví dụ lệnh:

- `Ẩn sản phẩm #12`
- `Đổi trạng thái đơn #45 sang DELIVERED`
- `Tạo sản phẩm mới tên A, giá B, danh mục C`

## Nguyên tắc an toàn

1. Admin nhập yêu cầu tự nhiên.
2. AI planner sinh JSON plan, không gọi API trực tiếp.
3. Backend validate tool, args, role và risk.
4. UI hiển thị preview plan.
5. Admin bấm xác nhận.
6. Executor mới gọi API CRUD qua gateway.

Các thao tác rủi ro như xóa, hủy đơn, đổi trạng thái đơn luôn phải có bước xác nhận.

## Tool allowlist

Agent chỉ được dùng các tool sau:

- `createProduct`
- `updateProduct`
- `deleteProduct`
- `restoreProduct`
- `permanentDeleteProduct`
- `createCategory`
- `updateCategory`
- `deleteCategory`
- `updateOrderStatus`
- `cancelOrder`

Model không được tự chọn URL, method hoặc payload ngoài schema của các tool này.

## API đã triển khai

### `POST /api/ai/plan` hoặc `/api/admin/ai/plan`

Tạo action plan từ câu lệnh admin.

```json
{
  "input": "Ẩn sản phẩm #12",
  "dryRun": true
}
```

Response:

```json
{
  "planId": "apl_abc123",
  "needsConfirmation": true,
  "riskLevel": "high",
  "status": "planned",
  "summary": ["Ẩn sản phẩm #12"],
  "actions": [
    {
      "tool": "deleteProduct",
      "args": { "productId": 12 },
      "description": "Ẩn sản phẩm #12",
      "riskLevel": "high"
    }
  ],
  "warnings": [],
  "expiresAt": "2026-05-29T14:30:00Z"
}
```

### `POST /api/ai/confirm` hoặc `/api/admin/ai/confirm`

Thực thi plan đã được xác nhận.

```json
{
  "planId": "apl_abc123",
  "confirm": true
}
```

### `GET /api/ai/history` hoặc `/api/admin/ai/history`

Trả về audit log gần nhất, gồm input gốc, plan, trạng thái và kết quả tool.

## Các lớp chính

- `AgentPlanService`: tạo plan bằng Gemini, parse JSON và có fallback rule-based cho demo khi chưa cấu hình API key.
- `AgentToolRegistry`: chứa allowlist, validate payload và gọi API thật qua gateway.
- `AgentPolicyService`: kiểm tra quyền admin, risk và confirm.
- `AgentAuditService`: lưu audit log in-memory cho demo.
- `AiAgentProperties`: cấu hình gateway base URL và TTL của plan.

## Cấu hình

```yaml
ai:
  agent:
    gateway-base-url: ${AI_AGENT_GATEWAY_BASE_URL:http://localhost:8081/api}
    plan-ttl-minutes: ${AI_AGENT_PLAN_TTL_MINUTES:10}
```

## Frontend Admin

Widget AI admin có 3 tab:

- `Agent`: nhập lệnh, tạo plan, xem tool/args/risk, xác nhận chạy.
- `Chat`: giữ luồng hỏi đáp AI hiện có.
- `Audit`: xem lịch sử plan và kết quả thực thi.

UI không cho confirm nếu plan có warning, thiếu action, hoặc đã bị backend từ chối.

## Phạm vi hiện tại

Thiết kế hiện tại phù hợp demo và phát triển bước đầu:

- Plan/audit đang lưu in-memory, nên sẽ mất khi restart service.
- Execution reuse API hiện có qua gateway.
- Gemini planner trả JSON có cấu trúc; fallback chỉ hỗ trợ một số lệnh phổ biến.

Khi đưa lên production nên chuyển plan/audit sang database, thêm idempotency key, thêm kiểm thử tích hợp với product/order service và khóa quyền chi tiết theo từng tool.
