import axios from "axios";

const CHAT_SERVICE_URL =
  import.meta.env.VITE_API_GATEWAY_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:8081";
const CHAT_API_BASE_URL = `${CHAT_SERVICE_URL.replace(/\/+$/, "")}/chat`;
const SOCKET_IO_CLIENT_SRC = "/socket.io.min.js";

function getToken() {
  return localStorage.getItem("authToken") || "";
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const chatClient = axios.create({
  baseURL: CHAT_API_BASE_URL,
  timeout: 15000,
});

export async function createChatRoom() {
  const response = await chatClient.post("/rooms", null, {
    headers: authHeaders(),
  });
  return response.data;
}

export async function getChatRooms(status) {
  const response = await chatClient.get("/rooms", {
    params: status ? { status } : undefined,
    headers: authHeaders(),
  });
  return response.data;
}

export async function joinChatRoom(roomId) {
  const response = await chatClient.put(`/rooms/${roomId}/join`, null, {
    headers: authHeaders(),
  });
  return response.data;
}

export async function closeChatRoom(roomId) {
  const response = await chatClient.put(`/rooms/${roomId}/close`, null, {
    headers: authHeaders(),
  });
  return response.data;
}

export async function getRoomMessages(roomId, options = {}) {
  const response = await chatClient.get(`/rooms/${roomId}/messages`, {
    params: options,
    headers: authHeaders(),
  });
  return response.data;
}

export async function uploadChatFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await chatClient.post("/upload", formData, {
    headers: {
      ...authHeaders(),
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

let socketIoClientPromise = null;

function loadSocketIoClient() {
  if (window.io) {
    return Promise.resolve(window.io);
  }

  if (socketIoClientPromise) {
    return socketIoClientPromise;
  }

  socketIoClientPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      `script[src="${SOCKET_IO_CLIENT_SRC}"]`,
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.io), {
        once: true,
      });
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = SOCKET_IO_CLIENT_SRC;
    script.async = true;
    script.onload = () => {
      if (window.io) {
        resolve(window.io);
        return;
      }
      reject(new Error("Socket.io client is not available"));
    };
    script.onerror = () => reject(new Error("Cannot load Socket.io client"));
    document.head.appendChild(script);
  });

  return socketIoClientPromise;
}

export function createChatSocket() {
  const token = getToken();
  let socket = null;
  let shouldConnect = false;
  const pendingHandlers = [];
  const pendingEmits = [];

  const ensureSocket = () =>
    loadSocketIoClient().then((io) => {
      if (!socket) {
        socket = io(CHAT_SERVICE_URL, {
          auth: { token },
          transports: ["websocket", "polling"],
          autoConnect: false,
        });

        pendingHandlers.splice(0).forEach(([eventName, handler]) => {
          socket.on(eventName, handler);
        });
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
    disconnect() {
      shouldConnect = false;
      socket?.disconnect();
      return proxy;
    },
  };

  return proxy;
}

export function resolveAbsoluteChatUrl(fileUrl) {
  if (!fileUrl || /^https?:\/\//i.test(fileUrl)) {
    return fileUrl;
  }
  return `${CHAT_SERVICE_URL.replace(/\/+$/, "")}${fileUrl}`;
}
