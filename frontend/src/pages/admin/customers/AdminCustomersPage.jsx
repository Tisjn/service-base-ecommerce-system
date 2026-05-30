import { useEffect, useMemo, useState } from "react";
import {
  deleteUserById,
  getUserById,
  listUsers,
  updateUserById,
  updateUserStatusById,
} from "../../../api/userApi";
import { useIncrementalRows } from "../../../hooks/useIncrementalRows";
import { formatDateTime } from "../../customer/orders/orderUtils";

const initialFormState = {
  fullName: "",
  avatarUrl: "",
  phone: "",
  address: "",
  status: "ACTIVE",
};

const statusLabels = {
  ACTIVE: "Đang hoạt động",
  LOCKED: "Đã khóa",
  DELETED: "Đã xóa",
};

const CUSTOMER_FAST_RENDER_MS = 900;
const CUSTOMER_CACHE_TTL_MS = 2 * 60 * 1000;
const CUSTOMER_CACHE_PREFIX = "dtpshop.admin.customers.";

function readCustomerCache(key) {
  if (typeof window === "undefined") return null;
  try {
    const storageKey = `${CUSTOMER_CACHE_PREFIX}${key}`;
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed?.savedAt ||
      Date.now() - parsed.savedAt > CUSTOMER_CACHE_TTL_MS
    ) {
      window.sessionStorage.removeItem(storageKey);
      return null;
    }
    return parsed.value ?? null;
  } catch {
    return null;
  }
}

function writeCustomerCache(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      `${CUSTOMER_CACHE_PREFIX}${key}`,
      JSON.stringify({ savedAt: Date.now(), value }),
    );
  } catch {
    // Fresh API data is still rendered when sessionStorage is unavailable.
  }
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function normalizeStatus(status) {
  return String(status || "ACTIVE").toUpperCase();
}

function buildForm(user) {
  return {
    fullName: user?.fullName || "",
    avatarUrl: user?.avatarUrl || "",
    phone: user?.phone || "",
    address: user?.address || "",
    status: normalizeStatus(user?.status),
  };
}

function getUserId(user) {
  return String(user?.id || user?.userId || user?.accountId || "");
}

function isAdminAccount(user) {
  return String(user?.role || user?.roles?.[0] || user?.authorities?.[0] || "")
    .toUpperCase()
    .includes("ADMIN");
}

