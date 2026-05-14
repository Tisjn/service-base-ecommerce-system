# Guest Cart Implementation - Verification Checklist

## Frontend Implementation ✅

### 1. Guest Token Initialization

**File:** `frontend/src/pages/orders/CustomerOrderHubPage.jsx`
**Lines:** 84-89

```javascript
const [guestToken, setGuestToken] = useState(() => {
  const token = getGuestToken();
  localStorage.setItem(GUEST_TOKEN_KEY, token);
  return token;
});
```

**Status:** ✅ Token initialized immediately on component mount and synced to localStorage

### 2. Helper Functions

**File:** `frontend/src/pages/orders/CustomerOrderHubPage.jsx`
**Lines:** 11-28

```javascript
const GUEST_TOKEN_KEY = "guestToken";

function getGuestToken() {
  let token = localStorage.getItem(GUEST_TOKEN_KEY);
  if (!token) {
    token = orderApi.generateGuestToken();
    localStorage.setItem(GUEST_TOKEN_KEY, token);
  }
  return token;
}

function clearGuestToken() {
  localStorage.removeItem(GUEST_TOKEN_KEY);
}

function syncGuestTokenFromStorage() {
  return localStorage.getItem(GUEST_TOKEN_KEY) || null;
}
```

**Status:** ✅ All helper functions properly implemented

### 3. Load Cart Function

**File:** `frontend/src/pages/orders/CustomerOrderHubPage.jsx`
**Lines:** 203-231

- ✅ Checks if userId exists
- ✅ For guest: uses guestToken, passes to orderApi.getCart("guest", token)
- ✅ For authenticated: uses userId
- ✅ Added guestToken to dependency array: `[userId, guestToken, showNotification]`
  **Status:** ✅ Cart properly loads for both guest and authenticated users

### 4. Merge Function

**File:** `frontend/src/pages/orders/CustomerOrderHubPage.jsx`
**Lines:** 271-283

```javascript
const mergeGuestCartToServer = useCallback(async () => {
  if (!guestToken) {
    return;
  }

  try {
    await orderApi.mergeGuestCart(guestToken);
    console.log("Guest cart merged successfully");
  } catch (error) {
    console.error("Failed to merge guest cart:", error);
    showNotification("error", "Không đồng bộ được giỏ hàng khách");
    throw error;
  }
}, [guestToken, showNotification]);
```

**Status:** ✅ Merge calls backend, throws on error, logs for debugging

### 5. Main useEffect - Login & Merge

**File:** `frontend/src/pages/orders/CustomerOrderHubPage.jsx`
**Lines:** 301-350

```javascript
useEffect(() => {
  let cancelled = false;

  const syncGuestCartAndLoad = async () => {
    if (!userId) {
      // Guest: load cart will handle guestToken
      await loadCart();
      setOrders([]);
      return;
    }

    // User logged in: merge guest cart if token exists
    if (guestToken) {
      try {
        await mergeGuestCartToServer();
        clearGuestToken();
        setGuestToken(null);
        showNotification(
          "success",
          "Giỏ hàng khách đã được đồng bộ vào tài khoản của bạn.",
        );
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to merge during login:", error);
          showNotification(
            "error",
            error.message || "Không đồng bộ được giỏ hàng khách.",
          );
        }
      }
    }

    if (cancelled) {
      return;
    }

    // Always load cart/orders after merge or just on login
    await Promise.all([
      loadCart(),
      loadOrders(),
      isAdmin ? loadAdminOrders() : Promise.resolve(),
    ]);
  };

  syncGuestCartAndLoad();

  return () => {
    cancelled = true;
  };
}, [
  isAdmin,
  guestToken, // ✅ Added to dependency array
  loadAdminOrders,
  loadCart,
  loadOrders,
  mergeGuestCartToServer,
  showNotification,
  userId,
]);
```

**Status:** ✅ Properly handles guest mode, login+merge, and cleanup

### 6. Guest Cart Operations

**File:** `frontend/src/pages/orders/CustomerOrderHubPage.jsx`

#### handleSelectAddress (Add to Cart)

**Lines:** 386-410

- ✅ Checks if guest mode
- ✅ Regenerates token if missing
- ✅ Passes token to orderApi.addCartItem()
- ✅ Calls loadCart() to refresh

#### handleQuantityChange (Update)

**Lines:** 427-451

- ✅ Checks if guest mode
- ✅ Regenerates token if missing
- ✅ Passes token to orderApi.updateCartItem()
- ✅ Calls loadCart() to refresh

#### handleRemoveFromCart (Delete)

**Lines:** 464-489

- ✅ Checks if guest mode
- ✅ Regenerates token if missing
- ✅ Passes token to orderApi.removeCartItem()
- ✅ Calls loadCart() to refresh

**Status:** ✅ All guest operations pass token and refresh cart

### 7. App Component Cleanup

**File:** `frontend/src/App.jsx`
**Lines:** 58-65

```javascript
const handleLogin = async (token, refresh, userData) => {
  localStorage.setItem("authToken", token);
  localStorage.setItem("authRefreshToken", refresh);
  localStorage.setItem("authUser", JSON.stringify(userData || {}));
  setAuthToken(token);
  setRefreshToken(refresh);
  setUser(userData || null);
  setShowLogin(false);
  // Note: Guest cart merge is handled in CustomerOrderHubPage useEffect
  // when it detects userId change and guestToken exists
};
```

