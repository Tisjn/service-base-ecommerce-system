const API_GATEWAY_URL =
  import.meta.env.VITE_API_GATEWAY_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:8081";
const API_BASE_URL = `${API_GATEWAY_URL.replace(/\/$/, "")}/api`;
const PRODUCT_CACHE_TTL_MS = 60_000;
const CATEGORY_CACHE_TTL_MS = 5 * 60_000;
const responseCache = new Map();
const inFlightRequests = new Map();

function getAuthHeaders() {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
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
      const response = await fetch(`${API_BASE_URL}${path}`, options);
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

function getCacheScope() {
  return localStorage.getItem("authToken") || "guest";
}

function getCachedValue(key) {
  const cached = responseCache.get(key);
  if (!cached || cached.expiresAt <= Date.now()) {
    responseCache.delete(key);
    return null;
  }
  return cached.data;
}

async function cachedGet(path, { ttl = PRODUCT_CACHE_TTL_MS, force = false } = {}) {
  const key = `${getCacheScope()}:${path}`;
  if (!force) {
    const cached = getCachedValue(key);
    if (cached) {
      return cached;
    }
    if (inFlightRequests.has(key)) {
      return inFlightRequests.get(key);
    }
  }

  const request = requestWithFallback(path, {
    headers: getAuthHeaders(),
  })
    .then(handleResponse)
    .then((data) => {
      responseCache.set(key, {
        data,
        expiresAt: Date.now() + ttl,
      });
      return data;
    })
    .finally(() => {
      inFlightRequests.delete(key);
    });

  inFlightRequests.set(key, request);
  return request;
}

function invalidateProductCache() {
  for (const key of responseCache.keys()) {
    if (key.includes(":/products") || key.includes(":/categories")) {
      responseCache.delete(key);
    }
  }
}

export async function getProducts({
  page = 0,
  size = 20,
  search = "",
  categoryId,
  minPrice,
  maxPrice,
  status,
  sortBy = "createdAt",
  direction = "desc",
} = {}) {
  const params = new URLSearchParams();
  params.set("page", page);
  params.set("size", size);
  if (search) params.set("search", search);
  if (categoryId) params.set("categoryId", categoryId);
  if (minPrice != null) params.set("minPrice", minPrice);
  if (maxPrice != null) params.set("maxPrice", maxPrice);
  if (status) params.set("status", status);
  params.set("sortBy", sortBy);
  params.set("direction", direction);

  return cachedGet(`/products?${params.toString()}`);
}

export async function getCategories() {
  return cachedGet("/categories", { ttl: CATEGORY_CACHE_TTL_MS });
}

export async function getProduct(productId) {
  return cachedGet(`/products/${productId}`);
}

export async function createCategory(categoryData) {
  const response = await requestWithFallback("/categories", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(categoryData),
    cache: "no-store",
  });
  const data = await handleResponse(response);
  invalidateProductCache();
  return data;
}

export async function updateCategory(categoryId, categoryData) {
  const response = await requestWithFallback(`/categories/${categoryId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(categoryData),
    cache: "no-store",
  });
  const data = await handleResponse(response);
  invalidateProductCache();
  return data;
}

export async function deleteCategory(categoryId) {
  const response = await requestWithFallback(`/categories/${categoryId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  const data = await handleResponse(response);
  invalidateProductCache();
  return data;
}

export async function createProduct(productData) {
  const response = await requestWithFallback("/products", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(productData),
  });
  const data = await handleResponse(response);
  invalidateProductCache();
  return data;
}

export async function updateProduct(productId, productData) {
  const response = await requestWithFallback(`/products/${productId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(productData),
  });
  const data = await handleResponse(response);
  invalidateProductCache();
  return data;
}

export async function deleteProduct(productId) {
  const response = await requestWithFallback(`/products/${productId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  const data = await handleResponse(response);
  invalidateProductCache();
  return data;
}

export async function restoreProduct(productId) {
  const response = await requestWithFallback(`/products/${productId}/restore`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });
  const data = await handleResponse(response);
  invalidateProductCache();
  return data;
}

export async function permanentlyDeleteProduct(productId) {
  const response = await requestWithFallback(`/products/${productId}/permanent`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  const data = await handleResponse(response);
  invalidateProductCache();
  return data;
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

export default {
  getProducts,
  getProduct,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  restoreProduct,
  permanentlyDeleteProduct,
  getProductDetailWithComments,
};
