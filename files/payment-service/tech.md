# Payment Service — Tech Stack

**Port:** 3005 | **Language:** Java 21 | **Framework:** Spring Boot 3.x

## Ngôn ngữ & Runtime

**Java 21 + Spring Boot 3.x** — Lý do chọn:

- Spring Web + Spring Data JPA cho REST + ORM
- Apache HttpClient cho MoMo API calls
- Built-in transaction support cho payment atomicity
- HMAC-SHA256 signing cho webhook verification

## Framework & Thư viện

| Thư viện              | Mục đích                   |
| --------------------- | -------------------------- |
| **Spring Web**        | REST endpoints             |
| **Spring Data JPA**   | Payment entity persistence |
| **Spring Security**   | JWT filter                 |
| **Apache HttpClient** | HTTP calls to MoMo API     |
| **MySQL Connector**   | Database driver            |
| **Lombok**            | Code generation            |
| **Jackson**           | JSON serialization         |
| **commons-codec**     | HMAC-SHA256 hashing        |

## Cấu hình Database

```yaml
spring:
  datasource:
    url: jdbc:mysql://${RDS_HOST}:${RDS_PORT}/paymentdb
    username: ${RDS_USER}
    password: ${RDS_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQL8Dialect
```

## HMAC-SHA256 Signature Verification

```java
@Component
public class HmacSignatureUtil {

    @Value("${momo.secret-key}")
    private String secretKey;

    /**
     * Verify HMAC-SHA256 signature from MoMo webhook
     */
    public boolean verifySignature(String data, String providedSignature) {
        try {
            String computedSignature = computeHmacSha256(data, secretKey);
            return MessageDigest.isEqual(
                providedSignature.getBytes(),
                computedSignature.getBytes()
            );
        } catch (Exception e) {
            log.error("Signature verification failed", e);
            return false;
        }
    }

    private String computeHmacSha256(String data, String key)
            throws Exception {

        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKeySpec = new SecretKeySpec(
            key.getBytes(StandardCharsets.UTF_8),
            "HmacSHA256"
        );
        mac.init(secretKeySpec);

        byte[] hmacBytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        return Hex.encodeHexString(hmacBytes);
    }
}
```

## MoMo Payment Gateway Integration

```java
@Service
public class MoMoService {

    @Value("${momo.endpoint}")
    private String momoEndpoint;

    @Value("${momo.partner-code}")
    private String partnerCode;

    @Value("${momo.access-key}")
    private String accessKey;

    @Value("${momo.secret-key}")
    private String secretKey;

    @Value("${momo.redirect-url}")
    private String redirectUrl;

    @Autowired
    private HttpClient httpClient;

    public MoMoPaymentResponse createPaymentLink(MoMoPaymentRequest request)
            throws IOException {

        // Build request body
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("partnerCode", partnerCode);
        body.put("orderId", request.getOrderId());
        body.put("amount", request.getAmount());
        body.put("orderInfo", request.getOrderInfo());
        body.put("redirectUrl", redirectUrl);
        body.put("ipnUrl", redirectUrl + "/webhook/momo");
        body.put("requestId", UUID.randomUUID().toString());
        body.put("requestType", "captureWallet");

        // Compute signature
        String rawSignature = "accessKey=" + accessKey +
                             "&amount=" + request.getAmount() +
                             "&orderId=" + request.getOrderId() +
                             // ... more fields
                             "&secretKey=" + secretKey;

        String signature = computeHmacSha256(rawSignature);
        body.put("signature", signature);

        // Send to MoMo
        HttpPost post = new HttpPost(momoEndpoint);
        post.setHeader("Content-Type", "application/json");
        post.setEntity(new StringEntity(toJson(body)));

        HttpResponse response = httpClient.execute(post);

        // Parse response
        String responseBody = EntityUtils.toString(response.getEntity());
        return parseJson(responseBody, MoMoPaymentResponse.class);
    }
}
```

## Payment Entity

```java
@Entity
@Table(name = "payments")
@Data
@NoArgsConstructor
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "payment_method", nullable = false)
    @Enumerated(EnumType.STRING)
    private PaymentMethod paymentMethod; // MOMO, COD

    @Column(name = "amount", nullable = false)
    private BigDecimal amount;

    @Column(name = "status", nullable = false)
    @Enumerated(EnumType.STRING)
    private PaymentStatus status; // PENDING, PAID, FAILED

    @Column(name = "transaction_code")
    private String transactionCode; // MoMo transId

    @Column(name = "gateway_transaction_id")
    private String gatewayTransactionId;

    @Column(name = "payment_url")
    private String paymentUrl; // MoMo link

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "created_at", updatable = false)
    @CreationTimestamp
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    @UpdateTimestamp
    private LocalDateTime updatedAt;
}

public enum PaymentMethod {
    MOMO, COD
}

public enum PaymentStatus {
    PENDING, PAID, FAILED
}
```

## PaymentService

```java
@Service
@Transactional
public class PaymentService {

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private MoMoService momoService;

    public Payment createPayment(CreatePaymentRequest request)
            throws Exception {

        Payment payment = new Payment();
        payment.setOrderId(request.getOrderId());
        payment.setPaymentMethod(request.getPaymentMethod());
        payment.setAmount(request.getAmount());
        payment.setStatus(PaymentStatus.PENDING);

        if (PaymentMethod.MOMO.equals(request.getPaymentMethod())) {
            // Generate MoMo link
            MoMoPaymentResponse momoResponse =
                momoService.createPaymentLink(request);

            payment.setPaymentUrl(momoResponse.getPayUrl());
            payment.setGatewayTransactionId(momoResponse.getRequestId());
        }

        return paymentRepository.save(payment);
    }

    public void handleMoMoCallback(MoMoWebhookRequest webhook) {
        // Verify signature
        if (!verifySignature(webhook)) {
            throw new WebhookVerificationException("Invalid signature");
        }

        Payment payment = paymentRepository.findByGatewayTransactionId(
            webhook.getRequestId()
        ).orElseThrow();

        if (webhook.getResultCode() == 0) {
            // Success
            payment.setStatus(PaymentStatus.PAID);
            payment.setTransactionCode(webhook.getTransId());
            payment.setPaidAt(LocalDateTime.now());
        } else {
            // Failed
            payment.setStatus(PaymentStatus.FAILED);
        }

        paymentRepository.save(payment);
    }
}
```

---
