import { useState } from "react";
import Login from "./Login";
import Register from "./Register";
import ForgotPassword from "./ForgotPassword";
import VerifyOTP from "./VerifyOTP";
import ResetPassword from "./ResetPassword";

function LoginPage({ onLogin, onCancel }) {
  const [mode, setMode] = useState("login");
  const [verifyEmail, setVerifyEmail] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const resetFeedback = () => {
    setFeedback({ type: "", message: "" });
  };

  const handleSwitchToVerify = (email) => {
    setVerifyEmail(email);
    setMode("verify");
  };

  const handleSwitchToReset = (email) => {
    setVerifyEmail(email);
    setMode("reset");
  };

  const handleSwitchToLogin = (email = "") => {
    setVerifyEmail(email);
    setMode("login");
  };

  const handleSwitchToRegister = () => {
    setMode("register");
  };

  const handleSwitchToForgot = () => {
    setMode("forgot");
  };

  const modeTitle =
    mode === "login"
      ? "Đăng nhập"
      : mode === "register"
        ? "Tạo tài khoản"
        : mode === "verify"
          ? "Xác thực OTP"
          : mode === "reset"
            ? "Đặt lại mật khẩu"
            : "Quên mật khẩu";

  const modeDescription =
    mode === "login"
      ? "Đăng nhập bằng email đã xác thực để tiếp tục."
      : mode === "register"
        ? "Tạo tài khoản bằng email và bảo mật OTP để sử dụng dịch vụ."
        : mode === "verify"
          ? "Nhập mã OTP để hoàn tất đăng ký và bảo mật tài khoản."
          : mode === "reset"
            ? "Nhập email, mã OTP và mật khẩu mới để đặt lại mật khẩu an toàn."
            : "Nhập email để nhận mã OTP và khôi phục quyền truy cập.";

  const handleCancel = () => {
    if (typeof onCancel === "function") {
      onCancel();
    }
  };

  const renderForm = () => {
    switch (mode) {
      case "register":
        return (
          <Register
            onSwitchToVerify={handleSwitchToVerify}
            onSwitchToLogin={handleSwitchToLogin}
          />
        );
      case "verify":
        return (
          <VerifyOTP
            email={verifyEmail}
            onSwitchToLogin={handleSwitchToLogin}
          />
        );
      case "forgot":
        return (
          <ForgotPassword
            onSwitchToReset={handleSwitchToReset}
            onSwitchToLogin={handleSwitchToLogin}
          />
        );
      case "reset":
        return (
          <ResetPassword
            email={verifyEmail}
            onSwitchToLogin={handleSwitchToLogin}
          />
        );
      default:
        return (
          <Login
            onLogin={onLogin}
            onSwitchToRegister={handleSwitchToRegister}
            onSwitchToForgot={handleSwitchToForgot}
          />
        );
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-6 lg:px-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-3xl font-black tracking-tight text-slate-950">
              DTPShop
            </div>
            <p className="mt-2 text-sm text-slate-700">
              Nền tảng thương mại điện tử dành cho trải nghiệm mua sắm hiện đại.
            </p>
          </div>
        </header>

        <section className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="overflow-hidden rounded-4xl bg-linear-to-b from-sky-700 via-blue-700 to-indigo-800 p-10 text-white shadow-2xl">
            <div className="space-y-6">
              <p className="text-sm uppercase tracking-[0.35em] text-sky-200/80">
                Giải pháp bảo mật & tiện lợi
              </p>
              <h1 className="text-4xl font-bold leading-tight tracking-tight lg:text-5xl">
                Xác thực chuyên nghiệp cho DTPShop.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-sky-100/90">
                Đăng nhập nhanh, đăng ký an toàn và đặt lại mật khẩu qua OTP —
                toàn bộ trải nghiệm được thiết kế để nâng tầm thương hiệu và tạo
                sự tin cậy.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-lg shadow-slate-950/10">
                <p className="text-xl font-semibold">Bảo mật cao</p>
                <p className="mt-2 text-sm text-sky-100/80">
                  Xác thực OTP và mã hóa dữ liệu.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-lg shadow-slate-950/10">
                <p className="text-xl font-semibold">Trải nghiệm mượt</p>
                <p className="mt-2 text-sm text-sky-100/80">
                  Giao diện rõ ràng, dễ thao tác.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-lg shadow-slate-950/10">
                <p className="text-xl font-semibold">Hỗ trợ nhanh</p>
                <p className="mt-2 text-sm text-sky-100/80">
                  Hướng dẫn rõ ràng và phản hồi trực quan.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-4xl bg-white p-8 shadow-2xl shadow-slate-900/10">
            <div className="mb-8 space-y-4 text-slate-950">
              <h2 className="text-4xl font-black tracking-tight leading-tight text-slate-950 opacity-100 sm:text-5xl">
                {modeTitle}
              </h2>
              <p className="max-w-xl text-sm leading-7 text-slate-700">
                {modeDescription}
              </p>
            </div>

            {feedback.message && (
              <div
                className={`mb-6 rounded-2xl border px-4 py-4 text-sm font-medium ${
                  feedback.type === "error"
                    ? "border-red-200 bg-red-50 text-red-800"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800"
                }`}
              >
                {feedback.message}
              </div>
            )}

            {renderForm()}

            <div className="mt-6 flex flex-col gap-3 text-center text-sm text-slate-500">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-3xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Tiếp tục duyệt dưới quyền khách
              </button>
            </div>

            <div className="mt-8 border-t border-slate-200 pt-6 text-center text-sm text-slate-500">
              {mode === "login"
                ? "Bạn chưa có tài khoản?"
                : mode === "register"
                  ? "Đã có tài khoản?"
                  : mode === "verify"
                    ? "Quay lại đăng nhập?"
                    : "Trở về đăng nhập?"}{" "}
              <button
                onClick={() => {
                  setMode("login");
                  resetFeedback();
                }}
                className="font-semibold text-sky-700 transition-colors hover:text-sky-900"
              >
                {mode === "login" ? "Tạo tài khoản" : "Đăng nhập"}
              </button>
            </div>
          </div>
        </section>

        <footer className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-500">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>DTPShop © 2026</span>
            <div className="flex flex-wrap gap-4">
              <a href="#" className="hover:text-slate-900 transition-colors">
                Chính sách
              </a>
              <a href="#" className="hover:text-slate-900 transition-colors">
                Điều khoản
              </a>
              <a href="#" className="hover:text-slate-900 transition-colors">
                Hỗ trợ
              </a>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

export default LoginPage;
