# Payment Service — Product Description

## Tổng quan

**payment-service** xử lý giao dịch thanh toán và đóng vai trò adapter giữa hệ thống nội bộ với cổng thanh toán bên ngoài.

## Vai trò trong hệ thống

| Vai trò                  | Trách nhiệm                                  |
| ------------------------ | -------------------------------------------- |
| order-service            | Tạo giao dịch và kiểm tra trạng thái         |
| Customer                 | Xem lịch sử thanh toán                       |
| Admin                    | Xem giao dịch, thống kê doanh thu, hoàn tiền |
| Payment Gateway external | Gửi webhook callback                         |

## Chức năng chính

- Tạo giao dịch thanh toán với trạng thái `PENDING`
- Nhận webhook từ gateway và cập nhật trạng thái giao dịch
- Kiểm tra trạng thái thanh toán theo transaction ID
- Hoàn tiền cho giao dịch hợp lệ

## API quan trọng

| Method | Path                   | Vai trò        | Mô tả                  |
| ------ | ---------------------- | -------------- | ---------------------- |
| POST   | `/payments`            | Internal       | Tạo giao dịch          |
| GET    | `/payments/:id`        | Customer/Admin | Xem chi tiết giao dịch |
| GET    | `/payments`            | Admin          | Danh sách giao dịch    |
| POST   | `/payments/webhook`    | External       | Nhận callback          |
| POST   | `/payments/:id/refund` | Admin          | Hoàn tiền              |

## Trạng thái giao dịch

```text
PENDING → COMPLETED
        → FAILED
        → REFUNDED
```

## Phương thức thanh toán

| Method          | Mô tả                      |
| --------------- | -------------------------- |
| `cod`           | Cash on Delivery           |
| `mock_card`     | Giả lập thanh toán để demo |
| `bank_transfer` | Chuyển khoản ngân hàng     |

## Tiêu chí chấm điểm đáp ứng

| Tiêu chí            | Mô tả                                               |
| ------------------- | --------------------------------------------------- |
| Project Description | Kết nối từ order-service, có external gateway       |
| Retry               | order-service retry khi payment-service unavailable |
| Deploy              | Webhook endpoint test được online                   |
| UI                  | Trang checkout hiển thị phương thức thanh toán      |
