import { useState, useEffect } from "react";
import { verifyRegisterOtp } from "../api/authApi";

function VerifyOTP({ email, onSwitchToLogin }) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [verifyData, setVerifyData] = useState({ email, otp: "" });

  useEffect(() => {
    setVerifyData((prev) => ({ ...prev, email }));
  }, [email]);

  const resetFeedback = () => setFeedback({ type: "", message: "" });
  const showError = (message) => setFeedback({ type: "error", message });
  const showSuccess = (message) => setFeedback({ type: "success", message });

  const handleVerify = async () => {
    resetFeedback();
    if (!verifyData.email || !verifyData.otp) {
      return showError("Vui lòng nhập email và mã OTP.");
    }
    setLoading(true);
    try {
      await verifyRegisterOtp(verifyData.email, verifyData.otp);
      showSuccess(
        "Xác thực OTP thành công. Bạn có thể đăng nhập ngay bây giờ.",
      );
      onSwitchToLogin(verifyData.email);
    } catch (err) {
      showError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Xác thực OTP không thành công. Vui lòng kiểm tra lại.",
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
            Email đã đăng ký
          </label>
          <input
            type="email"
            placeholder="email@example.com"
            value={verifyData.email}
            onChange={(e) =>
              setVerifyData((prev) => ({ ...prev, email: e.target.value }))
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
            value={verifyData.otp}
            onChange={(e) =>
              setVerifyData((prev) => ({ ...prev, otp: e.target.value }))
            }
            className="w-full h-14 px-4 rounded-xl border border-gray-300 bg-gray-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
      </div>
      <button
        onClick={handleVerify}
        disabled={loading}
        className="w-full py-4 px-5 bg-linear-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl hover:from-orange-600 hover:to-orange-700 transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
      >
        {loading ? "Đang xác thực..." : "Xác thực OTP"}
      </button>
      <div className="flex items-center justify-between text-sm text-gray-600 mt-3">
        <button
          type="button"
          onClick={() => onSwitchToLogin(verifyData.email)}
          className="text-blue-600 font-bold hover:text-blue-800 transition-colors"
        >
          Quay lại đăng nhập
        </button>
      </div>
      <p className="text-gray-600 text-sm leading-relaxed">
        Nếu chưa nhận mã, kiểm tra thư mục Spam hoặc thử gửi lại đăng ký.
      </p>
    </div>
  );
}

export default VerifyOTP;
