# DTPShop

He thong thuong mai dien tu theo kien truc service-based, gom cac service chinh:

- auth-service: dang ky, dang nhap, dang xuat, JWT, OTP
- user-service: quan ly ho so nguoi dung
- product-service: quan ly san pham/dich vu
- order-service: gio hang theo Session, tao don, dieu phoi thanh toan/thong bao
- payment-service: xu ly thanh toan mock, webhook, refund

## Bien moi truong dung chung cho AWS RDS MySQL

Su dung mot bo bien duy nhat cho tat ca service ket noi CSDL cloud:

```env
RDS_HOST=your-rds-endpoint.ap-southeast-1.rds.amazonaws.com
RDS_PORT=3306
RDS_USER=admin
RDS_PASSWORD=your_rds_password
RDS_SSL=true
```

Moi service chi doi ten schema:

- auth-service: authdb
- user-service: userdb
- product-service: productdb
- order-service: orderdb
- payment-service: paymentdb

## Quy tac vai tro

### Guest

- Xem danh sach san pham/dich vu (lay tu CSDL)
- Xem chi tiet san pham/dich vu
- Them san pham/dich vu vao gio hang
- Xem gio hang (du lieu luu trong Session)
- Cap nhat so luong (0 -> xoa khoi gio)

### Customer

- Thuc hien toan bo chuc nang cua Guest
- Dang nhap/dang xuat qua auth-service
- Bat buoc dang nhap hoac dang ky truoc khi dat hang
- Thanh toan don hang (mock)
- Luu don hang vao CSDL (orders, order_items)
- Gui email va thong bao dat hang thanh cong
- Sau khi dat hang thanh cong thi xoa Session gio hang

### Admin

- Quan ly san pham: xem danh sach, xem chi tiet, tao moi, cap nhat, an/xoa san pham (xoa chi khi chua phat sinh don hang)
- Quan ly tai khoan: xem danh sach, xem chi tiet, cap nhat thong tin, khoa/mo khoa va xoa tai khoan (chi khi chua tung dat hang)
- Quan ly don hang: xem tat ca don hang, xem chi tiet va cap nhat trang thai

## Luu y checkout

- Guest khong duoc dat hang truc tiep
- Endpoint dat hang chi danh cho Customer
- Sau khi checkout thanh cong, gio hang Session duoc clear
