# Testing Guide - Guest Cart & Merge Functionality

## Prerequisites

- MySQL server running and database initialized
- auth-service running on port 3001
- product-service running on port 3003
- order-service running on port 3004
- frontend running on port 5173 (or nginx serving dist/)

## Start Services

```bash
# Terminal 1: MySQL (if using local MySQL)
# Ensure MySQL is running on port 3306

# Terminal 2: Auth Service
cd services/auth-service
npm start
# Expected: "Auth Service running on port 3001"

# Terminal 3: Product Service
cd services/product-service
mvn clean package -DskipTests -q
java -jar target/product-service-0.0.1-SNAPSHOT.jar
# Expected: "Tomcat started on port 8082" then "Application ready"

# Terminal 4: Order Service
cd services/order-service
mvn clean package -DskipTests -q
java -jar target/order-service-0.0.1-SNAPSHOT.jar
# Expected: "Tomcat started on port 8081" then "Application ready"

# Terminal 5: Frontend (if needed)
cd frontend
npm run dev
# Expected: "Local: http://localhost:5173"
```

## Test Scenarios

### Scenario 1: Guest Adds Item to Cart

1. **Open Browser:**
   - Navigate to http://localhost:5173 (or frontend URL)
   - Do NOT log in
   - Open DevTools → Console (to watch for logs)

2. **Verify Guest Token:**
   - Open DevTools → Storage → Cookies/LocalStorage
   - Should see `guestToken = "guest_<timestamp>_<random>"`
   - Note the token value for debugging

3. **Add Item to Cart:**
   - Click on any product
   - Click "Add to Cart" button
   - **Expected Results:**
     - Success notification: "Đã thêm [product] vào giỏ hàng"
     - Product appears in cart (click Cart tab)
     - Cart count badge shows "1"

4. **Verify Database:**
   - Open MySQL client:

   ```sql
   SELECT * FROM cart_items WHERE user_id LIKE 'guest:%';
   ```

   - Should show 1 row with:
     - `user_id = "guest_<timestamp>_<random>"`
     - `product_id = <product_id_you_added>`
     - `quantity = 1`

5. **Add More Items:**
   - Add 2-3 more items
   - Verify all appear in cart UI
   - Verify all saved in database with same `user_id`

### Scenario 2: Guest Updates Quantity

1. **Update Existing Item:**
   - Go to Cart tab
   - Find an item you just added
   - Change quantity to 5
   - **Expected Results:**
     - Quantity updates immediately in UI
     - No error notifications

2. **Verify Database:**

   ```sql
   SELECT * FROM cart_items WHERE user_id LIKE 'guest:%' AND product_id = <product_id>;
   ```

   - Should show `quantity = 5`

### Scenario 3: Guest Removes Item

1. **Remove Item:**
   - Find item in cart
   - Click delete/remove button
   - **Expected Results:**
     - Success notification: "Đã xóa sản phẩm khỏi giỏ hàng"
     - Item disappears from cart UI
     - Cart count decreases

2. **Verify Database:**

   ```sql
   SELECT COUNT(*) FROM cart_items WHERE user_id LIKE 'guest:%' AND product_id = <deleted_product_id>;
   ```

   - Should return 0

### Scenario 4: Guest Logs In - Merge Flow

