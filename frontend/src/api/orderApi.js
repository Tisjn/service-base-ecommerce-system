const API_GATEWAY_URL =
  import.meta.env.VITE_API_GATEWAY_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:8081";
const API_BASE_URL = `${API_GATEWAY_URL.replace(/\/$/, "")}/api`;

function getAuthHeaders() {
  const headers = {};
  const token = localStorage.getItem("authToken");
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function isRetriableRequest(options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  return method === "GET" || method === "HEAD";
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function requestWithFallback(path, options = {}) {
  const attempts = isRetriableRequest(options) ? 3 : 1;
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        // Gửi kèm JSESSIONID để order-service nhận diện giỏ hàng của guest.
        credentials: "include",
        ...options,
      });
      if (response.status >= 500 && attempt < attempts - 1) {
        lastError = new Error(response.statusText || "Server error");
        await wait(350 * (attempt + 1));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt >= attempts - 1) {
        throw error;
      }
      await wait(350 * (attempt + 1));
    }
  }

  throw lastError;
}

async function handleResponse(response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.message || response.statusText || "Lỗi khi gọi API");
  }
  return data;
}

export async function getCart() {
  const response = await requestWithFallback("/cart", {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  return handleResponse(response);
}

export async function addCartItem(item) {
  const response = await requestWithFallback("/cart/items", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(item),
  });
  return handleResponse(response);
}

export async function updateCartItem(productId, quantity) {
  const response = await requestWithFallback(`/cart/items/${productId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ quantity }),
  });
  return handleResponse(response);
}

export async function removeCartItem(productId) {
  const response = await requestWithFallback(`/cart/items/${productId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function clearCart() {
  const response = await requestWithFallback("/cart", {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function notifyCartOnLogin(userId) {
  // Sau khi đăng nhập, yêu cầu order-service gộp giỏ guest hiện tại vào giỏ user.
  const response = await requestWithFallback("/cart/session/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ userId }),
  });
  return handleResponse(response);
}

export async function notifyCartOnLogout() {
  const response = await requestWithFallback("/cart/session/logout", {
    method: "POST",
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function createOrder(orderData) {
  const response = await requestWithFallback("/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(orderData),
  });
  return handleResponse(response);
}

function buildOrderQuery({ page, size, status, date, direction } = {}) {
  const params = new URLSearchParams();
  if (page != null) params.set("page", page);
  if (size != null) params.set("size", size);
  if (status && status !== "ALL") params.set("status", status);
  if (date) params.set("date", date);
  if (direction) params.set("direction", direction);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function getOrdersByUser(userId, options = {}) {
  const response = await requestWithFallback(`/orders/user/${userId}${buildOrderQuery(options)}`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  return handleResponse(response);
}

export async function getAllOrders(options = {}) {
  const response = await requestWithFallback(`/orders${buildOrderQuery(options)}`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  return handleResponse(response);
}

export async function getOrder(orderId) {
  const response = await requestWithFallback(`/orders/${orderId}`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  return handleResponse(response);
}

export async function getOrderComments(orderId) {
  const response = await requestWithFallback(`/orders/${orderId}/comments`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  return handleResponse(response);
}

export async function getOrderProductDetail(userId, productId) {
  const params = new URLSearchParams();
  if (userId) {
    params.set("userId", userId);
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await requestWithFallback(
    `/orders/products/${productId}/details${query}`,
    {
      headers: getAuthHeaders(),
      cache: "no-store",
    },
  );
  return handleResponse(response);
}

export async function getProductDetailWithComments(productId) {
  const response = await requestWithFallback(
    `/admin/products/${productId}/details-with-comments`,
    {
      headers: getAuthHeaders(),
      cache: "no-store",
    },
  );
  return handleResponse(response);
}

export async function checkProductOrderHistory(productId) {
  const response = await requestWithFallback(
    `/admin/products/${productId}/orders-exist`,
    {
      headers: getAuthHeaders(),
      cache: "no-store",
    },
  );
  const data = await handleResponse(response);
  return data?.hasOrders ?? false;
}

export async function addProductComment(userId, productId, commentData) {
  const response = await requestWithFallback(
    `/orders/users/${userId}/products/${productId}/comments`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(commentData),
    },
  );
  return handleResponse(response);
}

export async function updateOrderStatus(orderId, status) {
  const response = await requestWithFallback(`/orders/${orderId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ status }),
  });
  return handleResponse(response);
}

export async function cancelOrder(orderId, reason = "Customer cancelled") {
  const response = await requestWithFallback(`/orders/${orderId}/cancel`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ status: reason }),
  });
  return handleResponse(response);
}

export default {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
  createOrder,
  getOrdersByUser,
  getAllOrders,
  getOrder,
  getOrderComments,
  getOrderProductDetail,
  getProductDetailWithComments,
  checkProductOrderHistory,
  addProductComment,
  updateOrderStatus,
  cancelOrder,
  notifyCartOnLogin,
  notifyCartOnLogout,
};
