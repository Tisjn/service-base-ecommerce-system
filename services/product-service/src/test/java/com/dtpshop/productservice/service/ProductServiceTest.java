package com.dtpshop.productservice.service;

import com.dtpshop.productservice.dto.CartItemRequest;
import com.dtpshop.productservice.dto.CheckoutResponse;
import com.dtpshop.productservice.dto.InventoryRequest;
import com.dtpshop.productservice.dto.ProductRequest;
import com.dtpshop.productservice.dto.ProductUpdateRequest;
import com.dtpshop.productservice.model.CartItem;
import com.dtpshop.productservice.model.Category;
import com.dtpshop.productservice.model.Product;
import com.dtpshop.productservice.model.ProductStatus;
import com.dtpshop.productservice.client.OrderServiceClient;
import com.dtpshop.productservice.repository.CategoryRepository;
import com.dtpshop.productservice.repository.ProductRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private OrderServiceClient orderServiceClient;

    private CartService cartService;

    private ProductService productService;

    @Captor
    private ArgumentCaptor<Product> productCaptor;

    @BeforeEach
    void setUp() {
        cartService = new TestCartService();
        productService = new ProductService(productRepository, categoryRepository, cartService, orderServiceClient);
    }

    @Test
    void shouldCreateProductWithCategoryAndImageUrl() {
        Category category = new Category();
        category.setId(1);
        category.setName("Test Category");

        when(categoryRepository.findById(1)).thenReturn(Optional.of(category));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProductRequest request = new ProductRequest();
        request.setName("Test Product");
        request.setDescription("A product for testing");
        request.setPrice(new BigDecimal("19.99"));
        request.setPurchasePrice(new BigDecimal("12.50"));
        request.setStockQuantity(10);
        request.setImageUrl("https://example.com/image.png");
        request.setCategoryId(1);

        Product created = productService.createProduct(request);

        assertThat(created.getName()).isEqualTo("Test Product");
        assertThat(created.getDescription()).isEqualTo("A product for testing");
        assertThat(created.getPrice()).isEqualByComparingTo(new BigDecimal("19.99"));
        assertThat(created.getPurchasePrice()).isEqualByComparingTo(new BigDecimal("12.50"));
        assertThat(created.getStockQuantity()).isEqualTo(10);
        assertThat(created.getReservedQuantity()).isZero();
        assertThat(created.getImageUrl()).isEqualTo("https://example.com/image.png");
        assertThat(created.getCategory()).isEqualTo(category);
        assertThat(created.getStatus()).isEqualTo(ProductStatus.ACTIVE);
        assertThat(created.getCreatedAt()).isNotNull();
        assertThat(created.getUpdatedAt()).isNotNull();

        verify(productRepository).save(productCaptor.capture());
        assertThat(productCaptor.getValue().getImageUrl()).isEqualTo("https://example.com/image.png");
    }

    @Test
    void shouldUpdateProductFieldsAndImageUrl() {
        Product existing = new Product();
        existing.setId(1L);
        existing.setName("Old Name");
        existing.setDescription("Old desc");
        existing.setPrice(new BigDecimal("20.00"));
        existing.setPurchasePrice(new BigDecimal("11.00"));
        existing.setStockQuantity(5);
        existing.setReservedQuantity(1);
        existing.setStatus(ProductStatus.ACTIVE);
        existing.setImageUrl("https://old.example.com/old.png");

        when(productRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProductUpdateRequest request = new ProductUpdateRequest();
        request.setName("Updated Name");
        request.setPrice(new BigDecimal("25.00"));
        request.setPurchasePrice(new BigDecimal("15.00"));
        request.setImageUrl("https://new.example.com/new.png");
        request.setStatus("hidden");

        Product updated = productService.updateProduct(1L, request);

        assertThat(updated.getName()).isEqualTo("Updated Name");
        assertThat(updated.getPrice()).isEqualByComparingTo(new BigDecimal("25.00"));
        assertThat(updated.getPurchasePrice()).isEqualByComparingTo(new BigDecimal("15.00"));
        assertThat(updated.getImageUrl()).isEqualTo("https://new.example.com/new.png");
        assertThat(updated.getStatus()).isEqualTo(ProductStatus.HIDDEN);
        assertThat(updated.getUpdatedAt()).isNotNull();
    }

    @Test
    void shouldFailUpdateWhenReducingStockBelowReserved() {
        Product existing = new Product();
        existing.setId(1L);
        existing.setStockQuantity(10);
        existing.setReservedQuantity(5);

        when(productRepository.findById(1L)).thenReturn(Optional.of(existing));

        ProductUpdateRequest request = new ProductUpdateRequest();
        request.setStockQuantity(4);

        assertThatThrownBy(() -> productService.updateProduct(1L, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Cannot reduce stock below reserved quantity");
    }

    @Test
    void shouldUpdateStockSuccessfully() {
        Product existing = new Product();
        existing.setId(1L);
        existing.setStockQuantity(10);
        existing.setReservedQuantity(2);

        when(productRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Product updated = productService.updateStock(1L, 8);

        assertThat(updated.getStockQuantity()).isEqualTo(8);
        assertThat(updated.getUpdatedAt()).isNotNull();
    }

    @Test
    void shouldFailUpdateStockWhenBelowReserved() {
        Product existing = new Product();
        existing.setId(1L);
        existing.setStockQuantity(10);
        existing.setReservedQuantity(5);

        when(productRepository.findById(1L)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> productService.updateStock(1L, 4))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("New stock cannot be lower than reserved quantity");
    }

    @Test
    void shouldFailCheckoutWhenCartEmpty() {
        ((TestCartService) cartService).setCartItems(List.of());

        assertThatThrownBy(() -> productService.checkoutCart(1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Giỏ hàng trống");
    }

    @Test
    void shouldFailCheckoutWhenProductInactive() {
        CartItem cartItem = new CartItem();
        cartItem.setProductId(1L);
        cartItem.setQuantity(1);
        cartItem.setUserId("1");

        Product inactiveProduct = new Product();
        inactiveProduct.setId(1L);
        inactiveProduct.setName("Inactive Item");
        inactiveProduct.setStatus(ProductStatus.HIDDEN);
        inactiveProduct.setStockQuantity(10);
        inactiveProduct.setReservedQuantity(0);

        ((TestCartService) cartService).setCartItems(List.of(cartItem));
        when(productRepository.findById(1L)).thenReturn(Optional.of(inactiveProduct));

        assertThatThrownBy(() -> productService.checkoutCart(1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Không thể checkout sản phẩm không hoạt động");
    }

    @Test
    void shouldFailCheckoutWhenInsufficientStock() {
        CartItem cartItem = new CartItem();
        cartItem.setProductId(1L);
        cartItem.setQuantity(6);
        cartItem.setUserId("1");

        Product product = new Product();
        product.setId(1L);
        product.setName("Limited Item");
        product.setPrice(new BigDecimal("10.00"));
        product.setStockQuantity(5);
        product.setReservedQuantity(0);
        product.setStatus(ProductStatus.ACTIVE);

        ((TestCartService) cartService).setCartItems(List.of(cartItem));
        when(productRepository.findById(1L)).thenReturn(Optional.of(product));

        assertThatThrownBy(() -> productService.checkoutCart(1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Tồn kho không đủ cho sản phẩm");
    }

    @Test
    void shouldFailReserveInventoryForInactiveProduct() {
        Product product = new Product();
        product.setId(1L);
        product.setName("Inactive Reserve");
        product.setStatus(ProductStatus.HIDDEN);
        product.setStockQuantity(10);
        product.setReservedQuantity(0);

        CartItemRequest item = new CartItemRequest();
        item.setProductId(1L);
        item.setQuantity(1);

        InventoryRequest request = new InventoryRequest();
        request.setItems(List.of(item));

        when(productRepository.findById(1L)).thenReturn(Optional.of(product));

        assertThatThrownBy(() -> productService.reserveInventory(request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Cannot reserve inventory for inactive product");
    }

    @Test
    void shouldFailReserveInventoryWhenInsufficientStock() {
        Product product = new Product();
        product.setId(1L);
        product.setName("Low Stock");
        product.setStatus(ProductStatus.ACTIVE);
        product.setStockQuantity(2);
        product.setReservedQuantity(1);

        CartItemRequest item = new CartItemRequest();
        item.setProductId(1L);
        item.setQuantity(3);

        InventoryRequest request = new InventoryRequest();
        request.setItems(List.of(item));

        when(productRepository.findById(1L)).thenReturn(Optional.of(product));

        assertThatThrownBy(() -> productService.reserveInventory(request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Insufficient inventory for product");
    }

    @Test
    void shouldCreateProductWhenCategoryNotFound() {
        ProductRequest request = new ProductRequest();
        request.setName("Test Product");
        request.setDescription("A product for testing");
        request.setPrice(new BigDecimal("19.99"));
        request.setPurchasePrice(new BigDecimal("12.50"));
        request.setStockQuantity(10);
        request.setCategoryId(999);

        when(categoryRepository.findById(999)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> productService.createProduct(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Category not found: 999");
    }

    @Test
    void shouldThrowWhenProductNotFound() {
        when(productRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> productService.getProduct(1L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Product not found: 1");
    }

    @Test
    void shouldRefundInventoryGracefullyWhenProductNotFound() {
        CartItemRequest item = new CartItemRequest();
        item.setProductId(1L);
        item.setQuantity(1);

        InventoryRequest request = new InventoryRequest();
        request.setItems(List.of(item));

        when(productRepository.findById(1L)).thenReturn(Optional.empty());

        productService.refundInventory(request);
    }

    @Test
    void shouldHandleReserveInventoryWhenRequestEmpty() {
        InventoryRequest request = new InventoryRequest();
        request.setItems(List.of());

        productService.reserveInventory(request);
    }

    @Test
    void shouldHandleRefundInventoryWhenRequestEmpty() {
        InventoryRequest request = new InventoryRequest();
        request.setItems(List.of());

        productService.refundInventory(request);
    }

    @Test
    void shouldHandleCheckoutWhenProductIsActiveAndQuantityAvailable() {
        CartItem cartItem = new CartItem();
        cartItem.setProductId(1L);
        cartItem.setProductName("Available Item");
        cartItem.setPrice(new BigDecimal("15.00"));
        cartItem.setQuantity(1);
        cartItem.setUserId("1");

        Product product = new Product();
        product.setId(1L);
        product.setName("Available Item");
        product.setPrice(new BigDecimal("15.00"));
        product.setStockQuantity(10);
        product.setReservedQuantity(0);
        product.setStatus(ProductStatus.ACTIVE);

        ((TestCartService) cartService).setCartItems(List.of(cartItem));
        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CheckoutResponse response = productService.checkoutCart(1L);

        assertThat(response.getTotalAmount()).isEqualByComparingTo(new BigDecimal("15.00"));
        assertThat(product.getReservedQuantity()).isEqualTo(1);
        assertThat(((TestCartService) cartService).getLastClearedUserId()).isEqualTo(1L);
    }

    @Test
    void shouldUpdateProductCategoryWhenCategoryExists() {
        Product existing = new Product();
        existing.setId(1L);
        existing.setName("Item");
        existing.setStatus(ProductStatus.ACTIVE);

        ProductUpdateRequest request = new ProductUpdateRequest();
        request.setCategoryId(2);

        Category category = new Category();
        category.setId(2);
        category.setName("New Category");

        when(productRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(categoryRepository.findById(2)).thenReturn(Optional.of(category));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Product updated = productService.updateProduct(1L, request);

        assertThat(updated.getCategory()).isEqualTo(category);
    }

    @Test
    void shouldFailUpdateProductWhenCategoryNotFound() {
        Product existing = new Product();
        existing.setId(1L);
        existing.setStatus(ProductStatus.ACTIVE);

        ProductUpdateRequest request = new ProductUpdateRequest();
        request.setCategoryId(999);

        when(productRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(categoryRepository.findById(999)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> productService.updateProduct(1L, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Category not found: 999");
    }

    @Test
    void shouldSoftDeleteProductWhenReservedQuantityZeroAndNotInCart() {
        Product existing = new Product();
        existing.setId(1L);
        existing.setReservedQuantity(0);
        existing.setStatus(ProductStatus.ACTIVE);

        when(productRepository.findById(1L)).thenReturn(Optional.of(existing));
        ((TestCartService) cartService).setProductInCart(false);
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Product deleted = productService.softDeleteProduct(1L);

        assertThat(deleted.getStatus()).isEqualTo(ProductStatus.HIDDEN);
        assertThat(deleted.getDeletedAt()).isNotNull();
    }

    @Test
    void shouldFailSoftDeleteWhenProductIsInCart() {
        Product existing = new Product();
        existing.setId(1L);
        existing.setReservedQuantity(0);
        existing.setStatus(ProductStatus.ACTIVE);

        when(productRepository.findById(1L)).thenReturn(Optional.of(existing));
        ((TestCartService) cartService).setProductInCart(true);

        assertThatThrownBy(() -> productService.softDeleteProduct(1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Không thể xóa sản phẩm vì sản phẩm đang được giữ hoặc có trong giỏ hàng");
    }

    @Test
    void shouldRestoreHiddenProduct() {
        Product existing = new Product();
        existing.setId(2L);
        existing.setName("Hidden Product");
        existing.setStatus(ProductStatus.HIDDEN);

        when(productRepository.findById(2L)).thenReturn(Optional.of(existing));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Product restored = productService.restoreProduct(2L);

        assertThat(restored.getStatus()).isEqualTo(ProductStatus.ACTIVE);
        assertThat(restored.getUpdatedAt()).isNotNull();
    }

    @Test
    void shouldCheckoutCartAndReserveInventory() {
        CartItem cartItem = new CartItem();
        cartItem.setProductId(1L);
        cartItem.setProductName("Test Item");
        cartItem.setPrice(new BigDecimal("25.00"));
        cartItem.setQuantity(2);
        cartItem.setUserId("1");

        Product product = new Product();
        product.setId(1L);
        product.setName("Test Item");
        product.setPrice(new BigDecimal("25.00"));
        product.setStockQuantity(10);
        product.setReservedQuantity(0);
        product.setStatus(ProductStatus.ACTIVE);

        ((TestCartService) cartService).setCartItems(List.of(cartItem));
        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CheckoutResponse response = productService.checkoutCart(1L);

        assertThat(response.getItems()).hasSize(1);
        assertThat(response.getTotalAmount()).isEqualByComparingTo(new BigDecimal("50.00"));
        assertThat(response.getMessage()).contains("Checkout thành công");
        assertThat(product.getReservedQuantity()).isEqualTo(2);
        assertThat(((TestCartService) cartService).getLastClearedUserId()).isEqualTo(1L);
    }

    @Test
    void shouldReserveInventorySuccessfully() {
        Product product = new Product();
        product.setId(1L);
        product.setName("Reserve Item");
        product.setPrice(new BigDecimal("10.00"));
        product.setStockQuantity(5);
        product.setReservedQuantity(1);
        product.setStatus(ProductStatus.ACTIVE);

        CartItemRequest item = new CartItemRequest();
        item.setProductId(1L);
        item.setQuantity(2);

        InventoryRequest request = new InventoryRequest();
        request.setItems(List.of(item));

        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        productService.reserveInventory(request);

        assertThat(product.getStockQuantity()).isEqualTo(3);
    }

    @Test
    void shouldRefundInventorySuccessfully() {
        Product product = new Product();
        product.setId(1L);
        product.setStockQuantity(5);
        product.setReservedQuantity(3);

        CartItemRequest item = new CartItemRequest();
        item.setProductId(1L);
        item.setQuantity(1);

        InventoryRequest request = new InventoryRequest();
        request.setItems(List.of(item));

        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        productService.refundInventory(request);

        assertThat(product.getStockQuantity()).isEqualTo(6);
    }

    private static final class TestCartService extends CartService {

        private boolean productInCart;
        private List<CartItem> cartItems = List.of();
        private Long lastClearedUserId;

        TestCartService() {
            super(null, null, null);
        }

        @Override
        public boolean isProductInCart(Long productId) {
            return productInCart;
        }

        @Override
        public List<CartItem> getCartItems(Long userId) {
            return cartItems;
        }

        @Override
        public void clearCart(Long userId) {
            this.lastClearedUserId = userId;
        }

        void setProductInCart(boolean productInCart) {
            this.productInCart = productInCart;
        }

        void setCartItems(List<CartItem> cartItems) {
            this.cartItems = cartItems;
        }

        Long getLastClearedUserId() {
            return lastClearedUserId;
        }
    }
}
