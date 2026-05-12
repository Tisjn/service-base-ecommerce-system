import { useState } from "react";
import { registerUser, uploadAvatar } from "../api/authApi";

function Register({ onSwitchToVerify, onSwitchToLogin }) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [registerData, setRegisterData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const resetFeedback = () => setFeedback({ type: "", message: "" });
  const showError = (message) => setFeedback({ type: "error", message });
  const showSuccess = (message) => setFeedback({ type: "success", message });

  const handleRegister = async () => {
    resetFeedback();
    if (
      !registerData.fullName ||
      !registerData.email ||
      !registerData.password
    ) {
      return showError("Vui lòng điền đầy đủ họ tên, email và mật khẩu.");
    }
    if (registerData.password.length < 8) {
      return showError("Mật khẩu phải có ít nhất 8 ký tự.");
    }
    if (registerData.password !== registerData.confirmPassword) {
      return showError("Mật khẩu và xác nhận mật khẩu phải giống nhau.");
    }

    let avatarUrl = "";
    setLoading(true);
    try {
      if (avatarFile) {
        const uploadResult = await uploadAvatar(avatarFile);
        avatarUrl = uploadResult.avatarUrl;
      }

      await registerUser(
        registerData.fullName,
        registerData.email,
        registerData.password,
        avatarUrl,
      );
      showSuccess(
        "Đăng ký thành công. Mã OTP đã được gửi vào email, tiếp tục xác thực OTP.",
      );
      onSwitchToVerify(registerData.email);
    } catch (err) {
      showError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.",
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
            Họ và tên
          </label>
          <input
            type="text"
            placeholder="Nguyễn Văn A"
            value={registerData.fullName}
            onChange={(e) =>
              setRegisterData((prev) => ({
                ...prev,
                fullName: e.target.value,
              }))
            }
            className="w-full h-14 px-4 rounded-xl border border-gray-300 bg-gray-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Email
          </label>
          <input
            type="email"
            placeholder="email@example.com"
            value={registerData.email}
            onChange={(e) =>
              setRegisterData((prev) => ({ ...prev, email: e.target.value }))
            }
            className="w-full h-14 px-4 rounded-xl border border-gray-300 bg-gray-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Ảnh đại diện (tùy chọn)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setAvatarFile(file);
                  setAvatarPreview(URL.createObjectURL(file));
                } else {
                  setAvatarFile(null);
                  setAvatarPreview("");
                }
              }}
              className="w-full text-sm text-slate-700"
            />
            {avatarPreview && (
              <div className="mt-4 flex items-center gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <img
                  src={avatarPreview}
                  alt="Xem trước avatar"
                  className="h-16 w-16 rounded-full object-cover"
                />
                <div className="flex-1 text-sm text-slate-600">
                  <p className="font-semibold text-slate-800">
                    Ảnh đại diện đã chọn
                  </p>
                  <p className="text-slate-500">Kích thước tối đa: 2MB.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAvatarFile(null);
                    setAvatarPreview("");
                  }}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                >
                  Xóa
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Mật khẩu
            </label>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Tối thiểu 8 ký tự"
              value={registerData.password}
              onChange={(e) =>
                setRegisterData((prev) => ({
                  ...prev,
                  password: e.target.value,
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
              placeholder="Nhập lại mật khẩu"
              value={registerData.confirmPassword}
              onChange={(e) =>
                setRegisterData((prev) => ({
                  ...prev,
                  confirmPassword: e.target.value,
                }))
              }
              className="w-full h-14 px-4 rounded-xl border border-gray-300 bg-gray-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
            <p className="text-gray-500 text-xs mt-2 leading-relaxed">
              Nhập lại mật khẩu để đảm bảo không bị sai chính tả.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="showPassword"
            checked={showPassword}
            onChange={() => setShowPassword((prev) => !prev)}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="showPassword" className="text-sm text-gray-700">
            Hiển thị mật khẩu
          </label>
        </div>
      </div>
      <button
        onClick={handleRegister}
        disabled={loading}
        className="w-full py-4 px-5 bg-linear-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl hover:from-orange-600 hover:to-orange-700 transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
      >
        {loading ? "Đang đăng ký..." : "Tạo tài khoản"}
      </button>
      <div className="flex items-center justify-between text-sm text-gray-600 mt-3">
        <span>Đã có tài khoản?</span>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-blue-600 font-bold hover:text-blue-800 transition-colors"
        >
          Đăng nhập
        </button>
      </div>
      <p className="text-gray-600 text-sm leading-relaxed">
        Sau khi gửi đăng ký, bạn sẽ nhận mã OTP qua email để hoàn tất xác thực.
      </p>
    </div>
  );
}

export default Register;
