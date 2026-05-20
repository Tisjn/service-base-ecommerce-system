import axios from "axios";

const API_GATEWAY_URL =
  import.meta.env.VITE_API_GATEWAY_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:8081";
const AI_API_BASE_URL = `${API_GATEWAY_URL.replace(/\/+$/, "")}/api/ai`;

function getToken() {
  return localStorage.getItem("authToken") || "";
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const aiClient = axios.create({
  baseURL: AI_API_BASE_URL,
  timeout: 60000,
});

export async function askAiAssistant(question) {
  const response = await aiClient.post(
    "/ask",
    { question },
    { headers: authHeaders() },
  );
  return response.data;
}

export function getAiRetryAfterSeconds(error) {
  const serverValue = Number(error?.response?.data?.retryAfterSeconds);
  if (Number.isFinite(serverValue) && serverValue > 0) {
    return Math.ceil(serverValue);
  }

  const rawMessage = String(
    error?.response?.data?.message || error?.message || "",
  );
  const retryMatch = rawMessage.match(/retry in\s+([0-9]+(?:\.[0-9]+)?)s/i);
  if (retryMatch) {
    return Math.max(1, Math.ceil(Number(retryMatch[1])));
  }

  return error?.response?.status === 429 ? 30 : 0;
}

export function getAiErrorMessage(error) {
  const retryAfterSeconds = getAiRetryAfterSeconds(error);
  if (
    retryAfterSeconds ||
    error?.response?.data?.code === "AI_QUOTA_EXCEEDED"
  ) {
    return `AI đang hết lượt gọi Gemini miễn phí. Vui lòng thử lại sau khoảng ${
      retryAfterSeconds || 30
    } giây.`;
  }

  return (
    error?.response?.data?.message ||
    error?.message ||
    "Không kết nối được trợ lý AI."
  );
}
