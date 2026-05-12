import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

const authApi = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

export async function loginUser(email, password) {
  const response = await authApi.post("/auth/login", { email, password });
  return response.data;
}

export async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append("avatar", file);

  const response = await authApi.post("/auth/upload-avatar", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function registerUser(fullName, email, password, avatarUrl) {
  const response = await authApi.post("/auth/register", {
    fullName,
    email,
    password,
    avatarUrl,
  });
  return response.data;
}

export async function verifyRegisterOtp(email, otp) {
  const response = await authApi.post("/auth/register/verify", {
    email,
    otp,
  });
  return response.data;
}

export async function getProfile(accessToken) {
  const response = await authApi.get("/auth/profile", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data;
}

export async function forgotPassword(email) {
  const response = await authApi.post("/auth/password/forgot", { email });
  return response.data;
}

export async function resetPassword(email, otp, newPassword) {
  const response = await authApi.post("/auth/password/reset", {
    email,
    otp,
    newPassword,
  });
  return response.data;
}
