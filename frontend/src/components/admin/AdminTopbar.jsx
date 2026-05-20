import React from "react";
import { useOrderNotifications } from "../../context/OrderNotificationContext";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export default function AdminTopbar({ user, onLogout, onNavigate }) {
  const { notifications, unreadCount, markAllRead, openOrder } =
    useOrderNotifications() || {
      notifications: [],
      unreadCount: 0,
      markAllRead: () => {},
      openOrder: () => {},
    };
  const [open, setOpen] = React.useState(false);

  const displayName = user?.fullName || user?.email || "Admin";
  const avatarUrl = user?.avatarUrl || "";
  const initial = displayName.slice(0, 1).toUpperCase();

  function toggle() {
    setOpen((value) => !value);
    if (!open) markAllRead();
  }

  function handleNotificationClick(orderId) {
    if (typeof openOrder === "function") {
      openOrder(orderId);
    }
    if (typeof onNavigate === "function") {
      onNavigate("orders");
    }
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-[#ead8cc] bg-[linear-gradient(180deg,rgba(255,250,245,1),rgba(255,244,236,1))] px-4 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-600 text-sm font-extrabold text-white">
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-[#191b23]">
            {displayName}
          </p>
          <p className="truncate text-xs font-medium text-[#737686]">
            {user?.role || "ADMIN"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-6">
        <div className="relative">
          <button
            type="button"
            onClick={toggle}
            className="relative rounded-full p-2 text-[#434655] hover:bg-[#ededf9]"
            title="Thông báo"
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border bg-white p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between">
                <strong>Thông báo đơn hàng</strong>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-sm text-slate-500"
                >
                  Đóng
                </button>
              </div>
              <div className="max-h-64 overflow-auto">
                {notifications.length === 0 ? (
                  <div className="py-4 text-sm text-slate-500">
                    Không có thông báo
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() =>
                        handleNotificationClick(notification.orderId)
                      }
                      className="mb-2 w-full rounded-md border p-2 text-left text-sm hover:bg-slate-50"
                    >
                      <div className="font-semibold">
                        Đơn #{notification.orderId}
                      </div>
                      {notification.userId ? (
                        <div className="text-xs text-slate-500">
                          Khách hàng #{notification.userId}
                        </div>
                      ) : null}
                      <div className="text-xs text-slate-500">
                        {new Date(notification.createdAt).toLocaleString(
                          "vi-VN",
                        )}
                      </div>
                      <div className="mt-1">
                        {currencyFormatter.format(notification.total)}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onNavigate?.("settings")}
          className="material-symbols-outlined rounded-full p-2 text-[#434655] transition-colors hover:bg-orange-50"
          title="Cài đặt"
        >
          settings
        </button>
        <div className="hidden h-8 w-px bg-[#c3c6d7]/50 sm:block" />
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-3 active:opacity-80"
        >
          <span className="hidden text-sm font-semibold text-[#d45a14] sm:block">
            Đăng xuất
          </span>
        </button>
      </div>
    </header>
  );
}
