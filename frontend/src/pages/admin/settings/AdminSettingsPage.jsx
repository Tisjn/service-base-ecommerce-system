import { useEffect, useMemo, useState } from "react";
import {
  changePassword,
  deleteProfileAvatar,
  forgotPassword,
  updateProfileAvatar,
} from "../../../api/authApi";
import { getUserProfile, updateUserProfile } from "../../../api/userApi";

const initialPasswordForm = {
  currentPassword: "",
  otp: "",
  newPassword: "",
  confirmPassword: "",
};

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function getInitial(value) {
  return String(value || "A").trim().charAt(0).toUpperCase();
}

export default function AdminSettingsPage({ user, onUserUpdate }) {
  const accessToken = localStorage.getItem("authToken") || "";
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState(user || {});
  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || "",
    phone: user?.phone || "",
  });
  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [deletingAvatar, setDeletingAvatar] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const [notice, setNotice] = useState(null);

  const profileEmail = profile?.email || user?.email || "";
  const currentAvatar = avatarPreview || profile?.avatarUrl || "";
  const tabs = useMemo(
    () => [
      { id: "profile", label: "Hồ sơ", icon: "account_circle" },
      { id: "security", label: "Mật khẩu", icon: "shield" },
    ],
    [],
  );

  useEffect(() => {
    let cancelled = false;
    if (!accessToken) return undefined;

    getUserProfile(accessToken)
      .then((data) => {
        if (cancelled) return;
        updateLocalProfile(data);
      })
      .catch((error) => {
        if (cancelled) return;
        setNotice({
          type: "error",
          message: getErrorMessage(error, "Không tải được hồ sơ admin."),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(
    () => () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    },
    [avatarPreview],
  );

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function updateLocalProfile(nextProfile) {
    setProfile((prev) => {
      const merged = { ...(prev || {}), ...(nextProfile || {}) };
      setProfileForm({
        fullName: merged.fullName || "",
        phone: merged.phone || "",
      });
      onUserUpdate?.(merged);
      return merged;
    });
  }

  function setProfileValue(field, value) {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  }

  function setPasswordValue(field, value) {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSaveProfile(event) {
    event.preventDefault();
    const fullName = profileForm.fullName.trim();
    if (!fullName) {
      setNotice({ type: "error", message: "Họ tên không được để trống." });
      return;
    }

    setSavingProfile(true);
    setNotice(null);
    try {
      const data = await updateUserProfile(accessToken, {
        fullName,
        phone: profileForm.phone.trim(),
      });
      updateLocalProfile(data);
      setNotice({ type: "success", message: "Đã cập nhật hồ sơ admin." });
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(error, "Không cập nhật được hồ sơ admin."),
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveAvatar() {
    if (!avatarFile) {
      setNotice({ type: "error", message: "Vui lòng chọn ảnh đại diện." });
      return;
    }

    setSavingAvatar(true);
    setNotice(null);
    try {
      const data = await updateProfileAvatar(accessToken, avatarFile);
      updateLocalProfile(data);
      setAvatarFile(null);
      setAvatarPreview("");
      setNotice({ type: "success", message: "Đã cập nhật ảnh đại diện." });
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(error, "Không lưu được ảnh đại diện."),
      });
    } finally {
      setSavingAvatar(false);
    }
  }

  async function handleDeleteAvatar() {
    if (avatarFile || avatarPreview) {
      setAvatarFile(null);
      setAvatarPreview("");
      return;
    }
    if (!profile?.avatarUrl) return;

    setDeletingAvatar(true);
    setNotice(null);
    try {
      const data = await deleteProfileAvatar(accessToken);
      updateLocalProfile(data);
      setNotice({ type: "success", message: "Đã xóa ảnh đại diện." });
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(error, "Không xóa được ảnh đại diện."),
      });
    } finally {
      setDeletingAvatar(false);
    }
  }

  async function handleSendPasswordOtp() {
    if (!profileEmail) {
      setNotice({ type: "error", message: "Không tìm thấy email tài khoản." });
      return;
    }

    setSendingOtp(true);
    setNotice(null);
    try {
      await forgotPassword(profileEmail);
      setOtpSent(true);
      setNotice({
        type: "success",
        message: `Mã OTP đã được gửi đến ${profileEmail}.`,
      });
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(error, "Không gửi được OTP."),
      });
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleChangePassword(event) {
    event.preventDefault();
    if (!passwordForm.currentPassword.trim()) {
      setNotice({ type: "error", message: "Vui lòng nhập mật khẩu hiện tại." });
      return;
    }
    if (!otpSent) {
      setNotice({ type: "error", message: "Vui lòng gửi OTP trước khi đổi mật khẩu." });
      return;
    }
    if (!passwordForm.otp.trim()) {
      setNotice({ type: "error", message: "Vui lòng nhập mã OTP." });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setNotice({ type: "error", message: "Mật khẩu mới cần ít nhất 8 ký tự." });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setNotice({ type: "error", message: "Mật khẩu xác nhận không khớp." });
      return;
    }

    setSavingPassword(true);
    setNotice(null);
    try {
      const data = await changePassword(accessToken, {
        currentPassword: passwordForm.currentPassword,
        otp: passwordForm.otp.trim(),
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm(initialPasswordForm);
      setOtpSent(false);
      setNotice({
        type: "success",
        message: data?.message || "Đã đổi mật khẩu.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(error, "Không đổi được mật khẩu."),
      });
    } finally {
      setSavingPassword(false);
    }
  }

  function togglePassword(field) {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-10">
      <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="mb-2 text-4xl font-extrabold tracking-tight text-[#191b23] [font-family:Manrope,system-ui,sans-serif]">
            Cài đặt admin
          </h2>
          <p className="text-[#434655]">
            Cập nhật tên, ảnh đại diện và đổi mật khẩu bằng OTP xác nhận qua
            email.
          </p>
        </div>
        <div className="flex rounded-2xl border border-[#c3c6d7]/20 bg-[#f3f3fe] p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${
                activeTab === tab.id
                  ? "bg-white text-[#004ac6] shadow-sm"
                  : "text-[#434655] hover:bg-white/60"
              }`}
            >
              <span className="material-symbols-outlined text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-2xl border border-[#c3c6d7]/10 bg-white p-6 shadow-sm">
          {currentAvatar ? (
            <img
              src={currentAvatar}
              alt={profile?.fullName || profile?.email || "Admin"}
              className="mx-auto h-28 w-28 rounded-full object-cover"
            />
          ) : (
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-[#004ac6]/10 text-4xl font-extrabold text-[#004ac6]">
              {getInitial(profile?.fullName || profile?.email)}
            </div>
          )}
          <div className="mt-6 text-center">
            <p className="text-xl font-extrabold text-[#191b23]">
              {profile?.fullName || "Admin"}
            </p>
            <p className="mt-1 text-sm text-[#434655]">{profileEmail}</p>
            <span className="mt-4 inline-flex rounded-full bg-[#004ac6]/10 px-3 py-1 text-xs font-bold text-[#004ac6]">
              {profile?.role || "ADMIN"}
            </span>
          </div>
        </aside>

        {activeTab === "profile" ? (
          <form
            onSubmit={handleSaveProfile}
            className="rounded-2xl border border-[#c3c6d7]/10 bg-white p-6 shadow-sm"
          >
            <div className="mb-8 rounded-2xl bg-[#f3f3fe] p-5">
              <p className="text-sm font-bold text-[#191b23]">Ảnh đại diện</p>
              <p className="mt-1 text-sm text-[#434655]">
                Chọn ảnh mới, sau đó bấm lưu ảnh để cập nhật avatar admin.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#c3c6d7]/30 bg-white px-4 py-3 text-sm font-bold text-[#004ac6] transition hover:bg-[#ededf9]">
                  <span className="material-symbols-outlined">upload</span>
                  <span>Chọn ảnh</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
                      if (file) {
                        setAvatarFile(file);
                        setAvatarPreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                </label>
                {avatarFile ? (
                  <button
                    type="button"
                    onClick={handleSaveAvatar}
                    disabled={savingAvatar}
                    className="rounded-xl bg-[#004ac6] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#003fa8] disabled:opacity-60"
                  >
                    {savingAvatar ? "Đang lưu..." : "Lưu ảnh"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleDeleteAvatar}
                  disabled={deletingAvatar || (!profile?.avatarUrl && !avatarPreview)}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                >
                  {avatarPreview || avatarFile
                    ? "Bỏ chọn"
                    : deletingAvatar
                      ? "Đang xóa..."
                      : "Xóa ảnh"}
                </button>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Họ và tên">
                <input
                  type="text"
                  value={profileForm.fullName}
                  onChange={(event) =>
                    setProfileValue("fullName", event.target.value)
                  }
                  className="admin-input"
                />
              </Field>
              <Field label="Số điện thoại">
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={(event) => setProfileValue("phone", event.target.value)}
                  className="admin-input"
                  placeholder="+84 ..."
                />
              </Field>
              <Field label="Email">
                <input
                  value={profileEmail}
                  disabled
                  className="admin-input cursor-not-allowed bg-[#f8fafc] text-[#64748b]"
                />
              </Field>
              <Field label="Vai trò">
                <input
                  value={profile?.role || "ADMIN"}
                  disabled
                  className="admin-input cursor-not-allowed bg-[#f8fafc] text-[#64748b]"
                />
              </Field>
            </div>

            <FormActions
              saving={savingProfile}
              saveLabel="Lưu thay đổi"
              savingLabel="Đang lưu..."
              onDiscard={() => {
                setProfileForm({
                  fullName: profile?.fullName || "",
                  phone: profile?.phone || "",
                });
                setNotice(null);
              }}
            />
          </form>
        ) : (
          <form
            onSubmit={handleChangePassword}
            className="rounded-2xl border border-[#c3c6d7]/10 bg-white p-6 shadow-sm"
          >
            <div className="mb-6 rounded-2xl bg-[#f3f3fe] p-5">
              <p className="text-sm font-bold text-[#191b23]">
                Email xác nhận:{" "}
                <span className="text-[#004ac6]">
                  {profileEmail || "Chưa có email"}
                </span>
              </p>
              <p className="mt-1 text-sm text-[#434655]">
                Bấm gửi OTP, sau đó nhập OTP cùng mật khẩu hiện tại để đổi mật
                khẩu mới.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSendPasswordOtp}
                  disabled={sendingOtp || !profileEmail}
                  className="rounded-xl bg-[#004ac6] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#003fa8] disabled:opacity-60"
                >
                  {sendingOtp ? "Đang gửi OTP..." : otpSent ? "Gửi lại OTP" : "Gửi OTP"}
                </button>
                {otpSent ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700">
                    OTP đã được gửi
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid gap-5">
              <Field label="Mật khẩu hiện tại">
                <PasswordInput
                  value={passwordForm.currentPassword}
                  visible={showPassword.current}
                  autoComplete="current-password"
                  onToggle={() => togglePassword("current")}
                  onChange={(value) => setPasswordValue("currentPassword", value)}
                />
              </Field>
              <Field label="Mã OTP">
                <input
                  type="text"
                  value={passwordForm.otp}
                  onChange={(event) => setPasswordValue("otp", event.target.value)}
                  className="admin-input"
                  placeholder="Nhập mã OTP"
                />
              </Field>
              <Field label="Mật khẩu mới">
                <PasswordInput
                  value={passwordForm.newPassword}
                  visible={showPassword.next}
                  autoComplete="new-password"
                  onToggle={() => togglePassword("next")}
                  onChange={(value) => setPasswordValue("newPassword", value)}
                />
              </Field>
              <Field label="Xác nhận mật khẩu mới">
                <PasswordInput
                  value={passwordForm.confirmPassword}
                  visible={showPassword.confirm}
                  autoComplete="new-password"
                  onToggle={() => togglePassword("confirm")}
                  onChange={(value) => setPasswordValue("confirmPassword", value)}
                />
              </Field>
            </div>

            <FormActions
              saving={savingPassword}
              saveLabel="Xác nhận đổi mật khẩu"
              savingLabel="Đang xử lý..."
              onDiscard={() => {
                setPasswordForm(initialPasswordForm);
                setOtpSent(false);
                setNotice(null);
              }}
            />
          </form>
        )}
      </div>

      {notice ? <Toast notice={notice} onClose={() => setNotice(null)} /> : null}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-widest text-[#737686]">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function PasswordInput({ value, visible, autoComplete, onChange, onToggle }) {
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="admin-input pr-14"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute inset-y-0 right-0 flex items-center px-4 text-[#737686] transition hover:text-[#004ac6]"
        aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
      >
        <span className="material-symbols-outlined">
          {visible ? "visibility_off" : "visibility"}
        </span>
      </button>
    </div>
  );
}

function FormActions({ saving, saveLabel, savingLabel, onDiscard }) {
  return (
    <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-[#c3c6d7]/20 pt-5">
      <button
        type="button"
        onClick={onDiscard}
        disabled={saving}
        className="rounded-xl border border-[#c3c6d7]/30 bg-white px-5 py-3 text-sm font-bold text-[#434655] transition hover:bg-[#f3f3fe] disabled:opacity-60"
      >
        Hủy
      </button>
      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-[#004ac6] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#003fa8] disabled:opacity-60"
      >
        {saving ? savingLabel : saveLabel}
      </button>
    </div>
  );
}

function Toast({ notice, onClose }) {
  const isError = notice.type === "error";
  return (
    <div
      className={`fixed right-5 top-20 z-[80] flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-xl ${
        isError
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      <span className="material-symbols-outlined">
        {isError ? "error" : "check_circle"}
      </span>
      <p className="text-sm font-semibold">{notice.message}</p>
      <button type="button" onClick={onClose} className="ml-2">
        <span className="material-symbols-outlined text-base">close</span>
      </button>
    </div>
  );
}
