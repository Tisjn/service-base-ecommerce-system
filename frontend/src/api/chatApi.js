import axios from "axios";
import { io } from "socket.io-client";

const CHAT_SERVICE_URL =
  import.meta.env.VITE_API_GATEWAY_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:8081";
const CHAT_API_BASE_URL = `${CHAT_SERVICE_URL.replace(/\/+$/, "")}/chat`;
const CHAT_SOCKET_URL =
  import.meta.env.VITE_CHAT_SOCKET_URL || resolveSocketOrigin(CHAT_SERVICE_URL);
const CHAT_SOCKET_PATH = import.meta.env.VITE_CHAT_SOCKET_PATH || "/socket.io";
const CHAT_SOCKET_TRANSPORTS = (
  import.meta.env.VITE_CHAT_SOCKET_TRANSPORTS || "polling"
)
  .split(",")
  .map((transport) => transport.trim())
  .filter(Boolean);
// All socket traffic should go through the API gateway (VITE_API_GATEWAY_URL)

function resolveSocketOrigin(value) {
  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return value;
  }
}

function getToken() {
  return localStorage.getItem("authToken") || "";
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const chatClient = axios.create({
  baseURL: CHAT_API_BASE_URL,
  timeout: 30000,
});

function waitForSocketConnection(socket, timeoutMs) {
  if (!socket) {
    return Promise.reject(new Error("Socket chua san sang"));
  }

  if (
    typeof socket.connected === "function"
      ? socket.connected()
      : socket.connected
  ) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("Socket chua ket noi"));
    }, timeoutMs);

    function cleanup() {
      window.clearTimeout(timer);
      socket.off?.("connect", handleConnect);
      socket.off?.("connect_error", handleError);
      socket.off?.("disconnect", handleDisconnect);
    }

    function handleConnect() {
      cleanup();
      resolve();
    }

    function handleError(error) {
      cleanup();
      reject(error || new Error("Socket ket noi that bai"));
    }

    function handleDisconnect(reason) {
      if (reason === "io server disconnect") {
        cleanup();
        reject(new Error("Socket bi ngat ket noi"));
      }
    }

    socket.on("connect", handleConnect);
    socket.on("connect_error", handleError);
    socket.on("disconnect", handleDisconnect);
    socket.connect?.();
  });
}

async function requestWithRetry(requestFn, attempts = 2) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;
      const retriable =
        !status || status >= 500 || error?.message === "Network Error";
      if (!retriable || attempt === attempts - 1) {
        throw error;
      }
      await new Promise((resolve) =>
        window.setTimeout(resolve, 250 * (attempt + 1)),
      );
    }
  }
  throw lastError;
}

export async function createChatRoom() {
  const response = await requestWithRetry(() =>
    chatClient.post("/rooms", null, {
      headers: authHeaders(),
    }),
  );
  return response.data;
}

export async function getChatRooms(status) {
  const response = await requestWithRetry(() =>
    chatClient.get("/rooms", {
      params: status ? { status } : undefined,
      headers: authHeaders(),
    }),
  );
  return response.data;
}

export async function joinChatRoom(roomId) {
  const response = await requestWithRetry(() =>
    chatClient.put(`/rooms/${roomId}/join`, null, {
      headers: authHeaders(),
    }),
  );
  return response.data;
}

export async function closeChatRoom(roomId) {
  const response = await requestWithRetry(() =>
    chatClient.put(`/rooms/${roomId}/close`, null, {
      headers: authHeaders(),
    }),
  );
  return response.data;
}

export async function reopenChatRoom(roomId) {
  const response = await requestWithRetry(() =>
    chatClient.put(`/rooms/${roomId}/reopen`, null, {
      headers: authHeaders(),
    }),
  );
  return response.data;
}

export async function getRoomMessages(roomId, options = {}) {
  const response = await requestWithRetry(() =>
    chatClient.get(`/rooms/${roomId}/messages`, {
      params: options,
      headers: authHeaders(),
    }),
  );
  return response.data;
}

