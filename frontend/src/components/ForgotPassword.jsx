import { useState } from "react";
import { forgotPassword } from "../api/authApi";

function ForgotPassword({ onSwitchToReset, onSwitchToLogin }) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [forgotData, setForgotData] = useState({ email: "" });

  const resetFeedback = () => setFeedback({ type: "", message: "" });
  const showError = (message) => setFeedback({ type: "error", message });
  const showSuccess = (message) => setFeedback({ type: "success", message });

  const handleForgotPassword = async () => {
    resetFeedback();
    if (!forgotData.email) {
      return showError("Vui lòng nhập email cần đặt lại mật khẩu.");
    }
    setLoading(true);
    try {
      await forgotPassword(forgotData.email);
      showSuccess(
        "Yêu cầu đặt lại mật khẩu đã được gửi. Kiểm tra email để nhận mã OTP.",
      );
      onSwitchToReset(forgotData.email);
    } catch (err) {
      showError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Gửi yêu cầu quên mật khẩu thất bại. Vui lòng thử lại.",
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
      <div>
        <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
          Email
        </label>
        <input
          type="email"
          placeholder="email@example.com"
          value={forgotData.email}
          onChange={(e) =>
            setForgotData((prev) => ({ ...prev, email: e.target.value }))
          }
          className="w-full h-14 px-4 rounded-xl border border-gray-300 bg-gray-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
        />
      </div>
      <button
        onClick={handleForgotPassword}
        disabled={loading}
        className="w-full py-4 px-5 bg-linear-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl hover:from-orange-600 hover:to-orange-700 transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
      >
        {loading ? "Đang gửi yêu cầu..." : "Gửi yêu cầu quên mật khẩu"}
      </button>
      <div className="flex items-center justify-between text-sm text-gray-600 mt-3">
        <button
          type="button"
          onClick={() => onSwitchToLogin()}
          className="text-blue-600 font-bold hover:text-blue-800 transition-colors"
        >
          Quay lại đăng nhập
        </button>
      </div>
      <p className="text-gray-600 text-sm leading-relaxed">
        Nhập email đã đăng ký để nhận mã OTP đặt lại mật khẩu.
      </p>
    </div>
  );
}

export default ForgotPassword;
