import { useCallback, useEffect, useMemo, useState } from "react";
import {
  changePassword,
  deleteProfileAvatar,
  forgotPassword,
  updateProfileAvatar,
} from "../../api/authApi";
import {
  createUserAddress,
  deleteUserAddress,
  getUserAddresses,
  getUserProfile,
  updateUserAddress,
  updateUserProfile,
} from "../../api/userApi";

const emptyAddress = {
  id: null,
  recipientName: "",
  phone: "",
  label: "",
  street: "",
  district: "",
  city: "",
  defaultAddress: false,
};

const primaryButtonClass =
  "inline-flex min-w-[180px] items-center justify-center whitespace-nowrap rounded-md bg-[#075bd8] px-7 py-3 text-sm font-extrabold text-white transition hover:bg-[#064fb9] disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButtonClass =
  "inline-flex min-w-[132px] items-center justify-center whitespace-nowrap rounded-md bg-[#edf0f7] px-4 py-3 text-sm font-extrabold text-slate-900 transition hover:bg-[#e2e6f1] disabled:cursor-not-allowed disabled:opacity-60";

const dangerButtonClass =
  "rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-extrabold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60";

function getInitial(nameOrEmail) {
  return String(nameOrEmail || "U")
    .trim()
    .charAt(0)
    .toUpperCase();
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function toAddressForm(address) {
  return {
    id: address?.id || null,
    recipientName: address?.recipientName || "",
    phone: address?.phone || "",
    label: address?.label || "",
    street: address?.street || "",
    district: address?.district || "",
    city: address?.city || "",
    defaultAddress: Boolean(address?.defaultAddress),
  };
}

export default function AccountProfilePage({ user, onUserUpdate }) {
  const accessToken = localStorage.getItem("authToken") || "";
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState(user || null);
  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || "",
    phone: user?.phone || "",
  });
  const [addressForm, setAddressForm] = useState(emptyAddress);
  const [addresses, setAddresses] = useState([]);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordOtpSent, setPasswordOtpSent] = useState(false);
  const [passwordOtpSending, setPasswordOtpSending] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [deletingAvatar, setDeletingAvatar] = useState(false);
  const [notice, setNotice] = useState(null);
  const [editingAddress, setEditingAddress] = useState(false);

  const displayName = profile?.fullName || profile?.email || "Người dùng";
  const currentAvatar = avatarPreview || profile?.avatarUrl || "";
  const profileEmail = profile?.email || user?.email || "";

  const navItems = useMemo(
    () => [
      { id: "profile", icon: "person", label: "Thông tin cá nhân" },
      { id: "security", icon: "shield", label: "Bảo mật" },
      { id: "addresses", icon: "location_on", label: "Địa chỉ" },
    ],
    [],
  );

  const updateLocalProfile = useCallback(
    (nextProfile) => {
      setProfile((prevProfile) => {
        const merged = { ...(prevProfile || {}), ...(nextProfile || {}) };
        if (!editingProfile) {
          setProfileForm({
            fullName: merged.fullName || "",
            phone: merged.phone || "",
          });
        }
        return merged;
      });
      onUserUpdate?.(nextProfile);
    },
    [onUserUpdate, editingProfile],
  );

  useEffect(() => {
    let cancelled = false;
    if (!accessToken) return undefined;

    Promise.allSettled([
      getUserProfile(accessToken),
      getUserAddresses(accessToken),
    ]).then(([profileResult, addressResult]) => {
      if (cancelled) return;

      if (profileResult.status === "fulfilled") {
        updateLocalProfile(profileResult.value);
      } else {
        setNotice({
          type: "error",
          message: getErrorMessage(
            profileResult.reason,
            "Không tải được thông tin tài khoản từ user-service.",
          ),
        });
      }

      if (addressResult.status === "fulfilled") {
        const nextAddresses = Array.isArray(addressResult.value)
          ? addressResult.value
          : [];
        setAddresses(nextAddresses);
        if (!editingAddress) {
          setAddressForm(toAddressForm(nextAddresses[0] || null));
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [accessToken, updateLocalProfile]);

  useEffect(
    () => () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    },
    [avatarPreview],
  );

  function setProfileValue(field, value) {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  }

  function setAddressValue(field, value) {
    setAddressForm((prev) => ({ ...prev, [field]: value }));
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
      setNotice({ type: "success", message: "Đã cập nhật thông tin cá nhân." });
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(
          error,
          "Không cập nhật được thông tin cá nhân.",
        ),
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveAddress(event) {
    event.preventDefault();
    const recipientName = addressForm.recipientName.trim();
    const phone = addressForm.phone.trim();
    if (!recipientName || !phone) {
      setNotice({
        type: "error",
        message: "Vui lòng nhập tên người nhận và số điện thoại.",
      });
      return;
    }

    setSavingAddress(true);
    setNotice(null);
    try {
      const payload = {
        recipientName,
        phone,
        label: addressForm.label.trim(),
        street: addressForm.street.trim(),
        district: addressForm.district.trim(),
        city: addressForm.city.trim(),
        defaultAddress: addressForm.defaultAddress,
      };
      const data = addressForm.id
        ? await updateUserAddress(accessToken, addressForm.id, payload)
        : await createUserAddress(accessToken, payload);
      const savedAddress = toAddressForm(data);
      setAddresses((prevAddresses) => {
        const withoutSaved = prevAddresses.filter(
          (address) => address.id !== savedAddress.id,
        );
        return [
          ...withoutSaved,
          {
            ...savedAddress,
            defaultAddress:
              savedAddress.defaultAddress || withoutSaved.length === 0,
          },
        ].sort((left, right) => {
          if (left.defaultAddress === right.defaultAddress) {
            return (right.id || 0) - (left.id || 0);
          }
          return left.defaultAddress ? -1 : 1;
        });
      });
      setAddressForm(savedAddress);
      setNotice({ type: "success", message: "Đã lưu địa chỉ thành công." });
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(error, "Không lưu được địa chỉ."),
      });
    } finally {
      setSavingAddress(false);
    }
  }

  async function refreshAddresses(selectedId) {
    const data = await getUserAddresses(accessToken);
    const nextAddresses = Array.isArray(data) ? data : [];
    setAddresses(nextAddresses);
    const selected =
      nextAddresses.find((address) => address.id === selectedId) ||
      nextAddresses[0] ||
      null;
    if (!editingAddress) {
      setAddressForm(toAddressForm(selected));
    }
  }

  async function handleDeleteAddress(addressId) {
    if (!addressId) return;
    setSavingAddress(true);
    setNotice(null);
    try {
      await deleteUserAddress(accessToken, addressId);
      await refreshAddresses();
      setNotice({ type: "success", message: "Đã xóa địa chỉ." });
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(error, "Không xóa được địa chỉ."),
      });
    } finally {
      setSavingAddress(false);
    }
  }

  function startNewAddress() {
    setAddressForm(emptyAddress);
  }

  function editAddress(address) {
    setAddressForm(toAddressForm(address));
  }

  async function handleChangePassword(event) {
    event.preventDefault();
    if (!passwordForm.currentPassword.trim()) {
      setNotice({ type: "error", message: "Vui lòng nhập mật khẩu hiện tại." });
      return;
    }
    if (!passwordOtpSent) {
      setNotice({
        type: "error",
        message: "Vui lòng gửi OTP trước khi đổi mật khẩu.",
      });
      return;
    }
    if (!passwordForm.otp.trim()) {
      setNotice({ type: "error", message: "Vui lòng nhập mã OTP." });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setNotice({ type: "error", message: "Mật khẩu xác nhận không khớp." });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setNotice({
        type: "error",
        message: "Mật khẩu mới cần ít nhất 8 ký tự.",
      });
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
      setPasswordForm({
        currentPassword: "",
        otp: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordOtpSent(false);
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

  async function handleSendPasswordOtp() {
    if (!profileEmail) {
      setNotice({ type: "error", message: "Không tìm thấy email tài khoản." });
      return;
    }

    setPasswordOtpSending(true);
    setNotice(null);
    try {
      await forgotPassword(profileEmail);
      setPasswordOtpSent(true);
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
      setPasswordOtpSending(false);
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

  return (
    <section className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="h-max rounded-2xl bg-[#f1f2fb] p-5 shadow-sm">
        <p className="mb-5 px-3 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">
          Cài đặt tài khoản
        </p>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex w-full items-center gap-3 rounded-md px-4 py-3 text-left text-sm font-bold transition ${
                activeTab === item.id
                  ? "bg-white text-[#075bd8] shadow-sm"
                  : "text-slate-600 hover:bg-white/70"
              }`}
            >
              <span className="material-symbols-outlined text-xl">
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="min-w-0">
        <header className="mb-7">
          <h2 className="text-4xl font-extrabold tracking-tight text-slate-950">
            {activeTab === "profile"
              ? "Thông tin cá nhân"
              : activeTab === "security"
                ? "Bảo mật"
                : "Địa chỉ"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {activeTab === "profile"
              ? "Cập nhật thông tin cá nhân và cách hiển thị của bạn trên hệ thống."
              : activeTab === "security"
                ? "Gửi OTP để xác nhận rồi mới đổi mật khẩu mới."
                : "Lưu địa chỉ nhận hàng vào user-service."}
          </p>
        </header>

        {notice && (
          <div
            className={`mb-5 rounded-lg border px-5 py-4 text-sm font-semibold ${
              notice.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {notice.message}
          </div>
        )}

        {activeTab === "profile" && (
          <form
            onSubmit={handleSaveProfile}
            className="rounded-lg bg-white p-8 shadow-sm"
          >
            <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative h-32 w-32 overflow-hidden rounded-xl bg-slate-100">
                {currentAvatar ? (
                  <img
                    src={currentAvatar}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl font-black text-slate-500">
                    {getInitial(displayName)}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-[#075bd8] text-white">
                  <span className="material-symbols-outlined text-lg">
                    edit
                  </span>
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-lg font-extrabold text-slate-950">
                  Ảnh đại diện của bạn
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  JPG, GIF hoặc PNG. Kích thước tối đa 2MB
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <label
                    className={`${secondaryButtonClass} inline-flex cursor-pointer items-center justify-center`}
                  >
                    Tải ảnh mới
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
                      className={secondaryButtonClass}
                    >
                      {savingAvatar ? "Đang tải..." : "Lưu ảnh"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleDeleteAvatar}
                    disabled={
                      deletingAvatar || (!profile?.avatarUrl && !avatarPreview)
                    }
                    className={dangerButtonClass}
                  >
                    {deletingAvatar ? "Đang xóa..." : "Xóa ảnh"}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <ProfileField label="Họ và tên">
                <input
                  type="text"
                  value={profileForm.fullName}
                  name="fullName"
                  autoComplete="off"
                  onChange={(event) =>
                    setProfileValue("fullName", event.target.value)
                  }
                  onFocus={() => setEditingProfile(true)}
                  onBlur={() => setEditingProfile(false)}
                  className="pointer-events-auto w-full rounded-[14px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition-all focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(7,91,216,0.14)] cursor-text"
                />
              </ProfileField>
              <ProfileField label="Vai trò">
                <input
                  value={profile?.role || ""}
                  disabled
                  className="w-full rounded-[14px] border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none cursor-not-allowed"
                />
              </ProfileField>
              <ProfileField label="Email" className="md:col-span-2">
                <input
                  type="email"
                  value={profile?.email || ""}
                  disabled
                  className="w-full rounded-[14px] border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none cursor-not-allowed"
                />
              </ProfileField>
              <ProfileField label="Số điện thoại">
                <input
                  type="text"
                  value={profileForm.phone}
                  name="phone"
                  autoComplete="off"
                  onChange={(event) =>
                    setProfileValue("phone", event.target.value)
                  }
                  onFocus={() => setEditingProfile(true)}
                  onBlur={() => setEditingProfile(false)}
                  className="pointer-events-auto w-full rounded-[14px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition-all focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(7,91,216,0.14)] cursor-text"
                  placeholder="+84 ..."
                />
              </ProfileField>
              <ProfileField label="Múi giờ">
                <select
                  disabled
                  className="w-full rounded-[14px] border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none cursor-not-allowed"
                >
                  <option>Asia/Saigon (ICT)</option>
                </select>
              </ProfileField>
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
        )}

        {activeTab === "security" && (
          <form
            onSubmit={handleChangePassword}
            className="max-w-3xl rounded-2xl bg-white p-8 shadow-sm"
          >
            <div className="mb-6 rounded-2xl bg-slate-50 p-5">
              <p className="text-sm font-bold text-slate-700">
                Email xác nhận:{" "}
                <span className="text-slate-950">
                  {profileEmail || "Chưa có email"}
                </span>
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Bấm gửi OTP, sau đó nhập mã OTP và mật khẩu mới để hoàn tất.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSendPasswordOtp}
                  disabled={passwordOtpSending || !profileEmail}
                  className={primaryButtonClass}
                >
                  {passwordOtpSending
                    ? "Đang gửi OTP..."
                    : passwordOtpSent
                      ? "Gửi lại OTP"
                      : "Gửi OTP"}
                </button>
                {passwordOtpSent ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700">
                    OTP đã được gửi
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid gap-5">
              <ProfileField label="Mật khẩu hiện tại">
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  name="currentPassword"
                  autoComplete="off"
                  onChange={(event) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      currentPassword: event.target.value,
                    }))
                  }
                  onFocus={() => setEditingProfile(true)}
                  onBlur={() => setEditingProfile(false)}
                  className="pointer-events-auto w-full rounded-[14px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition-all focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(7,91,216,0.14)] cursor-text"
                />
              </ProfileField>
              <ProfileField label="Mã OTP">
                <input
                  type="text"
                  value={passwordForm.otp}
                  name="otp"
                  autoComplete="off"
                  onChange={(event) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      otp: event.target.value,
                    }))
                  }
                  onFocus={() => setEditingProfile(true)}
                  onBlur={() => setEditingProfile(false)}
                  className="pointer-events-auto w-full rounded-[14px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition-all focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(7,91,216,0.14)] cursor-text"
                  placeholder="Nhập mã OTP 6 chữ số"
                />
              </ProfileField>
              <ProfileField label="Mật khẩu mới">
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  name="newPassword"
                  autoComplete="off"
                  onChange={(event) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      newPassword: event.target.value,
                    }))
                  }
                  onFocus={() => setEditingProfile(true)}
                  onBlur={() => setEditingProfile(false)}
                  className="pointer-events-auto w-full rounded-[14px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition-all focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(7,91,216,0.14)] cursor-text"
                />
              </ProfileField>
              <ProfileField label="Xác nhận mật khẩu mới">
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  name="confirmPassword"
                  autoComplete="off"
                  onChange={(event) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      confirmPassword: event.target.value,
                    }))
                  }
                  className="pointer-events-auto w-full rounded-[14px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition-all focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(7,91,216,0.14)] cursor-text"
                />
              </ProfileField>
            </div>
            <FormActions
              saving={savingPassword}
              saveLabel="Xác nhận đổi mật khẩu"
              savingLabel="Đang xử lý..."
              onDiscard={() => {
                setPasswordForm({
                  currentPassword: "",
                  otp: "",
                  newPassword: "",
                  confirmPassword: "",
                });
                setPasswordOtpSent(false);
                setNotice(null);
              }}
            />
          </form>
        )}

        {activeTab === "addresses" && (
          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-lg font-extrabold text-slate-950">
                  Địa chỉ đã lưu
                </h3>
                <button
                  type="button"
                  onClick={startNewAddress}
                  className={secondaryButtonClass}
                >
                  Thêm mới
                </button>
              </div>
              <div className="space-y-3">
                {addresses.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                    Chưa có địa chỉ nào.
                  </div>
                ) : (
                  addresses.map((address) => (
                    <button
                      key={address.id}
                      type="button"
                      onClick={() => editAddress(address)}
                      className={`w-full rounded-lg border p-4 text-left transition ${
                        addressForm.id === address.id
                          ? "border-[#075bd8] bg-blue-50"
                          : "border-slate-200 bg-slate-50 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-extrabold text-slate-950">
                              {address.recipientName || "Người nhận"}
                            </p>
                            {address.defaultAddress ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
                                Mặc định
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm text-slate-600">
                            {address.phone || "-"}
                          </p>
                          <p className="mt-2 text-sm text-slate-700">
                            {[address.street, address.district, address.city]
                              .filter(Boolean)
                              .join(", ") || "Chưa nhập địa chỉ"}
                          </p>
                        </div>
                        <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-slate-500">
                          {address.label || "Địa chỉ"}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>

            <form
              onSubmit={handleSaveAddress}
              className="rounded-2xl bg-white p-8 shadow-sm"
            >
              <div className="grid gap-5 md:grid-cols-2">
                <ProfileField label="Người nhận">
                  <input
                    type="text"
                    value={addressForm.recipientName}
                    name="recipientName"
                    autoComplete="off"
                    onChange={(event) =>
                      setAddressValue("recipientName", event.target.value)
                    }
                    onFocus={() => setEditingAddress(true)}
                    onBlur={() => setEditingAddress(false)}
                    className="pointer-events-auto w-full rounded-[14px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition-all focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(7,91,216,0.14)] cursor-text"
                  />
                </ProfileField>
                <ProfileField label="Số điện thoại">
                  <input
                    type="tel"
                    value={addressForm.phone}
                    name="phone"
                    autoComplete="off"
                    onChange={(event) =>
                      setAddressValue("phone", event.target.value)
                    }
                    onFocus={() => setEditingAddress(true)}
                    onBlur={() => setEditingAddress(false)}
                    className="pointer-events-auto w-full rounded-[14px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition-all focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(7,91,216,0.14)] cursor-text"
                  />
                </ProfileField>
                <ProfileField label="Nhãn">
                  <input
                    type="text"
                    value={addressForm.label}
                    name="label"
                    autoComplete="off"
                    onChange={(event) =>
                      setAddressValue("label", event.target.value)
                    }
                    onFocus={() => setEditingAddress(true)}
                    onBlur={() => setEditingAddress(false)}
                    className="pointer-events-auto w-full rounded-[14px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition-all focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(7,91,216,0.14)] cursor-text"
                    placeholder="Nhà, Văn phòng..."
                  />
                </ProfileField>
                <ProfileField label="Tỉnh / Thành phố">
                  <input
                    type="text"
                    value={addressForm.city}
                    name="city"
                    autoComplete="off"
                    onChange={(event) =>
                      setAddressValue("city", event.target.value)
                    }
                    onFocus={() => setEditingAddress(true)}
                    onBlur={() => setEditingAddress(false)}
                    className="pointer-events-auto w-full rounded-[14px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition-all focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(7,91,216,0.14)] cursor-text"
                  />
                </ProfileField>
                <ProfileField label="Đường / Số nhà" className="md:col-span-2">
                  <input
                    type="text"
                    value={addressForm.street}
                    name="street"
                    autoComplete="off"
                    onChange={(event) =>
                      setAddressValue("street", event.target.value)
                    }
                    onFocus={() => setEditingAddress(true)}
                    onBlur={() => setEditingAddress(false)}
                    className="pointer-events-auto w-full rounded-[14px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition-all focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(7,91,216,0.14)] cursor-text"
                  />
                </ProfileField>
                <ProfileField label="Quận / Huyện" className="md:col-span-2">
                  <input
                    type="text"
                    value={addressForm.district}
                    name="district"
                    autoComplete="off"
                    onChange={(event) =>
                      setAddressValue("district", event.target.value)
                    }
                    onFocus={() => setEditingAddress(true)}
                    onBlur={() => setEditingAddress(false)}
                    className="pointer-events-auto w-full rounded-[14px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition-all focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(7,91,216,0.14)] cursor-text"
                  />
                </ProfileField>
              </div>

              <label className="mt-5 flex items-center gap-3 text-sm font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={addressForm.defaultAddress}
                  onChange={(event) =>
                    setAddressValue("defaultAddress", event.target.checked)
                  }
                  className="h-4 w-4"
                />
                Đặt làm địa chỉ mặc định
              </label>

              <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
                {addressForm.id ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteAddress(addressForm.id)}
                    disabled={savingAddress}
                    className={dangerButtonClass}
                  >
                    Xóa
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={startNewAddress}
                  className={secondaryButtonClass}
                >
                  Xóa form
                </button>
                <button
                  type="submit"
                  disabled={savingAddress}
                  className={primaryButtonClass}
                >
                  {savingAddress
                    ? "Đang lưu..."
                    : addressForm.id
                      ? "Cập nhật địa chỉ"
                      : "Tạo địa chỉ"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}

function ProfileField({ label, className = "", children }) {
  return (
    <label className={`pointer-events-auto block ${className}`}>
      <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function FormActions({ saving, saveLabel, savingLabel, onDiscard }) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-end gap-4">
      <button
        type="button"
        onClick={onDiscard}
        className={secondaryButtonClass}
      >
        Hủy thay đổi
      </button>
      <button type="submit" disabled={saving} className={primaryButtonClass}>
        {saving ? savingLabel : saveLabel}
      </button>
    </div>
  );
}
