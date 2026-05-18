const API_GATEWAY_URL =
  import.meta.env.VITE_API_GATEWAY_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:8081";
const API_BASE_URL = `${API_GATEWAY_URL.replace(/\/$/, "")}/api`;

function getAuthHeaders() {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function requestWithFallback(path, options = {}) {
  return fetch(`${API_BASE_URL}${path}`, options);
}

async function handleResponse(response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.message || response.statusText || "Lỗi khi gọi API");
  }
  return data;
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

  const response = await requestWithFallback(`/products?${params.toString()}`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  return handleResponse(response);
}

export async function getCategories() {
  const response = await requestWithFallback("/categories", {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  return handleResponse(response);
}

export async function getProduct(productId) {
  const response = await requestWithFallback(`/products/${productId}`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  return handleResponse(response);
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
  return handleResponse(response);
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
  return handleResponse(response);
}

export async function deleteCategory(categoryId) {
  const response = await requestWithFallback(`/categories/${categoryId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  return handleResponse(response);
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
  return handleResponse(response);
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
  return handleResponse(response);
}

export async function deleteProduct(productId) {
  const response = await requestWithFallback(`/products/${productId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
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
  getProductDetailWithComments,
};
