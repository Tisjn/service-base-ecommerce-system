package com.dtpshop.paymentservice.service;

import com.dtpshop.paymentservice.dto.CreatePaymentRequest;
import com.dtpshop.paymentservice.dto.MomoCreateResponse;
import com.dtpshop.paymentservice.dto.PaymentResponse;
import com.dtpshop.paymentservice.exception.ApiException;
import com.dtpshop.paymentservice.model.Payment;
import com.dtpshop.paymentservice.model.PaymentMethod;
import com.dtpshop.paymentservice.model.PaymentStatus;
import com.dtpshop.paymentservice.repository.PaymentRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final MomoClient momoClient;

    public PaymentService(PaymentRepository paymentRepository, MomoClient momoClient) {
        this.paymentRepository = paymentRepository;
        this.momoClient = momoClient;
    }

    @Transactional
    public PaymentResponse create(CreatePaymentRequest request) {
        PaymentMethod method = parseMethod(request.paymentMethod());
        Payment payment = new Payment();
        payment.setOrderId(request.orderId());
        payment.setPaymentMethod(method.name());
        payment.setAmount(request.amount());
        payment.setTransactionCode(buildTransactionCode(method, request.orderId()));
        payment.setExpiredAt(Instant.now().plus(15, ChronoUnit.MINUTES));

        if (method == PaymentMethod.COD) {
            payment.setProvider("INTERNAL");
            payment.setStatus(PaymentStatus.PENDING.name());
            return PaymentResponse.from(paymentRepository.save(payment));
        }

        payment.setProvider("MOMO");
        payment.setStatus(PaymentStatus.PENDING.name());
        payment = paymentRepository.save(payment);

        MomoCreateResponse momoResponse = momoClient.createPayment(payment, request);
        if (momoResponse == null) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "MoMo khong tra ve du lieu thanh toan");
        }

        payment.setGatewayTransactionId(momoResponse.transId());
        payment.setPaymentUrl(firstNonBlank(momoResponse.payUrl(), momoResponse.deeplink(), momoResponse.qrCodeUrl()));
        if (momoResponse.resultCode() != null && momoResponse.resultCode() != 0) {
            payment.setStatus(PaymentStatus.FAILED.name());
        }

        return PaymentResponse.from(payment);
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> findAll(Long orderId) {
        List<Payment> payments = orderId == null
                ? paymentRepository.findAll()
                : paymentRepository.findByOrderIdOrderByCreatedAtDesc(orderId);
        return payments.stream().map(PaymentResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public PaymentResponse findById(Long id) {
        return paymentRepository.findById(id)
                .map(PaymentResponse::from)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Payment khong ton tai"));
    }

    @Transactional
    public PaymentResponse markCodPaid(Long id) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Payment khong ton tai"));
        if (!PaymentMethod.COD.name().equals(payment.getPaymentMethod())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Chi COD moi duoc xac nhan thu tien thu cong");
        }
        payment.setStatus(PaymentStatus.PAID.name());
        payment.setPaidAt(Instant.now());
        return PaymentResponse.from(payment);
    }

    @Transactional
    public PaymentResponse handleMomoWebhook(Map<String, Object> payload) {
        if (!momoClient.verifyWebhook(payload)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Chu ky webhook MoMo khong hop le");
        }

        return updateMomoPayment(payload);
    }

    @Transactional
    public PaymentResponse handleMomoReturn(Map<String, String> params) {
        if (!momoClient.verifyReturn(params)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Chu ky redirect MoMo khong hop le");
        }

        return updateMomoPayment(params);
    }

    private PaymentResponse updateMomoPayment(Map<String, ?> payload) {
        String orderId = stringValue(payload.get("orderId"));
        Payment payment = paymentRepository.findByTransactionCode(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Payment khong ton tai"));

        payment.setGatewayTransactionId(stringValue(payload.get("transId")));
        if ("0".equals(stringValue(payload.get("resultCode")))) {
            payment.setStatus(PaymentStatus.PAID.name());
            payment.setPaidAt(Instant.now());
        } else {
            payment.setStatus(PaymentStatus.FAILED.name());
        }

        return PaymentResponse.from(payment);
    }

    private PaymentMethod parseMethod(String method) {
        try {
            return PaymentMethod.valueOf(method.trim().toUpperCase(Locale.ROOT));
        } catch (RuntimeException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "paymentMethod chi ho tro MOMO hoac COD");
        }
    }

    private String buildTransactionCode(PaymentMethod method, Long orderId) {
        return method.name() + "-" + orderId + "-" + Instant.now().toEpochMilli();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private String stringValue(Object value) {
        return value == null ? "" : value.toString();
    }
}
