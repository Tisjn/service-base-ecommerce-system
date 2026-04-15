package iuh.fit.auth_service.controller;

import iuh.fit.auth_service.dto.LoginRequest;
import iuh.fit.auth_service.dto.LoginResponse;
import iuh.fit.auth_service.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request) {

        String token = authService.login(request.getName(), request.getPassword());

        return new LoginResponse(token);
    }
}