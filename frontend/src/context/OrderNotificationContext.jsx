import { createContext, useContext, useEffect, useState } from "react";
import useOrderSocket from "../hooks/useOrderSocket";

const OrderNotificationContext = createContext(null);

export function OrderNotificationProvider({ user, children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastNotification, setLastNotification] = useState(null);
  const [openedOrderId, setOpenedOrderId] = useState(null);

  const isAdmin = String(user?.role || user?.roles?.[0] || "")
    .toUpperCase()
    .includes("ADMIN");

  // only subscribe when admin
  useOrderSocket(
    isAdmin
      ? (orderSummary) => {
          if (!orderSummary) return;
          const item = {
            id: `${Date.now()}-${orderSummary.orderId || orderSummary.id || ""}`,
            orderId: orderSummary.orderId || orderSummary.id,
            total: orderSummary.totalAmount || orderSummary.total || 0,
            createdAt: orderSummary.createdAt || new Date().toISOString(),
          };
          setNotifications((prev) => [item, ...prev].slice(0, 50));
          setUnreadCount((c) => c + 1);
          setLastNotification(item);
        }
      : null,
  );

  function markAllRead() {
    setUnreadCount(0);
  }

  function openOrder(orderId) {
    setOpenedOrderId(String(orderId));
  }

  function closeOrder() {
    setOpenedOrderId(null);
  }

  useEffect(() => {
    // optionally persist or handle lifecycle here
  }, []);

  return (
    <OrderNotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        lastNotification,
        markAllRead,
        openedOrderId,
        openOrder,
        closeOrder,
      }}
    >
      {children}
    </OrderNotificationContext.Provider>
  );
}

export function useOrderNotifications() {
  return useContext(OrderNotificationContext);
}