1. **Start State:**
   - Guest cart has 2-3 items (don't clear between scenarios)
   - `guestToken` in localStorage
   - **Note guest token value** for DB verification

2. **Click Login:**
   - Click "Login" button
   - Enter test credentials:
     - Email: test@example.com
     - Password: password123
   - **Expected Results:**
     - Redirect to Dashboard
     - Success notification appears briefly
     - User account shown (email/avatar)
     - Cart tab shows merged items

3. **Verify Merge Success Notification:**
   - Console should show:
     ```
     Guest cart merged successfully
     ```
   - Toast notification: "Giỏ hàng khách đã được đồng bộ vào tài khoản của bạn"

4. **Verify Merged Items Display:**
   - Cart should show all items you added as guest
   - Cart count should match total quantity
   - No refresh required
   - **Expected Results:** ✅ Items visible immediately

5. **Verify Database - Guest Entry Deleted:**

   ```sql
   SELECT COUNT(*) FROM cart_items WHERE user_id LIKE 'guest:%';
   ```

   - Should return 0 (all guest entries deleted after merge)

6. **Verify Database - User Cart Updated:**

   ```sql
   SELECT * FROM cart_items WHERE user_id = <your_user_id> ORDER BY id DESC LIMIT 5;
   ```

   - Should show 2-3 items you added as guest
   - All should have `user_id = <numeric_user_id>`
   - Quantities should match what you set

### Scenario 5: User Already Has Cart Items - Merge Adds Quantities

1. **Setup:**
   - Clear cart: DELETE FROM cart_items WHERE user_id = 1;
   - Add user cart item manually or through UI:
     ```sql
     INSERT INTO cart_items (user_id, product_id, product_name, price, quantity)
     VALUES ('1', 10, 'Product 10', 100.00, 2);
     ```
   - Logout and clear guestToken: `localStorage.removeItem('guestToken')`
   - Refresh page

2. **Guest Adds Same Product:**
   - Don't login yet
   - Add Product 10 (quantity 3) to cart as guest
   - Verify in guest cart

3. **Guest Logs In:**
   - Login with same credentials
   - Merge triggers
   - **Expected Results:**
     - Cart shows Product 10 with quantity = 5 (2 + 3)
     - Not replaced (2) or duplicated (shown twice)

4. **Verify Database:**

   ```sql
   SELECT * FROM cart_items WHERE user_id = 1 AND product_id = 10;
   ```

   - Should show single row with `quantity = 5`

### Scenario 6: No Guest Cart - Clean Merge

1. **Fresh Login:**
   - Clear all cookies/localStorage
   - Refresh page (new guestToken generated)
   - Go directly to Login (don't add any items)

2. **Login:**
   - Enter credentials
   - **Expected Results:**
     - No merge notification (no guest cart to merge)
     - Dashboard loads normally
     - User's existing cart items displayed

3. **Verify Backend Logs:**
   - No errors in product-service logs
   - Merge endpoint handles empty guest cart gracefully

### Scenario 7: Multiple Items and Complex Merge

1. **Guest Mode Setup:**
   - Add Product A (qty 2)
   - Add Product B (qty 1)
   - Add Product C (qty 3)

2. **Login (User already has items):**
   - User has Product A (qty 1) and Product D (qty 4)

3. **After Merge:**
   - Product A: should be 3 (1 + 2)
   - Product B: should be 1 (guest only)
   - Product C: should be 3 (guest only)
   - Product D: should be 4 (user only)

4. **Verify Database:**

   ```sql
   SELECT product_id, quantity FROM cart_items WHERE user_id = <user_id> ORDER BY product_id;
   ```

   - Should match expected quantities

## Debug Checklist

### If Guest Add/Update/Remove Fails:

1. **Check Browser Network Tab:**
   - Request to `POST /cart/guest/items` should show 201/200 status
   - Response headers should include `X-Guest-Token` echo (if server echoes)

2. **Check Browser Console:**
   - Error messages should appear
   - Look for 400/401/500 status codes

3. **Check Backend Logs:**
   - Product-service console should show:
     ```
     [product-service] POST /api/cart/guest/items
     ```
   - Look for validation errors or exceptions

4. **Check Database:**
   - Verify guest token format: should be `"guest:<timestamp>_<random>"`
   - Not just `"guest"` or malformed

### If Merge Fails:

1. **Check Request Headers:**
   - `X-Guest-Token` header present
   - `Authorization: Bearer <jwt>` header present

2. **Backend Logs:**
   - Should show:
     ```
     POST /api/cart/merge
     Merging guest cart for user: <user_id>
     ```

3. **Check JWT Token:**
   - In browser, decode token at jwt.io
   - Verify `user_id` matches database user

4. **Check Cart Items:**
   - Before merge: count of `user_id LIKE 'guest:%'` items
   - After merge: count should be 0
   - User cart should have all items

## Quick Test Commands

```bash
# Check database state
mysql -u root -p ecommerce_db -e "SELECT COUNT(*) as guest_items FROM cart_items WHERE user_id LIKE 'guest:%';"

# Monitor product-service logs in real-time
tail -f services/product-service/nohup.out

# Check if ports are in use
netstat -ano | findstr :3001
netstat -ano | findstr :3003
netstat -ano | findstr :3004
```

## Expected Final State After Complete Test

✅ Guest adds items → stored in DB with `user_id="guest:<token>"`
✅ Guest cart operations work (add/update/remove)
✅ User logs in → merge triggered automatically
✅ Merged items appear immediately in cart UI
✅ Guest cart entries deleted from DB
✅ Quantities combined for duplicate products
✅ No duplicate cart items shown
✅ No errors in browser console or server logs

## Troubleshooting Reference

| Issue                        | Cause                 | Solution                                              |
| ---------------------------- | --------------------- | ----------------------------------------------------- |
| Guest add fails              | MySQL not running     | Start MySQL service                                   |
| 401 on merge                 | JWT expired           | Refresh page and log in again                         |
| Duplicate items after merge  | Merge logic bug       | Check CartService.mergeGuestCartToUser()              |
| Items don't show after merge | loadCart() not called | Check CustomerOrderHubPage useEffect dependency array |
| Guest token null             | Token init timing     | Verify useState(() => getGuestToken())                |
| "X-Guest-Token not found"    | Header not sent       | Check getAuthHeaders() function                       |
