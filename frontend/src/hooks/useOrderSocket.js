import { useEffect } from "react";
import SockJS from "sockjs-client";

const NEW_ORDER_TOPIC = "/topic/new_order";
const DEFAULT_SOCKJS_TRANSPORTS = ["xhr-polling"];

function parseStompBody(frame) {
  const [, body = ""] = frame.split("\n\n");
  return body.replace(/\u0000$/, "");
}

// Minimal STOMP-over-SockJS implementation sufficient for subscribing to topics.
export default function useOrderSocket(onMessage, options = {}) {
  useEffect(() => {
    if (typeof onMessage !== "function") {
      return undefined;
    }

    const topics = Array.isArray(options.topics) && options.topics.length > 0
      ? options.topics
      : [NEW_ORDER_TOPIC];

    const gateway =
      import.meta.env.VITE_ORDER_WS_URL ||
      import.meta.env.VITE_API_GATEWAY_URL ||
      import.meta.env.VITE_API_URL ||
      "http://localhost:8081";
    const transports = (import.meta.env.VITE_ORDER_WS_TRANSPORTS || "")
      .split(",")
      .map((transport) => transport.trim())
      .filter(Boolean);

    let sock;
    let connected = false;
    let closedByEffect = false;
    let reconnectTimer;
    const subPrefix = `sub-${Date.now()}`;

    function sendFrame(frame) {
      try {
        if (sock?.readyState === 1) {
          sock.send(frame);
        }
      } catch (err) {
        console.warn("Order WebSocket send failed", err);
      }
    }

    function connect() {
      sock = new SockJS(`${gateway.replace(/\/$/, "")}/ws`, null, {
        transports: transports.length > 0 ? transports : DEFAULT_SOCKJS_TRANSPORTS,
      });

      sock.onopen = () => {
        sendFrame("CONNECT\naccept-version:1.2\nheart-beat:10000,10000\n\n\u0000");
      };

      sock.onmessage = (event) => {
        const text = typeof event.data === "string" ? event.data : "";
        const idx = text.indexOf("\n");
        if (idx === -1) return;
        const command = text.substring(0, idx).trim();

        if (command === "CONNECTED") {
          connected = true;
          topics.forEach((topic, index) => {
            sendFrame(`SUBSCRIBE\nid:${subPrefix}-${index}\ndestination:${topic}\n\n\u0000`);
          });
          return;
        }

        if (command === "MESSAGE") {
          try {
            onMessage(JSON.parse(parseStompBody(text)));
          } catch (err) {
            console.warn("Invalid order WebSocket payload", err);
          }
          return;
        }

        if (command === "ERROR") {
          console.warn("Order WebSocket STOMP error", text);
        }
      };

      sock.onclose = () => {
        connected = false;
        if (!closedByEffect) {
          reconnectTimer = window.setTimeout(connect, 3000);
        }
      };
    }

    connect();

    return () => {
      closedByEffect = true;
      window.clearTimeout(reconnectTimer);
      try {
        if (connected) {
          topics.forEach((_, index) => {
            sendFrame(`UNSUBSCRIBE\nid:${subPrefix}-${index}\n\n\u0000`);
          });
          sendFrame("DISCONNECT\n\n\u0000");
        }
      } catch (err) {
        console.warn("Order WebSocket disconnect failed", err);
      }
      try {
        sock?.close();
      } catch (err) {
        console.warn("Order WebSocket close failed", err);
      }
    };
  }, [onMessage, options.topics]);
}
