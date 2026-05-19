import React from "react";
import { useOrderNotifications } from "../../context/OrderNotificationContext";
import BrandLogo from "../BrandLogo.jsx";

export default function AdminTopbar({
  user,
  onLogout,
  onNavigate,
  filterDraft,
  setFilterDraft,
  applyFilters,
}) {
  const { notifications, unreadCount, markAllRead, openOrder } =
    useOrderNotifications() || {
      notifications: [],
      unreadCount: 0,
      markAllRead: () => {},
      openOrder: () => {},
    };
  const [open, setOpen] = React.useState(false);

  function toggle() {
    setOpen((v) => !v);
    if (!open) markAllRead();
  }

  function handleNotificationClick(orderId) {
    // navigate to orders view and request opening the order detail
    if (typeof openOrder === "function") {
      openOrder(orderId);
    }
    if (typeof onNavigate === "function") {
      onNavigate("orders");
    }
    try {
      window.history.pushState({}, "", `/orders/${orderId}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    } catch {
      // ignore if history not available
    }
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-[#ead8cc] bg-[linear-gradient(180deg,rgba(255,250,245,1),rgba(255,244,236,1))] px-4 lg:px-8">
      <div className="flex min-w-0 items-center gap-8">
        <div className="hidden items-center sm:flex">
          <BrandLogo className="h-14 w-52 object-contain object-left" />
        </div>
        <div className="relative w-full max-w-96">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#737686] opacity-60">
            search
          </span>
          <input
            className="w-full rounded-lg border-none bg-white/90 py-2 pl-10 pr-4 text-sm text-[#111111] transition focus:bg-white focus:ring-2 focus:ring-[#d45a14]"
            placeholder="Tìm kiếm sản phẩm..."
            value={filterDraft?.search || ""}
            onChange={(event) =>
              setFilterDraft &&
              setFilterDraft((prev) => ({
                ...prev,
                search: event.target.value,
              }))
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") applyFilters && applyFilters();
            }}
            type="text"
          />
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
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border bg-white p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between">
                <strong>Thông báo đơn hàng</strong>
                <button
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
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleNotificationClick(n.orderId)}
                      className="mb-2 w-full text-left rounded-md border p-2 text-sm hover:bg-slate-50"
                    >
                      <div className="font-semibold">Đơn #{n.orderId}</div>
                      <div className="text-xs text-slate-500">
                        {new Date(n.createdAt).toLocaleString()}
                      </div>
                      <div className="mt-1">
                        {new Intl.NumberFormat("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        }).format(n.total)}
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
          className="material-symbols-outlined rounded-full p-2 text-[#434655] transition-colors hover:bg-orange-50"
        >
          settings
        </button>
        <div className="hidden h-8 w-px bg-[#c3c6d7]/50 sm:block" />
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-3 active:opacity-80"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-600 text-xs font-extrabold text-white">
            {(user?.fullName || user?.email || "A").slice(0, 1).toUpperCase()}
          </div>
          <span className="hidden font-semibold text-sm text-[#d45a14] sm:block">
            Đăng xuất
          </span>
        </button>
      </div>
    </header>
  );
}
