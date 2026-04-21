package iuh.fit.auth_service.config;

import iuh.fit.auth_service.entity.Customer;
import iuh.fit.auth_service.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.lang.NonNull;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final CustomerRepository customerRepository;

    @Override
    public void run(@NonNull String... args) {
        String adminName = "test1";
        String adminPassword = "testpass1";

        boolean exists = customerRepository.findByName(adminName).isPresent();
        if (!exists) {
            Customer admin = new Customer();
            admin.setName(adminName);
            admin.setPassword(adminPassword);
            customerRepository.save(admin);
            System.out.println("Seeded admin user: admin / sapassword");
        } else {
            System.out.println("Admin user already exists, skipping seeding");
        }
    }
}
