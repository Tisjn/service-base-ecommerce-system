# Guest Cart & Merge Fix Summary

## Issues Fixed

### 1. Guest Cart Operations (Add/Update/Remove)

**Problem:** Guest cart items weren't persisting or operations failed silently

**Root Causes:**

- guestToken initialized as `null`, regenerated on each call causing inconsistency
- Token not consistently passed to all API calls
- Missing error handling

**Solutions Implemented:**

- Initialize guestToken immediately on component mount with `useState(() => getGuestToken())`
- Sync guestToken to localStorage on init
- Pass token explicitly to all guest cart API calls
- Add proper error handling and notifications

### 2. Guest Cart Merge After Login

**Problem:** After login, merged guest items didn't appear immediately in user's cart

**Root Causes:**

- Race condition between App.jsx merge and CustomerOrderHubPage merge
- loadCart() not triggered after merge completion
- guestToken dependency missing in useEffect

**Solutions Implemented:**

- Removed merge from App.jsx - now handled entirely in CustomerOrderHubPage
- Added guestToken to useEffect dependency array
- Restructured useEffect to:
  1. Detect login (userId change)
  2. Call mergeGuestCartToServer() if guestToken exists
  3. Clear guestToken after successful merge
  4. Immediately load cart with new userId
  5. Show success notification

## Code Changes

### Frontend: `CustomerOrderHubPage.jsx`

1. **Added helper function:**

   ```javascript
   function syncGuestTokenFromStorage() {
     return localStorage.getItem(GUEST_TOKEN_KEY) || null;
   }
   ```

2. **Fixed guestToken initialization:**

   ```javascript
   const [guestToken, setGuestToken] = useState(() => {
     const token = getGuestToken();
     localStorage.setItem(GUEST_TOKEN_KEY, token);
     return token;
   });
   ```

3. **Updated loadCart() callback:**
   - Added `guestToken` to dependency array
   - Ensures cart reloads when token changes

4. **Restructured main useEffect:**
   - Added `guestToken` to dependency array
   - When user logs in AND guestToken exists:
     - Calls `mergeGuestCartToServer()`
     - Clears guestToken from state and storage
     - Shows success notification
   - Then loads cart/orders with new userId

### Frontend: `App.jsx`

- Removed duplicate merge logic from `handleLogin()`
- Now only stores tokens and updates user state
- Merge is handled by CustomerOrderHubPage

### Backend: Already Properly Implemented

**ProductController:**

- `/api/cart/merge` endpoint accepts X-Guest-Token header + JWT auth
- Extracts userId from JWT, passes to CartService

**CartService.mergeGuestCartToUser():**

- Fetches all guest cart items (userId = "guest:<token>")
- Merges quantities with existing user items
- Updates user cart, syncs to order-service
- Deletes guest cart entries

## How It Works

### Guest Flow

1. User visits site (not logged in)
2. guestToken generated and stored in localStorage + state
3. Add item → API call with X-Guest-Token header
4. Backend saves to cart_items table with userId = "guest:<token>"

### Login & Merge Flow

1. User logs in with email/password
2. App.jsx stores JWT token and updates `user` prop
3. CustomerOrderHubPage detects userId change
4. useEffect triggers:
   - Calls POST /api/cart/merge with X-Guest-Token header + Bearer token
   - Backend merges guest items to user's cart
   - Frontend clears guestToken
   - Frontend calls loadCart() with new userId
5. User sees all items (guest + merged) immediately

## Database Schema

```sql
CREATE TABLE cart_items (
  id BIGINT PRIMARY KEY,
  user_id VARCHAR(255) -- "guest:<token>" or numeric userId
  product_id BIGINT,
  quantity INT,
  price DECIMAL(10, 2),
  ...
);
```

## Testing Checklist

- [ ] Start MySQL database
- [ ] Run product-service
- [ ] As guest: Add item → verify DB has userId="guest:<token>"
- [ ] Login → verify merge endpoint called
- [ ] After login: Cart shows merged items without refresh
- [ ] Verify guest cart entries deleted from DB after merge
- [ ] Test with multiple items in guest cart
- [ ] Test with duplicate products (quantities should add)

## Build Status

- ✅ Frontend builds successfully (94 modules, 344.95 kB)
- ✅ Backend compiles (Java Spring Boot)
- ✅ No TypeScript/Java errors
- ✅ Ready for testing with database

## Key Files Modified

1. [frontend/src/pages/orders/CustomerOrderHubPage.jsx](frontend/src/pages/orders/CustomerOrderHubPage.jsx)
2. [frontend/src/App.jsx](frontend/src/App.jsx)

## Backend Files (Verified Correct)

1. [services/product-service/.../ProductController.java](services/product-service/src/main/java/com/dtpshop/productservice/controller/ProductController.java)
2. [services/product-service/.../CartService.java](services/product-service/src/main/java/com/dtpshop/productservice/service/CartService.java)
