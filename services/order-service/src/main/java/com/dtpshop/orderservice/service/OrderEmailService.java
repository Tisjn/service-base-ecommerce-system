package com.dtpshop.orderservice.service;

import com.dtpshop.orderservice.model.Order;
import com.dtpshop.orderservice.model.OrderItem;
import java.text.NumberFormat;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class OrderEmailService {

    private static final Logger logger = LoggerFactory.getLogger(OrderEmailService.class);
    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final String from;
    private final String subjectPrefix;

    public OrderEmailService(
            ObjectProvider<JavaMailSender> mailSenderProvider,
            @Value("${notification.email.from:noreply@dtpshop.local}") String from,
            @Value("${notification.email.subject-prefix:[DTPShop]}") String subjectPrefix) {
        this.mailSenderProvider = mailSenderProvider;
        this.from = from;
        this.subjectPrefix = subjectPrefix;
    }

    public void sendOrderPlacedEmail(String recipientEmail, Order order) {
        if (recipientEmail == null || recipientEmail.isBlank()) {
            logger.info("Skip order confirmation email for order {} because recipient email is empty",
                    order.getOrderCode());
            return;
        }

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            logger.info("Skip order confirmation email for order {} because JavaMailSender is not configured",
                    order.getOrderCode());
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(recipientEmail);
            message.setSubject(subjectPrefix + " Dat hang thanh cong " + order.getOrderCode());
            message.setText(buildBody(order));
            mailSender.send(message);
        } catch (Exception ex) {
            logger.warn("Failed to send order confirmation email for order {}", order.getOrderCode(), ex);
        }
    }

    private String buildBody(Order order) {
        NumberFormat currency = NumberFormat.getCurrencyInstance(new Locale("vi", "VN"));
        StringBuilder body = new StringBuilder();

        body.append("Đơn hàng của bạn đã được tạo thành công.\n\n");
        body.append("Mã đơn hàng: ").append(order.getOrderCode()).append('\n');
        body.append("Trạng thái: ").append(order.getStatus()).append('\n');
        body.append("Mã địa chỉ giao hàng: ").append(order.getAddressId()).append('\n');

        if (order.getNote() != null && !order.getNote().isBlank()) {
            body.append("Ghi chú giao hàng: ").append(order.getNote()).append('\n');
        }

        body.append('\n').append("Danh sách sản phẩm:\n");

        for (OrderItem item : order.getItems()) {
            body.append("- ")
                    .append(item.getProductName())
                    .append(" x")
                    .append(item.getQuantity())
                    .append(" - ")
                    .append(currency.format(item.getSubtotal()))
                    .append('\n');
        }

        body.append('\n');
        body.append("Tạm tính: ").append(currency.format(order.getSubtotal())).append('\n');
        body.append("Phí vận chuyển: ").append(currency.format(order.getShippingFee())).append('\n');
        body.append("Tổng thanh toán: ").append(currency.format(order.getFinalAmount())).append('\n');

        return body.toString();
    }
}