**Status:** ✅ Merge logic removed from App.jsx (handled in CustomerOrderHubPage)

## API Implementation ✅

### orderApi.js Functions

**File:** `frontend/src/api/orderApi.js`

#### getAuthHeaders Function

**Lines:** 12-21

```javascript
function getAuthHeaders(guestToken) {
  const headers = {};
  const token = localStorage.getItem("authToken");
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (guestToken) {
    headers["X-Guest-Token"] = guestToken;
  }
  return headers;
}
```

**Status:** ✅ Adds both Bearer token and X-Guest-Token to headers

#### API Functions

- ✅ `getCart(userId, guestToken)` - Uses getAuthHeaders(guestToken)
- ✅ `addCartItem(userId, item, guestToken)` - Uses getAuthHeaders(guestToken)
- ✅ `updateCartItem(userId, productId, quantity, guestToken)` - Uses getAuthHeaders(guestToken)
- ✅ `removeCartItem(userId, productId, guestToken)` - Uses getAuthHeaders(guestToken)
- ✅ `mergeGuestCart(guestToken)` - Uses getAuthHeaders(guestToken), calls `/cart/merge`

**Status:** ✅ All API functions properly pass headers

## Backend Implementation ✅

### ProductController.java

**File:** `services/product-service/.../controller/ProductController.java`

#### Merge Endpoint

**Lines:** 201-219

```java
@PostMapping("/cart/merge")
public ResponseEntity<Void> mergeGuestCart(
    @RequestHeader("X-Guest-Token") String guestToken,
    Authentication authentication) {
  if (authentication == null || authentication.getName() == null) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
  }

  Long userId;
  try {
    userId = Long.parseLong(authentication.getName());
  } catch (NumberFormatException e) {
    return ResponseEntity.badRequest().build();
  }

  productService.mergeGuestCartToUser(guestToken, userId);
  return ResponseEntity.ok().build();
}
```

**Status:** ✅ Endpoint receives X-Guest-Token and JWT auth, calls service

#### Cart Endpoints

- ✅ `GET /cart/{userId}` - Accepts X-Guest-Token header
- ✅ `POST /cart/{userId}/items` - Accepts X-Guest-Token header
- ✅ `PATCH /cart/{userId}/items/{productId}` - Accepts X-Guest-Token header
- ✅ `DELETE /cart/{userId}/items/{productId}` - Accepts X-Guest-Token header

**Status:** ✅ All endpoints support guest token

### CartService.java

**File:** `services/product-service/.../service/CartService.java`

#### Guest Operations

- ✅ `getCartByGuestToken(String guestToken)` - Queries with userId="guest:{token}"
- ✅ `addItemByGuestToken(String guestToken, CartItemRequest request)` - Saves with guest userId
- ✅ `updateItemQuantityByGuestToken(String guestToken, Long productId, Integer quantity)` - Updates guest item
- ✅ `removeItemByGuestToken(String guestToken, Long productId)` - Deletes guest item

#### Merge Operation

**Lines:** 142-161

```java
@Transactional
public void mergeGuestCartToUser(String guestToken, Long userId) {
  String guestUserId = "guest:" + guestToken;
  List<CartItem> guestItems = cartItemRepository.findByUserId(guestUserId);
  for (CartItem guestItem : guestItems) {
    CartItem existing = cartItemRepository.findByUserIdAndProductId(userId.toString(), guestItem.getProductId())
            .orElseGet(CartItem::new);
    int mergedQuantity = guestItem.getQuantity();
    if (existing.getId() != null) {
      mergedQuantity += existing.getQuantity();
    }
    existing.setUserId(userId.toString());
    existing.setProductId(guestItem.getProductId());
    existing.setProductName(guestItem.getProductName());
    existing.setPrice(guestItem.getPrice());
    existing.setQuantity(mergedQuantity);
    cartItemRepository.save(existing);
    orderServiceClient.syncAddOrUpdateCartItem(userId, existing);
  }
  if (!guestItems.isEmpty()) {
    cartItemRepository.deleteByUserId(guestUserId);
  }
}
```

**Status:** ✅ Merges quantities, syncs to order-service, deletes guest entries

## Build Status ✅

- Frontend: `npm run build` ✅
  - 94 modules transformed
  - 344.95 kB gzip size
  - No errors or warnings
- Backend: `mvn clean package -DskipTests` ✅
  - Compiles successfully
  - All dependencies resolved
  - JAR file ready for execution

## Summary

✅ **Complete Implementation:** All components (frontend state, API calls, backend endpoints, database operations) are properly integrated

✅ **Guest Token Management:** Token generated on init, stored in both state and localStorage, passed to all operations

✅ **Merge Flow:** Triggered on login, merges quantities, syncs to order-service, deletes guest entries, reloads cart

✅ **Error Handling:** Try-catch blocks, user notifications, console logging for debugging

✅ **No Race Conditions:** Dependencies properly ordered, merge completes before cart load

**Ready for Testing:** System is ready to test with database running. Expected flow:

1. Guest adds items → saved to DB with `userId="guest:<token>"`
2. User logs in → merge endpoint called
3. Guest items moved to user's cart → quantities combined
4. Cart reloaded → merged items immediately visible
