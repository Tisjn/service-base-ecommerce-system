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
