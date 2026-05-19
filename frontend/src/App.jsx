import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import {
  OrderNotificationProvider,
  useOrderNotifications,
} from "./context/OrderNotificationContext";
import OrderToast from "./pages/customer/orders/components/OrderToast";
import { refreshAccessToken } from "./api/authApi.js";
import * as orderApi from "./api/orderApi.js";

function isAdminUser(user) {
  return String(user?.role || user?.roles?.[0] || user?.authorities?.[0] || "")
    .toUpperCase()
    .includes("ADMIN");
}

function defaultPathForUser(user) {
  return isAdminUser(user) ? "/admin/products" : "/customer/products";
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
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

  useEffect(() => {
    const isTokenExpired = (token) => {
      if (!token) {
        return true;
      }

      try {
        const [, payload] = token.split(".");
        const decoded = JSON.parse(atob(payload));
        return Date.now() >= decoded.exp * 1000;
      } catch {
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
          navigate("/login", { replace: true });
        });
    }
  }, [authToken, navigate, refreshToken]);

  const handleLogin = async (token, refresh, userData) => {
    localStorage.setItem("authToken", token);
    localStorage.setItem("authRefreshToken", refresh);
    localStorage.setItem("authUser", JSON.stringify(userData || {}));
    setAuthToken(token);
    setRefreshToken(refresh);
    setUser(userData || null);
    navigate(defaultPathForUser(userData), { replace: true });
  };

  const handleLogout = async () => {
    try {
      await orderApi.notifyCartOnLogout();
    } catch {
      // Logout should still continue if the cart session endpoint is unavailable.
    }
    localStorage.removeItem("authToken");
    localStorage.removeItem("authRefreshToken");
    localStorage.removeItem("authUser");
    setAuthToken("");
    setRefreshToken("");
    setUser(null);
    navigate("/login", { replace: true });
  };

  const handleRequestLogin = () => {
    navigate("/login");
  };

  const handleCloseLogin = () => {
    navigate(user ? defaultPathForUser(user) : "/customer/orders", {
      replace: true,
    });
  };

  const handleUserUpdate = (userData) => {
    const nextUser = { ...(user || {}), ...(userData || {}) };
    localStorage.setItem("authUser", JSON.stringify(nextUser));
    setUser(nextUser);
  };

  return (
    <OrderNotificationProvider user={user}>
      <Routes>
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to={defaultPathForUser(user)} replace />
            ) : (
              <LoginPage onLogin={handleLogin} onCancel={handleCloseLogin} />
            )
          }
        />
        <Route
          path="/"
          element={<Navigate to={defaultPathForUser(user)} replace />}
        />
        <Route
          path="/customer/products"
          element={
            <Dashboard
              routeView="orders"
              customerTab="catalog"
              user={user}
              onLogout={handleLogout}
              onUserUpdate={handleUserUpdate}
              onRequestLogin={handleRequestLogin}
            />
          }
        />
        <Route
          path="/customer/cart"
          element={
            <Dashboard
              routeView="orders"
              customerTab="cart"
              user={user}
              onLogout={handleLogout}
              onUserUpdate={handleUserUpdate}
              onRequestLogin={handleRequestLogin}
            />
          }
        />
        <Route
          path="/customer/orders"
          element={
            <Dashboard
              routeView="orders"
              customerTab="history"
              user={user}
              onLogout={handleLogout}
              onUserUpdate={handleUserUpdate}
              onRequestLogin={handleRequestLogin}
            />
          }
        />
        <Route
          path="/customer/account"
          element={
            <Dashboard
              routeView="account"
              user={user}
              onLogout={handleLogout}
              onUserUpdate={handleUserUpdate}
              onRequestLogin={handleRequestLogin}
            />
          }
        />
        <Route
          path="/orders/:orderId"
          element={
            <Dashboard
              routeView="orders"
              customerTab="history"
              user={user}
              onLogout={handleLogout}
              onUserUpdate={handleUserUpdate}
              onRequestLogin={handleRequestLogin}
            />
          }
        />
        <Route
          path="/admin"
          element={<Navigate to="/admin/products" replace />}
        />
        <Route
          path="/admin/:section"
          element={
            <Dashboard
              routeView="products"
              user={user}
              onLogout={handleLogout}
              onUserUpdate={handleUserUpdate}
              onRequestLogin={handleRequestLogin}
            />
          }
        />
        <Route
          path="*"
          element={
            <Navigate
              to={user ? defaultPathForUser(user) : "/customer/orders"}
              replace
            />
          }
        />
      </Routes>
      <AdminNotificationToast />
      <DeepLinkHandler pathname={location.pathname} />
    </OrderNotificationProvider>
  );
}

function DeepLinkHandler({ pathname }) {
  const { openOrder } = useOrderNotifications() || {};

  useEffect(() => {
    try {
      const match = pathname.match(/^\/orders\/(.+)$/);
      if (match && match[1] && typeof openOrder === "function") {
        openOrder(decodeURIComponent(match[1]));
      }
    } catch {
      // ignore
    }
  }, [openOrder, pathname]);

  return null;
}

function AdminNotificationToast() {
  const { lastNotification } = useOrderNotifications() || {};
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!lastNotification) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 3500);
    return () => clearTimeout(timer);
  }, [lastNotification]);

  if (!visible || !lastNotification) return null;

  return (
    <OrderToast
      notification={{
        type: "success",
        text: `Đơn hàng mới #${lastNotification.orderId} - ${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(lastNotification.total)}`,
      }}
      onClose={() => setVisible(false)}
    />
  );
}

export default App;
