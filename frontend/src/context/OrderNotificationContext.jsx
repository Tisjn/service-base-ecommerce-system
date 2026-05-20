import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import useOrderSocket from "../hooks/useOrderSocket";

const OrderNotificationContext = createContext(null);

export function OrderNotificationProvider({ user, children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastNotification, setLastNotification] = useState(null);
  const [openedOrderId, setOpenedOrderId] = useState(null);
  const notifiedOrderIdsRef = useRef(new Set());

  const isAdmin = String(user?.role || user?.roles?.[0] || "")
    .toUpperCase()
    .includes("ADMIN");

  const handleNewOrder = useCallback((orderSummary) => {
    if (!orderSummary) return;

    const orderId = orderSummary.orderId || orderSummary.id;
    if (!orderId) return;

    const orderKey = String(orderId);
    if (notifiedOrderIdsRef.current.has(orderKey)) return;
    notifiedOrderIdsRef.current.add(orderKey);

    const item = {
      id: `${Date.now()}-${orderId}`,
      orderId,
      orderCode: orderSummary.orderCode || null,
      userId: orderSummary.userId || null,
      total: Number(orderSummary.totalAmount || orderSummary.total || 0),
      createdAt: orderSummary.createdAt || new Date().toISOString(),
    };

    setNotifications((prev) => {
      const withoutDuplicate = prev.filter(
        (notification) => String(notification.orderId) !== orderKey,
      );
      return [item, ...withoutDuplicate].slice(0, 50);
    });
    setUnreadCount((count) => count + 1);
    setLastNotification(item);
  }, []);

  useOrderSocket(isAdmin ? handleNewOrder : null);

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
