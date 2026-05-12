# Payment Service (Spring Boot)

## Tổng quan

**payment-service** xử lý giao dịch thanh toán, webhook callback và refund. Service này đóng vai trò adapter giữa hệ thống nội bộ và cổng thanh toán bên ngoài.

## Vai trò trong hệ thống

| Vai trò                  | Trách nhiệm                                     |
| ------------------------ | ----------------------------------------------- |
| order-service            | Tạo giao dịch thanh toán và kiểm tra trạng thái |
| Customer                 | Xem lịch sử thanh toán                          |
| Admin                    | Xem giao dịch, thống kê và hoàn tiền            |
| Payment Gateway external | Gửi webhook callback                            |

## Công nghệ

- Spring Boot 3.x
- Java 21
- Spring Web, Spring Data JPA, Spring Validation, Spring Retry
- MySQL

## Biến môi trường

```env
PORT=3005
RDS_HOST=your-rds-endpoint.ap-southeast-1.rds.amazonaws.com
RDS_PORT=3306
RDS_USER=admin
RDS_PASSWORD=your_rds_password
RDS_SSL=true

SPRING_DATASOURCE_URL=jdbc:mysql://${RDS_HOST}:${RDS_PORT}/paymentdb?useSSL=${RDS_SSL}&requireSSL=${RDS_SSL}
SPRING_DATASOURCE_USERNAME=${RDS_USER}
SPRING_DATASOURCE_PASSWORD=${RDS_PASSWORD}
PAYMENT_GATEWAY_URL=https://mock-gateway.internal
WEBHOOK_SECRET=webhook_hmac_secret
ORDER_SERVICE_URL=http://order-service:3004
```

## Chạy ứng dụng

```bash
mvn spring-boot:run
```

Hoặc chạy Docker:

```bash
docker build -t payment-service .
docker run --rm -p 3005:3005 payment-service
```

## API chính

- `POST /payments`
- `GET /payments`
- `GET /payments/:id`
- `POST /payments/webhook`
- `POST /payments/:id/refund`

## Ghi chú

- Webhook nên được verify bằng HMAC signature.
- Có thể dùng mock gateway để test luồng thanh toán trong môi trường học tập.
