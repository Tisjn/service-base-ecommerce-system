const API_GATEWAY_URL =
  import.meta.env.VITE_API_GATEWAY_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:3003";
const ORDER_SERVICE_URL =
  import.meta.env.VITE_ORDER_SERVICE_URL || "http://localhost:3004";
const PRODUCT_SERVICE_URL =
  import.meta.env.VITE_PRODUCT_SERVICE_URL || "http://localhost:3003";
const API_BASE_URL = `${API_GATEWAY_URL.replace(/\/$/, "")}/api`;
const ORDER_API_BASE_URL = `${ORDER_SERVICE_URL.replace(/\/$/, "")}/api`;
const PRODUCT_SERVICE_FALLBACK_URLS = (
  import.meta.env.VITE_PRODUCT_SERVICE_FALLBACK_URLS || "http://localhost:8082"
)
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);
const PRODUCT_API_BASE_URLS = [
  PRODUCT_SERVICE_URL,
  ...PRODUCT_SERVICE_FALLBACK_URLS,
]
  .map((url) => `${url.replace(/\/$/, "")}/api`)
  .filter((url, index, urls) => urls.indexOf(url) === index);

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

function generateGuestToken() {
  return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function shouldFallbackToDirectApi(error) {
  return Boolean(
    API_GATEWAY_URL &&
    (error?.name === "TypeError" ||
      error?.message === "Failed to fetch" ||
      error?.code === "ECONNREFUSED"),
  );
}

async function requestWithFallback(path, options = {}, service = "order") {
  const directBaseUrls =
    service === "product" ? PRODUCT_API_BASE_URLS : [ORDER_API_BASE_URL];

  try {
    for (const baseUrl of directBaseUrls) {
      try {
        return await fetch(`${baseUrl}${path}`, options);
      } catch {
        // Try next direct service URL before gateway fallback.
      }
    }
    throw new Error("Direct service unavailable");
  } catch (error) {
    if (!API_GATEWAY_URL) {
      throw error;
    }
    try {
      return await fetch(`${API_BASE_URL}${path}`, options);
    } catch {
      const serviceName =
        service === "product" ? "product-service" : "order-service";
      const serviceUrl =
        service === "product"
          ? PRODUCT_API_BASE_URLS.join(", ")
          : ORDER_SERVICE_URL;
      throw new Error(
        `Không kết nối được ${serviceName}. Kiểm tra service đang chạy tại ${serviceUrl}.`,
      );
    }
  }
}

async function handleResponse(response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.message || response.statusText || "Lỗi khi gọi API");
  }
  return data;
}

export async function getCart(userId, guestToken) {
  const response = await requestWithFallback(
    `/cart/${userId}`,
    {
      headers: getAuthHeaders(guestToken),
      cache: "no-store",
    },
    "product",
  );
  return handleResponse(response);
}

export async function addCartItem(userId, item, guestToken) {
  const response = await requestWithFallback(
    `/cart/${userId}/items`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(guestToken),
      },
      body: JSON.stringify(item),
    },
    "product",
  );
  return handleResponse(response);
}

export async function updateCartItem(userId, productId, quantity, guestToken) {
  const response = await requestWithFallback(
    `/cart/${userId}/items/${productId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(guestToken),
      },
      body: JSON.stringify({ quantity }),
    },
    "product",
  );
  return handleResponse(response);
}

export async function removeCartItem(userId, productId, guestToken) {
  const response = await requestWithFallback(
    `/cart/${userId}/items/${productId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(guestToken),
    },
    "product",
  );
  return handleResponse(response);
}

export async function mergeGuestCart(guestToken) {
  const response = await requestWithFallback(
    "/cart/merge",
    {
      method: "POST",
      headers: getAuthHeaders(guestToken),
    },
    "product",
  );
  return handleResponse(response);
}

export async function clearCart(userId) {
  const response = await requestWithFallback(
    `/cart/${userId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    },
    "product",
  );
  return handleResponse(response);
}

export async function createOrder(userId, orderData) {
  const response = await requestWithFallback(`/orders?userId=${userId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(orderData),
  });
  return handleResponse(response);
}

export async function getOrdersByUser(userId) {
  const response = await requestWithFallback(`/orders/user/${userId}`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  return handleResponse(response);
}

export async function getAllOrders() {
  const response = await requestWithFallback("/orders", {
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
  addProductComment,
  updateOrderStatus,
  cancelOrder,
  mergeGuestCart,
  generateGuestToken,
};
