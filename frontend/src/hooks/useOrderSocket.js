import { useEffect } from "react";
import SockJS from "sockjs-client";

// Minimal STOMP-over-SockJS implementation sufficient for subscribing to a single topic
export default function useOrderSocket(onNewOrder) {
  useEffect(() => {
    const gateway =
      import.meta.env.VITE_API_GATEWAY_URL ||
      import.meta.env.VITE_API_URL ||
      "http://localhost:8081";
    const sock = new SockJS(`${gateway.replace(/\/$/, "")}/ws`);

    let connected = false;
    const subId = `sub-${Date.now()}`;

    function sendFrame(frame) {
      try {
        sock.send(frame);
      } catch (err) {
        // ignore
      }
    }

    sock.onopen = () => {
      // send CONNECT
      sendFrame("CONNECT\naccept-version:1.2\n\n\u0000");
    };

    sock.onmessage = (e) => {
      const text = typeof e.data === "string" ? e.data : "";
      const idx = text.indexOf("\n");
      if (idx === -1) return;
      const command = text.substring(0, idx).trim();

      if (command === "CONNECTED") {
        connected = true;
        // subscribe to topic
        sendFrame(
          `SUBSCRIBE\nid:${subId}\ndestination:/topic/new_order\n\n\u0000`,
        );
        return;
      }

      if (command === "MESSAGE") {
        // body follows after a blank line
        const parts = text.split("\n\n");
        const body = parts
          .slice(1)
          .join("\n\n")
          .replace(/\u0000$/, "");
        try {
          const payload = JSON.parse(body);
          onNewOrder && onNewOrder(payload);
        } catch (err) {
          // ignore parse error
        }
        return;
      }

      if (command === "ERROR") {
        console.warn("STOMP error", text);
        return;
      }
    };

    sock.onclose = () => {
      connected = false;
    };

    return () => {
      try {
        if (connected) {
          sendFrame(`UNSUBSCRIBE\nid:${subId}\n\n\u0000`);
          sendFrame("DISCONNECT\n\n\u0000");
        }
      } catch (err) {}
      try {
        sock.close();
      } catch (e) {}
    };
  }, [onNewOrder]);
}
