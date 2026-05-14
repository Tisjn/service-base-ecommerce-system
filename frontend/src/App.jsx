import { useState, useEffect } from "react";
import LoginPage from "./pages/auth/LoginPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
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
    <Dashboard
      onLogout={handleLogout}
      onUserUpdate={handleUserUpdate}
      onRequestLogin={handleRequestLogin}
      user={user}
    />
  );
}

export default App;