export default function AdminCustomersPage({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [filter, setFilter] = useState({ search: "", status: "" });
  const [form, setForm] = useState(initialFormState);
  const [notification, setNotification] = useState(null);

  const visibleUsers = useMemo(() => {
    const currentUserId = getUserId(currentUser);
    return users.filter((user) => {
      const isCurrentUser = currentUserId && String(user.id) === currentUserId;
      return !isCurrentUser && !isAdminAccount(user);
    });
  }, [currentUser, users]);

  const stats = useMemo(() => {
    const active = visibleUsers.filter((user) => normalizeStatus(user.status) === "ACTIVE").length;
    const locked = visibleUsers.filter((user) => normalizeStatus(user.status) === "LOCKED").length;
    return {
      total: visibleUsers.length,
      active,
      locked,
    };
  }, [visibleUsers]);

  const filteredUsers = useMemo(() => {
    const keyword = filter.search.trim().toLowerCase();
    return visibleUsers.filter((user) => {
      const statusMatch = filter.status
        ? normalizeStatus(user.status) === filter.status
        : true;
      const textMatch = keyword
        ? [user.id, user.email, user.fullName, user.phone, user.role]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(keyword))
        : true;
      return statusMatch && textMatch;
    });
  }, [filter.search, filter.status, visibleUsers]);

  const {
    visibleItems: visibleFilteredUsers,
    visibleCount,
    totalCount,
    hasMore,
    handleScroll,
  } = useIncrementalRows(filteredUsers);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (!notification) return undefined;
    const timer = window.setTimeout(() => setNotification(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notification]);

  function showNotification(type, text) {
    setNotification({ type, text });
  }

  async function loadUsers() {
    const cached = readCustomerCache("list");
    if (cached) {
      setUsers(Array.isArray(cached) ? cached : []);
      setLoading(false);
    } else {
      setLoading(true);
    }
    const fastRenderTimer = window.setTimeout(
      () => setLoading(false),
      CUSTOMER_FAST_RENDER_MS,
    );
    try {
      const data = await listUsers();
      const nextUsers = Array.isArray(data) ? data : [];
      setUsers(nextUsers);
      writeCustomerCache("list", nextUsers);
    } catch (error) {
      showNotification(
        "error",
        getErrorMessage(error, "Không tải được danh sách tài khoản."),
      );
    } finally {
      window.clearTimeout(fastRenderTimer);
      setLoading(false);
    }
  }

  async function openUserDetail(userId) {
    const cacheKey = `detail:${userId}`;
    const cached = readCustomerCache(cacheKey);
    if (cached) {
      setSelectedUser(cached);
      setForm(buildForm(cached));
      setDetailLoading(false);
    } else {
      setDetailLoading(true);
    }
    setEditing(false);
    const fastRenderTimer = window.setTimeout(
      () => setDetailLoading(false),
      CUSTOMER_FAST_RENDER_MS,
    );
    try {
      const data = await getUserById(userId);
      setSelectedUser(data);
      setForm(buildForm(data));
      writeCustomerCache(cacheKey, data);
    } catch (error) {
      showNotification(
        "error",
        getErrorMessage(error, "Không tải được chi tiết tài khoản."),
      );
    } finally {
      window.clearTimeout(fastRenderTimer);
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setSelectedUser(null);
    setEditing(false);
    setForm(initialFormState);
  }

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function saveEdit() {
    if (!selectedUser) return;
    if (!form.fullName.trim()) {
      showNotification("error", "Họ tên không được để trống.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        avatarUrl: form.avatarUrl.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      };
      await updateUserById(selectedUser.id, payload);

      if (normalizeStatus(selectedUser.status) !== form.status) {
        await updateUserStatusById(selectedUser.id, form.status);
      }

      showNotification("success", "Đã cập nhật thông tin tài khoản.");
      await loadUsers();
      await openUserDetail(selectedUser.id);
      setEditing(false);
    } catch (error) {
      showNotification(
        "error",
        getErrorMessage(error, "Không cập nhật được tài khoản."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user) {
    const label = user.fullName || user.email || `#${user.id}`;
    if (
      !window.confirm(
        `Xóa tài khoản ${label}? Chỉ tài khoản chưa từng đặt hàng mới được xóa.`,
      )
    ) {
      return;
    }

    try {
      await deleteUserById(user.id);
      showNotification("success", "Đã xóa tài khoản.");
      await loadUsers();
      if (selectedUser?.id === user.id) {
        closeDetail();
      }
    } catch (error) {
      showNotification(
        "error",
        getErrorMessage(
          error,
          "Không xóa được tài khoản. Tài khoản đã từng đặt hàng chỉ có thể khóa.",
        ),
      );
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-10">
      <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="mb-2 text-4xl font-extrabold tracking-tight text-[#191b23] [font-family:Manrope,system-ui,sans-serif]">
            Quản lý tài khoản người dùng
          </h2>
          <p className="text-[#434655]">
            Xem danh sách, xem chi tiết không hiển thị mật khẩu, cập nhật thông
            tin và xóa tài khoản khi chưa từng đặt hàng.
          </p>
        </div>
        <button
          type="button"
          onClick={loadUsers}
          className="flex items-center justify-center gap-2 rounded-xl border border-[#c3c6d7]/30 bg-white px-5 py-3 font-semibold text-[#004ac6] shadow-sm transition hover:bg-[#f3f3fe] active:scale-95"
        >
          <span className="material-symbols-outlined">refresh</span>
          <span>Tải lại</span>
        </button>
      </div>

      <div className="mb-8 grid gap-5 md:grid-cols-3">
        <StatCard label="Tổng tài khoản" value={stats.total} icon="group" />
        <StatCard label="Đang hoạt động" value={stats.active} icon="verified_user" />
        <StatCard label="Đã khóa" value={stats.locked} icon="lock" tone="warning" />
      </div>

      <section className="mb-6 rounded-2xl border border-[#c3c6d7]/10 bg-[#f3f3fe] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#737686]">
              search
            </span>
            <input
              type="text"
              value={filter.search}
              onChange={(event) =>
                setFilter((prev) => ({ ...prev, search: event.target.value }))
              }
              placeholder="Tìm theo tên, email, số điện thoại..."
              className="w-full rounded-xl border border-[#c3c6d7]/30 bg-white py-3 pl-11 pr-4 text-sm text-[#191b23] outline-none transition focus:border-[#004ac6] focus:ring-2 focus:ring-[#004ac6]/20"
            />
          </label>
          <select
            value={filter.status}
            onChange={(event) =>
              setFilter((prev) => ({ ...prev, status: event.target.value }))
            }
            className="rounded-xl border border-[#c3c6d7]/30 bg-white px-4 py-3 text-sm font-semibold text-[#191b23] outline-none focus:border-[#004ac6] focus:ring-2 focus:ring-[#004ac6]/20"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="LOCKED">Đã khóa</option>
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#c3c6d7]/10 bg-[#f3f3fe] shadow-sm">
        <div className="max-h-[640px] overflow-auto" onScroll={handleScroll}>
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#e7e7f3]">
                <TableHead>Tài khoản</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead align="right">Thao tác</TableHead>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c3c6d7]/20">
              {loading ? (
                <EmptyRow text="Đang tải danh sách tài khoản..." />
              ) : filteredUsers.length === 0 ? (
                <EmptyRow text="Không có tài khoản phù hợp." />
              ) : (
                visibleFilteredUsers.map((user) => (
                  <CustomerRow
                    key={user.id}
                    user={user}
                    onView={() => openUserDetail(user.id)}
                    onDelete={() => handleDelete(user)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-[#c3c6d7]/20 bg-[#e1e2ed]/30 px-6 py-4 text-sm font-medium text-[#434655] sm:flex-row sm:items-center sm:justify-between">
          <p>
            Đã hiển thị{" "}
            <span className="font-bold text-[#191b23]">{visibleCount}</span>{" "}
            trong số <span className="font-bold text-[#191b23]">{totalCount}</span>{" "}
            tài khoản
          </p>
          {totalCount > 0 ? (
            <span className="rounded-lg bg-[#004ac6] px-3 py-2 text-xs font-bold text-white">
              {hasMore ? "Cuộn để tải thêm" : "Đã tải hết"}
            </span>
          ) : null}
        </div>
      </section>

      {selectedUser && (
        <CustomerDetailModal
          user={selectedUser}
          form={form}
          editing={editing}
          loading={detailLoading}
          saving={saving}
          onClose={closeDetail}
          onEdit={() => setEditing(true)}
          onCancelEdit={() => {
            setForm(buildForm(selectedUser));
            setEditing(false);
          }}
          onChange={updateForm}
          onSave={saveEdit}
          onDelete={() => handleDelete(selectedUser)}
        />
      )}

      {notification && (
        <Toast
          notification={notification}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon, tone = "default" }) {
  const iconClass =
    tone === "warning"
      ? "bg-[#fd761a]/10 text-[#9d4300]"
      : "bg-[#004ac6]/10 text-[#004ac6]";

  return (
    <div className="rounded-2xl border border-[#c3c6d7]/10 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#737686]">
            {label}
          </p>
          <p className="mt-3 text-3xl font-extrabold text-[#191b23] [font-family:Manrope,system-ui,sans-serif]">
            {value}
          </p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconClass}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
      </div>
    </div>
  );
}

function CustomerRow({ user, onView, onDelete }) {
  return (
    <tr className="bg-white/80 transition hover:bg-white">
      <td className="px-6 py-5">
        <div className="flex min-w-72 items-center gap-4">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.fullName || user.email}
              className="h-11 w-11 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#004ac6]/10 text-sm font-extrabold text-[#004ac6]">
              {(user.fullName || user.email || "?").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-bold text-[#191b23]">{user.fullName || "Chưa có tên"}</p>
            <p className="text-sm text-[#434655]">{user.email}</p>
            <p className="text-xs text-[#737686]">ID #{user.id}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-5 text-sm font-semibold text-[#434655]">
        {user.role || "CUSTOMER"}
      </td>
      <td className="px-6 py-5">
        <StatusBadge status={user.status} />
      </td>
      <td className="px-6 py-5 text-sm text-[#434655]">
        {formatDateTime(user.createdAt)}
      </td>
      <td className="px-6 py-5">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onView}
            className="rounded-lg border border-[#c3c6d7]/30 bg-white px-3 py-2 text-sm font-bold text-[#004ac6] transition hover:bg-[#ededf9]"
          >
            Chi tiết
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100"
          >
            Xóa
          </button>
        </div>
      </td>
    </tr>
  );
}

function CustomerDetailModal({
  user,
  form,
  editing,
  loading,
  saving,
  onClose,
  onEdit,
  onCancelEdit,
  onChange,
  onSave,
  onDelete,
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#c3c6d7]/20 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#737686]">
              Chi tiết tài khoản
            </p>
            <h3 className="mt-1 text-2xl font-extrabold text-[#191b23]">
              {user.fullName || user.email}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#434655] transition hover:bg-[#f3f3fe]"
            aria-label="Đóng"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {loading ? (
          <div className="px-6 py-10 text-center text-[#434655]">
            Đang tải chi tiết tài khoản...
          </div>
        ) : (
          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[220px_1fr]">
            <aside className="rounded-2xl bg-[#f3f3fe] p-5">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName || user.email}
                  className="mx-auto h-24 w-24 rounded-full object-cover"
                />
              ) : (
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#004ac6]/10 text-3xl font-extrabold text-[#004ac6]">
                  {(user.fullName || user.email || "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="mt-5 space-y-3 text-sm">
                <InfoLine label="ID" value={`#${user.id}`} />
                <InfoLine label="Email" value={user.email || "-"} />
                <InfoLine label="Vai trò" value={user.role || "CUSTOMER"} />
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#737686]">
                    Trạng thái
                  </p>
                  <div className="mt-1">
                    <StatusBadge status={user.status} />
                  </div>
                </div>
              </div>
            </aside>

            <div>
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Mật khẩu không được trả về từ user-service và không hiển thị trên
                màn hình quản trị.
              </div>

              <div className="grid gap-4">
                <FormField
                  label="Họ và tên"
                  value={form.fullName}
                  readValue={user.fullName || "-"}
                  editing={editing}
                  onChange={(value) => onChange("fullName", value)}
                />
                <FormField
                  label="Số điện thoại"
                  value={form.phone}
                  readValue={user.phone || "-"}
                  editing={editing}
                  onChange={(value) => onChange("phone", value)}
                />
                <FormField
                  label="Địa chỉ"
                  value={form.address}
                  readValue={user.address || "-"}
                  editing={editing}
                  onChange={(value) => onChange("address", value)}
                />
                <FormField
                  label="Avatar URL"
                  value={form.avatarUrl}
                  readValue={user.avatarUrl || "-"}
                  editing={editing}
                  onChange={(value) => onChange("avatarUrl", value)}
                />

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-[#737686]">
                    Trạng thái tài khoản
                  </label>
                  {editing ? (
                    <select
                      value={form.status}
                      onChange={(event) => onChange("status", event.target.value)}
                      className="mt-2 w-full rounded-xl border border-[#c3c6d7]/40 bg-white px-4 py-3 text-sm text-[#191b23] outline-none focus:border-[#004ac6] focus:ring-2 focus:ring-[#004ac6]/20"
                    >
                      <option value="ACTIVE">Đang hoạt động</option>
                      <option value="LOCKED">Đã khóa</option>
                    </select>
                  ) : (
                    <p className="mt-2 text-sm font-semibold text-[#191b23]">
                      {statusLabels[normalizeStatus(user.status)] || user.status || "-"}
                    </p>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <InfoLine label="Ngày tạo" value={formatDateTime(user.createdAt)} />
                  <InfoLine label="Cập nhật gần nhất" value={formatDateTime(user.updatedAt)} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-[#c3c6d7]/20 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-100"
          >
            <span className="material-symbols-outlined">delete</span>
            <span>Xóa nếu chưa đặt hàng</span>
          </button>

          <div className="flex justify-end gap-3">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={onCancelEdit}
                  disabled={saving}
                  className="rounded-xl border border-[#c3c6d7]/30 bg-white px-5 py-3 text-sm font-bold text-[#434655] transition hover:bg-[#f3f3fe] disabled:opacity-60"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving}
                  className="rounded-xl bg-[#004ac6] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#003fa8] disabled:opacity-60"
                >
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#004ac6] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#003fa8]"
              >
                <span className="material-symbols-outlined">edit</span>
                <span>Cập nhật thông tin</span>
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function FormField({ label, value, readValue, editing, onChange }) {
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-widest text-[#737686]">
        {label}
      </label>
      {editing ? (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2 w-full rounded-xl border border-[#c3c6d7]/40 bg-white px-4 py-3 text-sm text-[#191b23] outline-none focus:border-[#004ac6] focus:ring-2 focus:ring-[#004ac6]/20"
        />
      ) : (
        <p className="mt-2 break-words text-sm font-semibold text-[#191b23]">
          {readValue}
        </p>
      )}
    </div>
  );
}

function InfoLine({ label, value }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-[#737686]">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-[#191b23]">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const normalized = normalizeStatus(status);
  const className =
    normalized === "LOCKED"
      ? "bg-orange-100 text-orange-700"
      : normalized === "DELETED"
        ? "bg-red-100 text-red-700"
        : "bg-emerald-100 text-emerald-700";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${className}`}>
      {statusLabels[normalized] || normalized}
    </span>
  );
}

function TableHead({ children, align = "left" }) {
  return (
    <th
      className={`px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#434655] ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function EmptyRow({ text }) {
  return (
    <tr>
      <td colSpan={5} className="bg-white px-6 py-10 text-center text-sm text-[#737686]">
        {text}
      </td>
    </tr>
  );
}

function Toast({ notification, onClose }) {
  const isError = notification.type === "error";
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
      <p className="text-sm font-semibold">{notification.text}</p>
      <button type="button" onClick={onClose} className="ml-2">
        <span className="material-symbols-outlined text-base">close</span>
      </button>
    </div>
  );
}
