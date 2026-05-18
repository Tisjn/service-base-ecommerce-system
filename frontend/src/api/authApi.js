import axios from "axios";

const gatewayUrl =
  import.meta.env.VITE_API_GATEWAY_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:8081";
const gatewayBase = `${gatewayUrl.replace(/\/+$/, "")}/api`;

const authApi = axios.create({
  baseURL: gatewayBase,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

async function postWithFallback(path, data, config = {}) {
  const response = await authApi.post(path, data, config);
  return response.data;
}

async function getWithFallback(path, config = {}) {
  const response = await authApi.get(path, config);
  return response.data;
}

async function putWithFallback(path, data, config = {}) {
  const response = await authApi.put(path, data, config);
  return response.data;
}

async function deleteWithFallback(path, config = {}) {
  const response = await authApi.delete(path, config);
  return response.data;
}

export async function loginUser(email, password) {
  return postWithFallback("/auth/login", { email, password });
}

export async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append("avatar", file);

  return postWithFallback("/auth/upload-avatar", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}

export async function registerUser(fullName, email, password, avatarUrl) {
  return postWithFallback("/auth/register", {
    fullName,
    email,
    password,
    avatarUrl,
  });
}

export async function verifyRegisterOtp(email, otp) {
  return postWithFallback("/auth/register/verify", {
    email,
    otp,
  });
}

export async function getProfile(accessToken) {
  return getWithFallback("/auth/profile", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function updateProfile(accessToken, profileData) {
  return putWithFallback("/auth/profile", profileData, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function updateProfileAvatar(accessToken, file) {
  const formData = new FormData();
  formData.append("avatar", file);

  return postWithFallback("/auth/profile/avatar", formData, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "multipart/form-data",
    },
  });
}

export async function deleteProfileAvatar(accessToken) {
  return deleteWithFallback("/auth/profile/avatar", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function forgotPassword(email) {
  return postWithFallback("/auth/password/forgot", { email });
}

export async function resetPassword(email, otp, newPassword) {
  return postWithFallback("/auth/password/reset", {
    email,
    otp,
    newPassword,
  });
}

export async function refreshAccessToken(refreshToken) {
  return postWithFallback("/auth/refresh", { refreshToken });
}
