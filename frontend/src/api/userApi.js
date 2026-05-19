import axios from "axios";

const gatewayUrl = import.meta.env.VITE_API_GATEWAY_URL;
const userServiceUrl =
  import.meta.env.VITE_USER_SERVICE_URL || "http://localhost:3002";
const userApiBase = `${userServiceUrl.replace(/\/+$/, "")}`;
const gatewayBase = gatewayUrl ? `${gatewayUrl.replace(/\/+$/, "")}/api` : "";

const directUserApi = axios.create({
  baseURL: userApiBase,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

const gatewayUserApi = axios.create({
  baseURL: gatewayBase,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("authUser") || "{}");
  } catch {
    return {};
  }
}

function buildUserHeaders(accessToken) {
  const user = getStoredUser();
  const headers = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  if (user?.id || user?.userId) {
    headers["X-User-Id"] = String(user.id || user.userId);
  }
  if (user?.email) {
    headers["X-User-Email"] = user.email;
  }
  if (user?.role || user?.roles?.[0]) {
    headers["X-User-Role"] = user.role || user.roles[0];
  }
  return headers;
}

function shouldFallbackToGateway(error) {
  return Boolean(
    gatewayUrl &&
    (error?.code === "ERR_NETWORK" || error?.code === "ECONNABORTED"),
  );
}

async function requestWithFallback(method, path, accessToken, data) {
  const config = {
    headers: buildUserHeaders(accessToken),
  };

  try {
    const response = await directUserApi.request({
      method,
      url: path,
      data,
      ...config,
    });
    return response.data;
  } catch (error) {
    if (!shouldFallbackToGateway(error)) {
      throw error;
    }
    const response = await gatewayUserApi.request({
      method,
      url: path,
      data,
      ...config,
    });
    return response.data;
  }
}

export function getUserProfile(accessToken) {
  return requestWithFallback("get", "/users/me", accessToken);
}

export function updateUserProfile(accessToken, profileData) {
  return requestWithFallback("patch", "/users/me", accessToken, profileData);
}

export function getUserAddresses(accessToken) {
  return requestWithFallback("get", "/users/me/addresses", accessToken);
}

export function createUserAddress(accessToken, addressData) {
  return requestWithFallback(
    "post",
    "/users/me/addresses",
    accessToken,
    addressData,
  );
}

export function updateUserAddress(accessToken, addressId, addressData) {
  return requestWithFallback(
    "patch",
    `/users/me/addresses/${addressId}`,
    accessToken,
    addressData,
  );
}

export function deleteUserAddress(accessToken, addressId) {
  return requestWithFallback(
    "delete",
    `/users/me/addresses/${addressId}`,
    accessToken,
  );
}

// Admin functions (require admin credentials)
export function listUsers(status) {
  return requestWithFallback(
    "get",
    `/users${status ? `?status=${status}` : ""}`,
  );
}

export function getUserById(userId) {
  return requestWithFallback("get", `/users/${userId}`);
}

export function updateUserById(userId, data) {
  return requestWithFallback("patch", `/users/${userId}`, undefined, data);
}

export function updateUserStatusById(userId, status) {
  return requestWithFallback("patch", `/users/${userId}/status`, undefined, {
    status,
  });
}

export function deleteUserById(userId) {
  return requestWithFallback("delete", `/users/${userId}`);
}
