import { useState } from "react";
import { resetPassword } from "../api/authApi";

function ResetPassword({ email, onSwitchToLogin }) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [resetData, setResetData] = useState({
    email: email || "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const resetFeedback = () => setFeedback({ type: "", message: "" });
  const showError = (message) => setFeedback({ type: "error", message });
  const showSuccess = (message) => setFeedback({ type: "success", message });

  const handleResetPassword = async () => {
    resetFeedback();
    if (!resetData.email || !resetData.otp || !resetData.newPassword) {
      return showError("Vui lòng điền đầy đủ email, OTP và mật khẩu mới.");
    }
    if (resetData.newPassword.length < 8) {
      return showError("Mật khẩu mới phải có ít nhất 8 ký tự.");
    }
    if (resetData.newPassword !== resetData.confirmPassword) {
      return showError("Mật khẩu mới và xác nhận mật khẩu phải giống nhau.");
    }

    setLoading(true);
    try {
      await resetPassword(
        resetData.email,
        resetData.otp,
        resetData.newPassword,
      );
      showSuccess("Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.");
      onSwitchToLogin(resetData.email);
    } catch (err) {
      showError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Đặt lại mật khẩu thất bại. Vui lòng thử lại.",
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
            value={resetData.email}
            onChange={(e) =>
              setResetData((prev) => ({ ...prev, email: e.target.value }))
            }
            className="w-full h-14 px-4 rounded-xl border border-gray-300 bg-gray-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Mã OTP
          </label>
          <input
            type="text"
            placeholder="123456"
            value={resetData.otp}
            onChange={(e) =>
              setResetData((prev) => ({ ...prev, otp: e.target.value }))
            }
            className="w-full h-14 px-4 rounded-xl border border-gray-300 bg-gray-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Mật khẩu mới
            </label>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Tối thiểu 8 ký tự"
              value={resetData.newPassword}
              onChange={(e) =>
                setResetData((prev) => ({
                  ...prev,
                  newPassword: e.target.value,
                }))
              }
              className="w-full h-14 px-4 rounded-xl border border-gray-300 bg-gray-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Xác nhận mật khẩu
            </label>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Nhập lại mật khẩu mới"
              value={resetData.confirmPassword}
              onChange={(e) =>
                setResetData((prev) => ({
                  ...prev,
                  confirmPassword: e.target.value,
                }))
              }
              className="w-full h-14 px-4 rounded-xl border border-gray-300 bg-gray-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="showPasswordReset"
            checked={showPassword}
            onChange={() => setShowPassword((prev) => !prev)}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="showPasswordReset" className="text-sm text-gray-700">
            Hiển thị mật khẩu
          </label>
        </div>
      </div>
      <button
        onClick={handleResetPassword}
        disabled={loading}
        className="w-full py-4 px-5 bg-linear-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl hover:from-orange-600 hover:to-orange-700 transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
      >
        {loading ? "Đang đặt lại mật khẩu..." : "Đặt lại mật khẩu"}
      </button>
      <p className="text-gray-600 text-sm leading-relaxed">
        Sau khi nhập OTP và mật khẩu mới, bạn sẽ có thể đăng nhập lại.
      </p>
      <button
        type="button"
        onClick={() => onSwitchToLogin(resetData.email)}
        className="text-blue-600 font-bold hover:text-blue-800 transition-colors"
      >
        Quay lại đăng nhập
      </button>
    </div>
  );
}

export default ResetPassword;
