import { useState, useEffect } from "react";
import LoginPage from "./pages/auth/LoginPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import {
  OrderNotificationProvider,
  useOrderNotifications,
} from "./context/OrderNotificationContext";
import OrderToast from "./pages/customer/orders/components/OrderToast";
import { refreshAccessToken } from "./api/authApi.js";
import * as orderApi from "./api/orderApi.js";

function App() {
  const [authToken, setAuthToken] = useState(
    localStorage.getItem("authToken") || "",
  );
  const [refreshToken, setRefreshToken] = useState(
    localStorage.getItem("authRefreshToken") || "",
  );
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("authUser");
    return stored ? JSON.parse(stored) : null;
  });
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    const isTokenExpired = (token) => {
      if (!token) {
        return true;
      }

      try {
        const [, payload] = token.split(".");
        const decoded = JSON.parse(atob(payload));
        return Date.now() >= decoded.exp * 1000;
      } catch (error) {
        return true;
      }
    };

    if (!refreshToken) {
      return;
    }

    if (!authToken || isTokenExpired(authToken)) {
      refreshAccessToken(refreshToken)
        .then((data) => {
          if (data?.accessToken) {
            localStorage.setItem("authToken", data.accessToken);
            setAuthToken(data.accessToken);
          }
        })
        .catch(() => {
          localStorage.removeItem("authToken");
          localStorage.removeItem("authRefreshToken");
          localStorage.removeItem("authUser");
          setAuthToken("");
          setRefreshToken("");
          setUser(null);
        });
    }
  }, [authToken, refreshToken]);

  const handleLogin = async (token, refresh, userData) => {
    localStorage.setItem("authToken", token);
    localStorage.setItem("authRefreshToken", refresh);
    localStorage.setItem("authUser", JSON.stringify(userData || {}));
    setAuthToken(token);
    setRefreshToken(refresh);
    setUser(userData || null);
    setShowLogin(false);
    // Note: Guest cart merge is handled in CustomerOrderHubPage useEffect
    // when it detects userId change and guestToken exists
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authRefreshToken");
    localStorage.removeItem("authUser");
    setAuthToken("");
    setRefreshToken("");
    setUser(null);
  };

  const handleRequestLogin = () => {
    setShowLogin(true);
  };

  const handleCloseLogin = () => {
    setShowLogin(false);
  };

  const handleUserUpdate = (userData) => {
    const nextUser = { ...(user || {}), ...(userData || {}) };
    localStorage.setItem("authUser", JSON.stringify(nextUser));
    setUser(nextUser);
  };

  return showLogin ? (
    <LoginPage onLogin={handleLogin} onCancel={handleCloseLogin} />
  ) : (
    <OrderNotificationProvider user={user}>
      <Dashboard
        onLogout={handleLogout}
        onUserUpdate={handleUserUpdate}
        onRequestLogin={handleRequestLogin}
        user={user}
      />
      <AdminNotificationToast />
      <DeepLinkHandler />
    </OrderNotificationProvider>
  );
}

function DeepLinkHandler() {
  const { openOrder } = useOrderNotifications() || {};

  useEffect(() => {
    function checkPath() {
      try {
        const match = window.location.pathname.match(/^\/orders\/(.+)$/);
        if (match && match[1] && typeof openOrder === "function") {
          openOrder(decodeURIComponent(match[1]));
        }
      } catch {
        // ignore
      }
    }

    checkPath();
    window.addEventListener("popstate", checkPath);
    return () => window.removeEventListener("popstate", checkPath);
  }, [openOrder]);

  return null;
}

function AdminNotificationToast() {
  const { lastNotification } = useOrderNotifications() || {};
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!lastNotification) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 3500);
    return () => clearTimeout(t);
  }, [lastNotification]);

  if (!visible || !lastNotification) return null;

  return (
    <OrderToast
      notification={{
        type: "success",
        text: `Đơn hàng mới #${lastNotification.orderId} — ${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(lastNotification.total)}`,
      }}
      onClose={() => setVisible(false)}
    />
  );
}

export default App;
