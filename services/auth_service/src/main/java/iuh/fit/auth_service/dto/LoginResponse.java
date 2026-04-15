package iuh.fit.auth_service.dto;

import lombok.*;

@Data
@AllArgsConstructor
public class LoginResponse {
    private String token;
}