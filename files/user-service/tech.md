# User Service — Tech Stack

**Port:** 3002 | **Language:** Java 21 | **Framework:** Spring Boot 3.x

## Ngôn ngữ & Runtime

**Java 21 (LTS)** trên **Spring Boot 3.x** — Lý do chọn:

- Spring Security + JWT filter xử lý authentication
- Spring Data JPA tự động mapping entity → DTO
- Transaction support cho soft delete
- Native build hỗ trợ GraalVM (tối ưu container)

## Framework & Thư viện

| Thư viện              | Mục đích                                       |
| --------------------- | ---------------------------------------------- |
| **Spring Web**        | HTTP server, REST controller                   |
| **Spring Data JPA**   | Hibernate ORM, repository pattern              |
| **Spring Security**   | JWT filter, role-based access                  |
| **MySQL Connector/J** | MySQL client driver                            |
| **Spring Validation** | Bean Validation (@NotNull, @Email, etc)        |
| **Lombok**            | Annotation processor (@Data, @Getter, @Setter) |
| **Jackson**           | JSON serialization                             |

## Cấu hình Database

```yaml
spring:
  datasource:
    url: jdbc:mysql://${RDS_HOST}:${RDS_PORT}/userdb?useSSL=${RDS_SSL}
    username: ${RDS_USER}
    password: ${RDS_PASSWORD}
    driver-class-name: com.mysql.cj.jdbc.Driver

  jpa:
    hibernate:
      ddl-auto: validate # Chỉ validate schema, không auto-create
    database-platform: org.hibernate.dialect.MySQL8Dialect
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQL8Dialect
```

## Entity & JPA Mapping

```java
@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    private String phone;
    private String address;

    @Column(name = "status", nullable = false)
    @Enumerated(EnumType.STRING)
    private UserStatus status; // ACTIVE, LOCKED, DELETED

    @Column(name = "created_at", nullable = false, updatable = false)
    @CreationTimestamp
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}

public enum UserStatus {
    ACTIVE, LOCKED, DELETED
}
```

## JWT Filter Implementation

```java
@Component
public class JwtFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                  HttpServletResponse response,
                                  FilterChain chain)
            throws ServletException, IOException {

        // Lấy X-User-Id từ header (inject bởi API Gateway)
        String userId = request.getHeader("X-User-Id");
        String userRole = request.getHeader("X-User-Role");
        String userEmail = request.getHeader("X-User-Email");

        if (userId != null && !userId.isEmpty()) {
            // Trust gateway verification
            // Set SecurityContext
            UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(
                    userId, null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + userRole))
                );
            SecurityContextHolder.getContext().setAuthentication(auth);
        }

        chain.doFilter(request, response);
    }
}
```

## Controller Example

```java
@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(
            @RequestHeader("X-User-Id") Long userId) {

        User user = userService.getUserById(userId);
        return ResponseEntity.ok(user.toDTO()); // không trả password
    }

    @PatchMapping("/me")
    public ResponseEntity<?> updateProfile(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody UpdateUserRequest request) {

        User updated = userService.updateUser(userId, request);
        return ResponseEntity.ok(updated.toDTO());
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> listAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
```

## Repository Pattern

```java
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    List<User> findByStatus(UserStatus status);

    // Custom query: soft delete
    @Query("SELECT u FROM User u WHERE u.status != 'DELETED'")
    List<User> findAllActive();
}
```

## Service Layer

```java
@Service
@Transactional
public class UserService {

    @Autowired
    private UserRepository userRepository;

    public User getUserById(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException("User not found"));
    }

    public User updateUser(Long id, UpdateUserRequest request) {
        User user = getUserById(id);

        if (request.getFirstName() != null)
            user.setFirstName(request.getFirstName());
        if (request.getPhone() != null)
            user.setPhone(request.getPhone());
        // ...

        return userRepository.save(user);
    }

    // Soft delete: set deleted_at + status = DELETED
    public void deleteUser(Long id) {
        User user = getUserById(id);

        // Check if user has orders
        // if (userHasOrders(id)) throw new Exception(...)

        user.setStatus(UserStatus.DELETED);
        user.setDeletedAt(LocalDateTime.now());
        userRepository.save(user);
    }

    public void lockUser(Long id) {
        User user = getUserById(id);
        user.setStatus(UserStatus.LOCKED);
        userRepository.save(user);
    }
}
```

---
