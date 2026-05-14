import { useEffect, useMemo, useState } from "react";
import {
  deleteProfileAvatar,
  getProfile,
  updateProfile,
  updateProfileAvatar,
} from "../../api/authApi";

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

export default function AccountProfilePage({ user, onUserUpdate }) {
  const accessToken = localStorage.getItem("authToken") || "";
  const [profile, setProfile] = useState(user || null);
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [deletingAvatar, setDeletingAvatar] = useState(false);
  const [notice, setNotice] = useState(null);

  const displayName = profile?.fullName || profile?.email || "Người dùng";
  const currentAvatar = avatarPreview || profile?.avatarUrl || "";

  const accountRows = useMemo(
    () => [
      ["Email", profile?.email || "-"],
      ["Vai trò", profile?.role || "-"],
      ["Trạng thái", profile?.status || "-"],
      ["Mã tài khoản", profile?.id ? `#${profile.id}` : "-"],
    ],
    [profile],
  );

  useEffect(() => {
    let cancelled = false;
    if (!accessToken) {
      return undefined;
    }

    setLoading(true);
    getProfile(accessToken)
      .then((data) => {
        if (cancelled) {
          return;
        }
        setProfile(data);
        setFullName(data?.fullName || "");
        onUserUpdate?.(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setNotice({
            type: "error",
            message: getErrorMessage(
              error,
              "Không tải được thông tin tài khoản.",
            ),
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
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

  function updateLocalProfile(nextProfile) {
    setProfile(nextProfile);
    setFullName(nextProfile?.fullName || "");
    onUserUpdate?.(nextProfile);
  }

  async function handleSaveProfile(event) {
    event.preventDefault();
    const normalizedFullName = fullName.trim();
    if (!normalizedFullName) {
      setNotice({ type: "error", message: "Họ tên không được để trống." });
      return;
    }

    setSavingProfile(true);
    setNotice(null);
    try {
      const data = await updateProfile(accessToken, {
        fullName: normalizedFullName,
      });
      updateLocalProfile(data);
      setNotice({
        type: "success",
        message: "Đã cập nhật thông tin tài khoản.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(
          error,
          "Không cập nhật được thông tin tài khoản.",
        ),
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
      setNotice({ type: "success", message: "Đã lưu ảnh đại diện lên S3." });
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
      setNotice({ type: "success", message: "Đã bỏ ảnh vừa chọn." });
      return;
    }

    if (!profile?.avatarUrl) {
      setAvatarFile(null);
      setAvatarPreview("");
      return;
    }

    if (!window.confirm("Bạn có muốn xóa ảnh đại diện hiện tại không?")) {
      return;
    }

    setDeletingAvatar(true);
    setNotice(null);
    try {
      const data = await deleteProfileAvatar(accessToken);
      updateLocalProfile(data);
      setAvatarFile(null);
      setAvatarPreview("");
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
    <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <aside className="rounded-3xl border border-white/70 bg-white/95 p-6 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.3)]">
        <div className="flex flex-col items-center text-center">
          <div className="h-40 w-40 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
            {currentAvatar ? (
              <img
                src={currentAvatar}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-5xl font-black text-slate-500">
                {getInitial(displayName)}
              </div>
            )}
          </div>
          <h2 className="mt-5 text-2xl font-black text-slate-950">
            {displayName}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{profile?.email}</p>
        </div>

        <dl className="mt-6 space-y-3 text-sm">
          {accountRows.map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
            >
              <dt className="text-slate-500">{label}</dt>
              <dd className="font-semibold text-slate-950">{value}</dd>
            </div>
          ))}
        </dl>
      </aside>

      <div className="space-y-6">
        {notice && (
          <div
            className={`rounded-2xl border px-5 py-4 text-sm font-semibold ${
              notice.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {notice.message}
          </div>
        )}

        <form
          onSubmit={handleSaveProfile}
          className="rounded-3xl border border-white/70 bg-white/95 p-6 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.3)]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-600">
            Hồ sơ tài khoản
          </p>
          <h3 className="mt-2 text-xl font-bold text-slate-950">
            Cập nhật thông tin cá nhân
          </h3>
          <div className="mt-5 grid gap-4">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Họ và tên
              </span>
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Email
              </span>
              <input
                type="email"
                value={profile?.email || ""}
                disabled
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 text-sm text-slate-500"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={savingProfile || loading}
            className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingProfile ? "Đang lưu..." : "Lưu thông tin"}
          </button>
        </form>

        <div className="rounded-3xl border border-white/70 bg-white/95 p-6 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.3)]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-600">
            Ảnh đại diện
          </p>
          <h3 className="mt-2 text-xl font-bold text-slate-950">
            Thêm, sửa hoặc xóa avatar
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Ảnh được upload lên S3 và URL công khai được lưu vào RDS tại cột
            avatar_url của tài khoản.
          </p>

          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (avatarPreview) {
                  URL.revokeObjectURL(avatarPreview);
                }
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
            <p className="mt-3 text-xs text-slate-500">
              Chấp nhận file ảnh, tối đa 2MB.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={savingAvatar || !avatarFile}
              onClick={handleSaveAvatar}
              className="rounded-2xl bg-orange-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingAvatar ? "Đang upload..." : "Lưu ảnh đại diện"}
            </button>
            <button
              type="button"
              disabled={
                deletingAvatar || (!profile?.avatarUrl && !avatarPreview)
              }
              onClick={handleDeleteAvatar}
              className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deletingAvatar ? "Đang xóa..." : "Xóa ảnh đại diện"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