export async function uploadChatFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await requestWithRetry(() =>
    chatClient.post("/upload", formData, {
      headers: {
        ...authHeaders(),
        "Content-Type": "multipart/form-data",
      },
    }),
  );
  return response.data;
}
// tạo kết nối socket và đăng ký sự kiện, trả về một đối tượng proxy để tương tác với socket mà không cần lo lắng về trạng thái kết nối
export function createChatSocket() {
  const token = getToken();
  let socket = null;
  let shouldConnect = false;
  const pendingHandlers = [];
  const pendingEmits = [];
  // đảm bảo socket được tạo và kết nối khi cần thiết, đồng thời xử lý các sự kiện và emit đã đăng ký trước đó
  const ensureSocket = () =>
    Promise.resolve().then(() => {
      if (!socket) {
        socket = io(CHAT_SOCKET_URL, {
          auth: { token },
          path: CHAT_SOCKET_PATH,
          transports: CHAT_SOCKET_TRANSPORTS,
          autoConnect: false,
        });

        pendingHandlers.splice(0).forEach(([eventName, handler]) => {
          socket.on(eventName, handler);
        });

        // helpful debug logs for connection issues
        socket.on("connect", () =>
          console.debug("chat socket connected", {
            url: CHAT_SOCKET_URL,
            path: CHAT_SOCKET_PATH,
            id: socket.id,
          }),
        );
        socket.on("connect_error", (err) =>
          console.error("chat socket connect_error", err),
        );
        socket.on("reconnect_attempt", (count) =>
          console.debug("chat socket reconnect_attempt", count),
        );
        socket.on("disconnect", (reason) =>
          console.debug("chat socket disconnect", reason),
        );
      }

      if (shouldConnect && !socket.connected) {
        socket.connect();
      }

      pendingEmits.splice(0).forEach(([eventName, args]) => {
        socket.emit(eventName, ...args);
      });

      return socket;
    });

  const proxy = {
    on(eventName, handler) {
      if (socket) {
        socket.on(eventName, handler);
      } else {
        pendingHandlers.push([eventName, handler]);
        ensureSocket().catch(() => {});
      }
      return proxy;
    },
    off(eventName, handler) {
      if (socket) {
        socket.off(eventName, handler);
      } else {
        const index = pendingHandlers.findIndex(
          ([pendingEventName, pendingHandler]) =>
            pendingEventName === eventName && pendingHandler === handler,
        );
        if (index >= 0) {
          pendingHandlers.splice(index, 1);
        }
      }
      return proxy;
    },
    emit(eventName, ...args) {
      if (socket) {
        socket.emit(eventName, ...args);
      } else {
        pendingEmits.push([eventName, args]);
        ensureSocket().catch(() => {});
      }
      return proxy;
    },
    connect() {
      shouldConnect = true;
      ensureSocket().catch(() => {});
      return proxy;
    },
    connected() {
      return Boolean(socket?.connected);
    },
    disconnect() {
      shouldConnect = false;
      socket?.disconnect();
      return proxy;
    },
  };

  return proxy;
}

export function emitChatEvent(socket, eventName, payload, timeoutMs = 8000) {
  return waitForSocketConnection(socket, timeoutMs).then(
    () =>
      new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => {
          reject(new Error("Socket không phản hồi"));
        }, timeoutMs);

        socket.emit(eventName, payload, (ack = {}) => {
          window.clearTimeout(timer);
          if (ack.ok === false) {
            reject(new Error(ack.message || "Socket bi loi"));
            return;
          }
          resolve(ack);
        });
      }),
  );
}

export function emitChatEventNoAck(
  socket,
  eventName,
  payload,
  timeoutMs = 8000,
) {
  return waitForSocketConnection(socket, timeoutMs).then(() => {
    if (!socket) {
      throw new Error("Socket chua san sang");
    }
    socket.emit(eventName, payload);
  });
}

export function resolveAbsoluteChatUrl(fileUrl) {
  if (!fileUrl || /^https?:\/\//i.test(fileUrl)) {
    return fileUrl;
  }
  return `${CHAT_SERVICE_URL.replace(/\/+$/, "")}${fileUrl}`;
}
