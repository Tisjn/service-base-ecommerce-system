package com.dtpshop.paymentservice.controller;

import com.dtpshop.paymentservice.config.MomoProperties;
import com.dtpshop.paymentservice.dto.CreatePaymentRequest;
import com.dtpshop.paymentservice.dto.PaymentResponse;
import com.dtpshop.paymentservice.service.PaymentService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.view.RedirectView;

@RestController
@RequestMapping("/payments")
public class PaymentController {

    private final PaymentService paymentService;
    private final MomoProperties momoProperties;

    public PaymentController(PaymentService paymentService, MomoProperties momoProperties) {
        this.paymentService = paymentService;
        this.momoProperties = momoProperties;
    }

    @PostMapping
    public ResponseEntity<PaymentResponse> create(@Valid @RequestBody CreatePaymentRequest request) {
        return ResponseEntity.status(201).body(paymentService.create(request));
    }

    @GetMapping
    public ResponseEntity<List<PaymentResponse>> findAll(@RequestParam(required = false) Long orderId) {
        return ResponseEntity.ok(paymentService.findAll(orderId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PaymentResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(paymentService.findById(id));
    }

    @PatchMapping("/{id}/cod-paid")
    public ResponseEntity<PaymentResponse> markCodPaid(@PathVariable Long id) {
        return ResponseEntity.ok(paymentService.markCodPaid(id));
    }

    @PostMapping("/webhook/momo")
    public ResponseEntity<PaymentResponse> momoWebhook(@RequestBody Map<String, Object> payload) {
        return ResponseEntity.ok(paymentService.handleMomoWebhook(payload));
    }

    @GetMapping("/return/momo")
    public RedirectView momoReturn(@RequestParam Map<String, String> params) {
        PaymentResponse payment = paymentService.handleMomoReturn(params);
        String separator = momoProperties.getFrontendReturnUrl().contains("?") ? "&" : "?";
        String target = momoProperties.getFrontendReturnUrl()
                + separator
                + "paymentId=" + payment.id()
                + "&orderId=" + payment.orderId()
                + "&paymentStatus=" + payment.status();
        return new RedirectView(target);
    }
}
