import { useState } from "react";
import LoginPage from "./pages/LoginPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";

function App() {
  const [authToken, setAuthToken] = useState(
    localStorage.getItem("authToken") || "",
  );
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("authUser");
    return stored ? JSON.parse(stored) : null;
  });

  const handleLogin = (token, userData) => {
    localStorage.setItem("authToken", token);
    localStorage.setItem("authUser", JSON.stringify(userData || {}));
    setAuthToken(token);
    setUser(userData || null);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    setAuthToken("");
    setUser(null);
  };

  return authToken && user ? (
    <Dashboard onLogout={handleLogout} user={user} />
  ) : (
    <LoginPage onLogin={handleLogin} />
  );
}

export default App;
