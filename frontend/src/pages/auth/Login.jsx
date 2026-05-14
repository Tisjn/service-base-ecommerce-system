import { useState } from "react";
import { loginUser } from "../../api/authApi";

function Login({ onLogin, onSwitchToRegister, onSwitchToForgot }) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const EyeIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M2.25 12C3.8 7.5 7.7 4.5 12 4.5s8.2 3 9.75 7.5C20.2 16.5 16.3 19.5 12 19.5S3.8 16.5 2.25 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  const EyeOffIcon = () => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6A3 3 0 0 0 13.4 13.4" />
      <path d="M6.2 6.2C4.1 7.6 2.6 9.6 2.25 12c1.55 4.5 5.45 7.5 9.75 7.5 1.6 0 3.14-.34 4.5-.98" />
      <path d="M9.9 4.9A10.7 10.7 0 0 1 12 4.5c4.3 0 8.2 3 9.75 7.5a11.8 11.8 0 0 1-2.5 3.8" />
    </svg>
  );

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
      const refreshToken = response.refreshToken || "";
      const user = response.user || null;
      if (typeof onLogin === "function") {
        onLogin(accessToken, refreshToken, user);
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
        <div>
          <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Mật khẩu
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Nhập mật khẩu"
              value={loginData.password}
              onChange={(e) =>
                setLoginData((prev) => ({ ...prev, password: e.target.value }))
              }
              autoComplete="current-password"
              className="w-full h-14 px-4 pr-14 rounded-xl border border-gray-300 bg-gray-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              className="absolute inset-y-0 right-0 flex items-center justify-center px-4 text-gray-500 transition-colors hover:text-blue-600"
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
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
