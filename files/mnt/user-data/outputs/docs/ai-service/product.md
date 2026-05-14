# AI Service — Product Description

## Tổng quan

**ai-service** là dịch vụ trợ lý dữ liệu cho admin, xây dựng bằng **Spring Boot** và **Spring AI** để kết nối với **Grok AI API**. Service này đọc dữ liệu từ **AWS RDS** và trả lời bằng ngôn ngữ tự nhiên các câu hỏi liên quan đến toàn bộ CSDL của hệ thống, đặc biệt là dữ liệu sản phẩm, danh mục, tồn kho, đơn hàng và người dùng theo phạm vi được cho phép.

Mục tiêu chính của service là giúp admin không cần tự viết SQL nhưng vẫn có thể hỏi nhanh các câu như:

- Còn bao nhiêu sản phẩm đang bán?
- Có bao nhiêu loại danh mục trong CSDL?
- Sản phẩm nào sắp hết hàng?
- Tồn kho theo từng nhóm sản phẩm là bao nhiêu?
- Bảng nào đang có dữ liệu bất thường hoặc thiếu đồng bộ?

## Vai trò trong hệ thống

| Vai trò | Trách nhiệm                                                                                                |
| ------- | ---------------------------------------------------------------------------------------------------------- |
| Admin   | Hỏi câu hỏi tự nhiên về dữ liệu trong RDS, xem tổng quan số lượng, tồn kho, danh mục, đơn hàng, người dùng |
| System  | Truy vấn dữ liệu theo phạm vi whitelist, tổng hợp kết quả và trả lời bằng Grok AI                          |
| AI      | Diễn giải câu hỏi, tạo truy vấn an toàn, gom kết quả và sinh câu trả lời ngắn gọn, dễ hiểu                 |

## Năng lực chính

### 1. Hỏi đáp dữ liệu tự nhiên

- Admin nhập câu hỏi tiếng Việt hoặc tiếng Anh.
- Hệ thống dùng Spring AI để gửi prompt đến Grok AI.
- Grok AI phân tích câu hỏi và chọn bảng / cột liên quan trong RDS.
- Service thực thi truy vấn đọc dữ liệu, sau đó AI viết lại thành câu trả lời dễ hiểu.

### 2. Tổng hợp số liệu quản trị

Service có thể trả lời các nhóm thông tin sau:

- Tổng số sản phẩm, tổng số danh mục, tổng số đơn hàng, tổng số người dùng.
- Số lượng tồn kho hiện tại theo từng sản phẩm / danh mục.
- Bao nhiêu sản phẩm còn dưới ngưỡng cảnh báo.
- Bao nhiêu sản phẩm đang hết hàng.
- Top sản phẩm có số lượng bán cao hoặc tồn kho thấp.
- Các bảng nào trong CSDL đang có bản ghi tăng nhanh bất thường.

### 3. Tra cứu nhiều bảng trong RDS

- Service có thể đọc nhiều bảng trong cùng một RDS instance.
- Kết quả được trả về theo dạng tổng hợp, không bắt buộc admin phải biết schema.
- Chỉ cho phép đọc dữ liệu, không cho phép ghi, cập nhật hoặc xóa.

### 4. Hỗ trợ quản trị sản phẩm

- Cho biết hiện còn bao nhiêu hàng trong kho.
- Cho biết có bao nhiêu loại sản phẩm / danh mục.
- Tóm tắt trạng thái sản phẩm theo từng nhóm.
- Cảnh báo dữ liệu có khả năng thiếu hoặc sai lệch.

## Ví dụ câu hỏi của admin

- "Hiện tại còn bao nhiêu sản phẩm đang active trong CSDL?"
- "Có bao nhiêu danh mục sản phẩm?"
- "Danh sách sản phẩm nào đang dưới 10 tồn kho?"
- "Tổng số đơn hàng hôm nay là bao nhiêu?"
- "Trong RDS có bảng nào đang có dữ liệu tăng nhanh bất thường không?"
- "Tóm tắt cho tôi tình trạng kho hàng và các sản phẩm cần nhập thêm."

## Mẫu phản hồi mong muốn

Ví dụ:

> Hiện tại hệ thống có 128 sản phẩm đang active, 12 danh mục, 34 sản phẩm còn dưới ngưỡng cảnh báo và 5 sản phẩm đã hết hàng. Danh mục có tồn kho thấp nhất là Electronics và Fashion.

## Nguyên tắc an toàn dữ liệu

- Chỉ đọc dữ liệu từ các bảng được whitelist.
- Tự động giới hạn số dòng trả về khi truy vấn chi tiết.
- Từ chối mọi câu hỏi yêu cầu `INSERT`, `UPDATE`, `DELETE` hoặc thao tác thay đổi schema.
- Ẩn các trường nhạy cảm như mật khẩu, token, thông tin thanh toán.
- Ghi log đầy đủ câu hỏi, bảng truy cập và thời gian xử lý để audit.

## Luồng nghiệp vụ

1. Admin gửi câu hỏi đến `ai-service`.
2. Controller chuyển yêu cầu vào service AI.
3. Spring AI gửi prompt tới Grok AI.
4. Grok AI xác định các bảng / cột liên quan trong RDS.
5. Service chạy truy vấn đọc dữ liệu.
6. Kết quả được gom lại, chuẩn hóa và gửi lại Grok AI để sinh câu trả lời.
7. Admin nhận được phản hồi ngắn gọn, có số liệu rõ ràng.

## Ghi chú

- Service này không thay thế dashboard truyền thống, mà đóng vai trò trợ lý truy vấn nhanh.
- Nếu schema thay đổi, chỉ cần cập nhật whitelist bảng / cột mà không phải thay đổi cách hỏi của admin.
- Có thể mở rộng thêm tính năng xuất báo cáo, cảnh báo tồn kho và phân tích xu hướng theo thời gian.
