import { useEffect, useMemo, useState } from "react";
import {
  changePassword,
  deleteProfileAvatar,
  updateProfileAvatar,
} from "../../api/authApi";
import {
  getUserAddress,
  getUserProfile,
  updateUserAddress,
  updateUserProfile,
} from "../../api/userApi";

const emptyAddress = {
  street: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

function getInitial(nameOrEmail) {
  return String(nameOrEmail || "U").trim().charAt(0).toUpperCase();
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
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
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [deletingAvatar, setDeletingAvatar] = useState(false);
  const [notice, setNotice] = useState(null);

  const displayName = profile?.fullName || profile?.email || "Người dùng";
  const currentAvatar = avatarPreview || profile?.avatarUrl || "";

  const navItems = useMemo(
    () => [
      { id: "profile", icon: "person", label: "Profile Info" },
      { id: "security", icon: "shield", label: "Security" },
      { id: "addresses", icon: "location_on", label: "Addresses" },
    ],
    [],
  );

  useEffect(() => {
    let cancelled = false;
    if (!accessToken) return undefined;

    setLoading(true);
    Promise.allSettled([getUserProfile(accessToken), getUserAddress(accessToken)])
      .then(([profileResult, addressResult]) => {
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

        if (addressResult.status === "fulfilled" && addressResult.value) {
          setAddressForm({
            street: addressResult.value.street || "",
            city: addressResult.value.city || "",
            state: addressResult.value.state || "",
            postalCode: addressResult.value.postalCode || "",
            country: addressResult.value.country || "",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(
    () => () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    },
    [avatarPreview],
  );

  function updateLocalProfile(nextProfile) {
    const merged = { ...(profile || {}), ...(nextProfile || {}) };
    setProfile(merged);
    setProfileForm({
      fullName: merged.fullName || "",
      phone: merged.phone || "",
    });
    onUserUpdate?.(merged);
  }

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
        message: getErrorMessage(error, "Không cập nhật được thông tin cá nhân."),
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveAddress(event) {
    event.preventDefault();
    setSavingAddress(true);
    setNotice(null);
    try {
      const data = await updateUserAddress(accessToken, {
        street: addressForm.street.trim(),
        city: addressForm.city.trim(),
        state: addressForm.state.trim(),
        postalCode: addressForm.postalCode.trim(),
        country: addressForm.country.trim(),
      });
      setAddressForm({
        street: data?.street || "",
        city: data?.city || "",
        state: data?.state || "",
        postalCode: data?.postalCode || "",
        country: data?.country || "",
      });
      setNotice({ type: "success", message: "Đã lưu địa chỉ vào user-service." });
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(error, "Không lưu được địa chỉ."),
      });
    } finally {
      setSavingAddress(false);
    }
  }

  async function handleChangePassword(event) {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setNotice({ type: "error", message: "Mật khẩu xác nhận không khớp." });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setNotice({ type: "error", message: "Mật khẩu mới cần ít nhất 8 ký tự." });
      return;
    }

    setSavingPassword(true);
    setNotice(null);
    try {
      const data = await changePassword(accessToken, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
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
      <aside className="h-max rounded-lg bg-[#f1f2fb] p-5">
        <p className="mb-5 px-3 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">
          Account Settings
        </p>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex w-full items-center gap-3 rounded-md px-4 py-3 text-left text-sm font-bold transition ${
                activeTab === item.id
                  ? "bg-[#dfe2ee] text-[#075bd8]"
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
              ? "Profile Info"
              : activeTab === "security"
                ? "Security"
                : "Addresses"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {activeTab === "profile"
              ? "Update your personal details and how others see you on the platform."
              : activeTab === "security"
                ? "Change your password through auth-service."
                : "Save your delivery address to the address table in user-service."}
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
                  <span className="material-symbols-outlined text-lg">edit</span>
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-lg font-extrabold text-slate-950">
                  Your Profile Picture
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  JPG, GIF or PNG. Max size of 2MB
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-md bg-[#edf0f7] px-4 py-2 text-sm font-extrabold text-slate-900 transition hover:bg-[#e2e6f1]">
                    Upload New
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
                      className="rounded-md bg-[#075bd8] px-4 py-2 text-sm font-extrabold text-white disabled:opacity-60"
                    >
                      {savingAvatar ? "Uploading..." : "Save Photo"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleDeleteAvatar}
                    disabled={deletingAvatar || (!profile?.avatarUrl && !avatarPreview)}
                    className="rounded-md px-4 py-2 text-sm font-extrabold text-red-600 disabled:opacity-50"
                  >
                    {deletingAvatar ? "Removing..." : "Remove"}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <ProfileField label="Full Name">
                <input
                  value={profileForm.fullName}
                  onChange={(event) => setProfileValue("fullName", event.target.value)}
                  className="profile-input"
                />
              </ProfileField>
              <ProfileField label="Professional Title">
                <input
                  value={profile?.role || ""}
                  disabled
                  className="profile-input text-slate-500"
                />
              </ProfileField>
              <ProfileField label="Email Address" className="md:col-span-2">
                <input
                  type="email"
                  value={profile?.email || ""}
                  disabled
                  className="profile-input text-slate-500"
                />
              </ProfileField>
              <ProfileField label="Phone Number">
                <input
                  value={profileForm.phone}
                  onChange={(event) => setProfileValue("phone", event.target.value)}
                  className="profile-input"
                  placeholder="+84 ..."
                />
              </ProfileField>
              <ProfileField label="Timezone">
                <select disabled className="profile-input text-slate-500">
                  <option>Asia/Saigon (ICT)</option>
                </select>
              </ProfileField>
            </div>

            <FormActions
              saving={savingProfile || loading}
              saveLabel="Save Changes"
              savingLabel="Saving..."
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
            className="max-w-3xl rounded-lg bg-white p-8 shadow-sm"
          >
            <div className="grid gap-5">
              <ProfileField label="Current Password">
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      currentPassword: event.target.value,
                    }))
                  }
                  className="profile-input"
                />
              </ProfileField>
              <ProfileField label="New Password">
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      newPassword: event.target.value,
                    }))
                  }
                  className="profile-input"
                />
              </ProfileField>
              <ProfileField label="Confirm New Password">
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      confirmPassword: event.target.value,
                    }))
                  }
                  className="profile-input"
                />
              </ProfileField>
            </div>
            <FormActions
              saving={savingPassword}
              saveLabel="Update Password"
              savingLabel="Updating..."
              onDiscard={() =>
                setPasswordForm({
                  currentPassword: "",
                  newPassword: "",
                  confirmPassword: "",
                })
              }
            />
          </form>
        )}

        {activeTab === "addresses" && (
          <form
            onSubmit={handleSaveAddress}
            className="rounded-lg bg-white p-8 shadow-sm"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <ProfileField label="Street" className="md:col-span-2">
                <input
                  value={addressForm.street}
                  onChange={(event) => setAddressValue("street", event.target.value)}
                  className="profile-input"
                />
              </ProfileField>
              <ProfileField label="City">
                <input
                  value={addressForm.city}
                  onChange={(event) => setAddressValue("city", event.target.value)}
                  className="profile-input"
                />
              </ProfileField>
              <ProfileField label="State">
                <input
                  value={addressForm.state}
                  onChange={(event) => setAddressValue("state", event.target.value)}
                  className="profile-input"
                />
              </ProfileField>
              <ProfileField label="Postal Code">
                <input
                  value={addressForm.postalCode}
                  onChange={(event) =>
                    setAddressValue("postalCode", event.target.value)
                  }
                  className="profile-input"
                />
              </ProfileField>
              <ProfileField label="Country">
                <input
                  value={addressForm.country}
                  onChange={(event) => setAddressValue("country", event.target.value)}
                  className="profile-input"
                />
              </ProfileField>
            </div>
            <FormActions
              saving={savingAddress}
              saveLabel="Save Address"
              savingLabel="Saving..."
              onDiscard={() => setNotice(null)}
            />
          </form>
        )}
      </div>
    </section>
  );
}

function ProfileField({ label, className = "", children }) {
  return (
    <label className={`block ${className}`}>
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
        className="rounded-md px-4 py-3 text-sm font-extrabold text-[#075bd8] transition hover:bg-[#edf0f7]"
      >
        Discard Changes
      </button>
      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-[#a84600] px-7 py-3 text-sm font-extrabold text-white transition hover:bg-[#8f3900] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? savingLabel : saveLabel}
      </button>
    </div>
  );
}
