import { useEffect, useState } from "react";
import { registerUser, uploadAvatar } from "../../api/authApi";

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

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

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
            <div className="rounded-3xl border border-sky-100 bg-linear-to-br from-white via-slate-50 to-sky-50 p-4 shadow-sm shadow-sky-100/60">
              <label
                htmlFor="avatar-upload-input"
                className="group flex cursor-pointer flex-row items-center justify-between gap-4"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm ring-4 ring-sky-50">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Xem trước ảnh đại diện"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-orange-500 via-orange-600 to-orange-700 text-white">
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-8 w-8 drop-shadow-sm"
                        >
                          <path d="M4 8a2 2 0 0 1 2-2h1.9a2 2 0 0 0 1.7-1l.6-1a2 2 0 0 1 1.7-1h1.6a2 2 0 0 1 1.7 1l.6 1a2 2 0 0 0 1.7 1H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" />
                          <circle cx="12" cy="13" r="3.5" />
                          <path d="M12 10.8v4.4" />
                          <path d="M9.8 13h4.4" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-950">
                      {avatarFile
                        ? avatarFile.name
                        : "Chọn ảnh để xem trước ngay"}
                    </p>
                    <p className="text-sm leading-6 text-slate-600">
                      Ảnh JPG, PNG, WebP. Tối đa 2MB. Nhấp vào khung này để tải
                      ảnh lên.
                    </p>
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-linear-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition group-hover:from-orange-600 group-hover:to-orange-700">
                  Chọn ảnh
                </span>
              </label>
              <div className="mt-3 flex justify-end">
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      if (avatarPreview) {
                        URL.revokeObjectURL(avatarPreview);
                      }
                      setAvatarFile(null);
                      setAvatarPreview("");
                    }}
                    className="rounded-full border border-sky-100 bg-white px-4 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-200 hover:bg-sky-50"
                  >
                    Xóa ảnh
                  </button>
                )}
              </div>
              <input
                id="avatar-upload-input"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (avatarPreview) {
                      URL.revokeObjectURL(avatarPreview);
                    }
                    setAvatarFile(file);
                    setAvatarPreview(URL.createObjectURL(file));
                  } else {
                    setAvatarFile(null);
                    setAvatarPreview("");
                  }
                }}
                className="sr-only"
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Mật khẩu
            </label>
            <div className="relative">
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
                autoComplete="new-password"
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
          <div>
            <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Xác nhận mật khẩu
            </label>
            <div className="relative">
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
                autoComplete="new-password"
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
            <p className="text-gray-500 text-xs mt-2 leading-relaxed">
              Nhập lại mật khẩu để đảm bảo không bị sai chính tả.
            </p>
          </div>
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
