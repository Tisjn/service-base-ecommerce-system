package com.dtpshop.paymentservice.service;

import com.dtpshop.paymentservice.config.MomoProperties;
import com.dtpshop.paymentservice.dto.CreatePaymentRequest;
import com.dtpshop.paymentservice.dto.MomoCreateResponse;
import com.dtpshop.paymentservice.exception.ApiException;
import com.dtpshop.paymentservice.model.Payment;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Service
public class MomoClient {

    private final MomoProperties properties;
    private final RestTemplate restTemplate;

    public MomoClient(MomoProperties properties, RestTemplate restTemplate) {
        this.properties = properties;
        this.restTemplate = restTemplate;
    }

    public MomoCreateResponse createPayment(Payment payment, CreatePaymentRequest request) {
        requireMomoConfig();

        String amount = payment.getAmount().setScale(0, RoundingMode.HALF_UP).toPlainString();
        String orderInfo = valueOrDefault(request.orderInfo(), "Thanh toan don hang #" + payment.getOrderId());
        String redirectUrl = valueOrDefault(request.redirectUrl(), properties.getRedirectUrl());
        String ipnUrl = valueOrDefault(request.ipnUrl(), properties.getIpnUrl());
        String extraData = "";
        String orderGroupId = "";

        Map<String, String> signatureParts = new LinkedHashMap<>();
        signatureParts.put("accessKey", properties.getAccessKey());
        signatureParts.put("amount", amount);
        signatureParts.put("extraData", extraData);
        signatureParts.put("ipnUrl", ipnUrl);
        signatureParts.put("orderId", payment.getTransactionCode());
        signatureParts.put("orderInfo", orderInfo);
        signatureParts.put("partnerCode", properties.getPartnerCode());
        signatureParts.put("redirectUrl", redirectUrl);
        signatureParts.put("requestId", payment.getTransactionCode());
        signatureParts.put("requestType", properties.getRequestType());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("partnerCode", properties.getPartnerCode());
        body.put("partnerName", properties.getPartnerName());
        body.put("storeId", properties.getStoreId());
        body.put("requestId", payment.getTransactionCode());
        body.put("amount", amount);
        body.put("orderId", payment.getTransactionCode());
        body.put("orderInfo", orderInfo);
        body.put("redirectUrl", redirectUrl);
        body.put("ipnUrl", ipnUrl);
        body.put("lang", properties.getLang());
        body.put("requestType", properties.getRequestType());
        body.put("autoCapture", true);
        body.put("extraData", extraData);
        body.put("orderGroupId", orderGroupId);
        body.put("signature", sign(toRawSignature(signatureParts)));

        try {
            return restTemplate.postForObject(properties.getEndpoint(), body, MomoCreateResponse.class);
        } catch (RestClientException exception) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Khong ket noi duoc MoMo gateway");
        }
    }

    public boolean verifyWebhook(Map<String, Object> payload) {
        return verifyCallback(payload);
    }

    public boolean verifyReturn(Map<String, String> params) {
        return verifyCallback(new LinkedHashMap<>(params));
    }

    private boolean verifyCallback(Map<String, ?> payload) {
        Object signature = payload.get("signature");
        if (signature == null || signature.toString().isBlank()) {
            return false;
        }

        Map<String, String> signatureParts = new LinkedHashMap<>();
        signatureParts.put("accessKey", properties.getAccessKey());
        signatureParts.put("amount", stringValue(payload.get("amount")));
        signatureParts.put("extraData", stringValue(payload.get("extraData")));
        signatureParts.put("message", stringValue(payload.get("message")));
        signatureParts.put("orderId", stringValue(payload.get("orderId")));
        signatureParts.put("orderInfo", stringValue(payload.get("orderInfo")));
        signatureParts.put("orderType", stringValue(payload.get("orderType")));
        signatureParts.put("partnerCode", stringValue(payload.get("partnerCode")));
        signatureParts.put("payType", stringValue(payload.get("payType")));
        signatureParts.put("requestId", stringValue(payload.get("requestId")));
        signatureParts.put("responseTime", stringValue(payload.get("responseTime")));
        signatureParts.put("resultCode", stringValue(payload.get("resultCode")));
        signatureParts.put("transId", stringValue(payload.get("transId")));

        String expected = sign(toRawSignature(signatureParts));
        return expected.equalsIgnoreCase(signature.toString());
    }

    private void requireMomoConfig() {
        if (isBlank(properties.getAccessKey()) || isBlank(properties.getSecretKey())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Chua cau hinh MOMO_ACCESS_KEY va MOMO_SECRET_KEY");
        }
    }

    private String sign(String rawSignature) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(
                    properties.getSecretKey().getBytes(StandardCharsets.UTF_8),
                    "HmacSHA256"
            );
            mac.init(secretKeySpec);
            byte[] bytes = mac.doFinal(rawSignature.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder(bytes.length * 2);
            for (byte item : bytes) {
                result.append(String.format("%02x", item));
            }
            return result.toString();
        } catch (NoSuchAlgorithmException | InvalidKeyException exception) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Khong tao duoc chu ky MoMo");
        }
    }

    private String toRawSignature(Map<String, String> parts) {
        return parts.entrySet()
                .stream()
                .map(entry -> entry.getKey() + "=" + entry.getValue())
                .collect(Collectors.joining("&"));
    }

    private String valueOrDefault(String value, String fallback) {
        return isBlank(value) ? fallback : value.trim();
    }

    private String stringValue(Object value) {
        return value == null ? "" : value.toString();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
