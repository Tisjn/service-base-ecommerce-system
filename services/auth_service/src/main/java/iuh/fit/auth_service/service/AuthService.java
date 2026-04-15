package iuh.fit.auth_service.service;

import iuh.fit.auth_service.entity.Customer;
import iuh.fit.auth_service.repository.CustomerRepository;
import iuh.fit.auth_service.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final CustomerRepository customerRepository;
    private final JwtUtil jwtUtil;

    public String login(String name, String password) {
        Customer customer = customerRepository.findByName(name)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!customer.getPassword().equals(password)) {
            throw new RuntimeException("Wrong password");
        }

        return jwtUtil.generateToken(name);
    }
}