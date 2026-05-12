import { useState } from "react";
import { loginUser } from "../api/authApi";

function Login({ onLogin, onSwitchToRegister, onSwitchToForgot }) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const resetFeedback = () => setFeedback({ type: "", message: "" });
  const showError = (message) => setFeedback({ type: "error", message });
  const showSuccess = (message) => setFeedback({ type: "success", message });

  const handleLogin = async () => {
    resetFeedback();
    if (!loginData.email || !loginData.password) {
      return showError("Vui lòng nhập email và mật khẩu.");
    }
    setLoading(true);
    try {
      const response = await loginUser(loginData.email, loginData.password);
      const accessToken = response.accessToken;
      const user = response.user || null;
      if (typeof onLogin === "function") {
        onLogin(accessToken, user);
      }
      showSuccess("Đăng nhập thành công. Bạn đã được chuyển đến Dashboard.");
    } catch (err) {
      showError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Đăng nhập thất bại. Kiểm tra lại email hoặc mật khẩu.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {feedback.message && (
        <div
          className={`p-4 rounded-xl text-sm font-medium ${
            feedback.type === "error"
              ? "bg-red-50 text-red-800 border border-red-200"
              : "bg-green-50 text-green-800 border border-green-200"
          }`}
        >
          {feedback.message}
        </div>
      )}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Email
          </label>
          <input
            type="email"
            placeholder="email@example.com"
            value={loginData.email}
            onChange={(e) =>
              setLoginData((prev) => ({ ...prev, email: e.target.value }))
            }
            className="w-full h-14 px-4 rounded-xl border border-gray-300 bg-gray-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
          <div>
            <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Mật khẩu
            </label>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Nhập mật khẩu"
              value={loginData.password}
              onChange={(e) =>
                setLoginData((prev) => ({ ...prev, password: e.target.value }))
              }
              className="w-full h-14 px-4 rounded-xl border border-gray-300 bg-gray-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="text-blue-600 font-bold hover:text-blue-800 transition-colors"
          >
            {showPassword ? "Ẩn" : "Hiện"}
          </button>
        </div>
      </div>
      <button
        onClick={handleLogin}
        disabled={loading}
        className="w-full py-4 px-5 bg-linear-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl hover:from-orange-600 hover:to-orange-700 transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
      >
        {loading ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
      <div className="flex flex-wrap justify-between items-center gap-3 text-sm text-gray-600">
        <button
          type="button"
          onClick={onSwitchToForgot}
          className="text-blue-600 font-semibold hover:text-blue-800 transition-colors"
        >
          Quên mật khẩu?
        </button>
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-blue-600 font-semibold hover:text-blue-800 transition-colors"
        >
          Tạo tài khoản mới
        </button>
      </div>
    </div>
  );
}

export default Login;
