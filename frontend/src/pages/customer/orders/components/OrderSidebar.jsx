export default function OrderSidebar({
  activeTab,
  setActiveTab,
  isAdmin,
  accountName,
  accountAvatar,
  accountEmail,
  catalogTotal,
  cartCount,
}) {
  const sidebarButtonClass = (tab) =>
    `flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
      activeTab === tab
        ? "bg-orange-600 text-white shadow-lg shadow-orange-500/20"
        : "bg-slate-50 text-slate-700 hover:bg-slate-100"
    }`;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
          Quy trình nghiệp vụ
        </p>
        <div className="mt-4 space-y-2">
          <NavButton
            activeTab={activeTab}
            tab="catalog"
            title="Danh mục"
            subtitle="Xem và thêm sản phẩm"
            setActiveTab={setActiveTab}
            className={sidebarButtonClass("catalog")}
          />
          <NavButton
            activeTab={activeTab}
            tab="cart"
            title="Giỏ hàng"
            subtitle="Đặt đơn COD"
            setActiveTab={setActiveTab}
            className={sidebarButtonClass("cart")}
          />
          <NavButton
            activeTab={activeTab}
            tab="history"
            title="Lịch sử"
            subtitle="Theo dõi đơn đã mua"
            setActiveTab={setActiveTab}
            className={sidebarButtonClass("history")}
          />
          {isAdmin && (
            <NavButton
              activeTab={activeTab}
              tab="admin"
              title="Quản trị đơn"
              subtitle="Cập nhật trạng thái"
              setActiveTab={setActiveTab}
              className={sidebarButtonClass("admin")}
            />
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 overflow-hidden rounded-2xl bg-slate-100">
            {accountAvatar ? (
              <img
                src={accountAvatar}
                alt={accountName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-bold text-slate-700">
                {accountName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Tài khoản
            </p>
            <h2 className="mt-1 truncate text-lg font-bold text-slate-900">
              {accountName}
            </h2>
            <p className="mt-1 truncate text-sm text-slate-600">
              {accountEmail}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <Metric label="Sản phẩm đang hiển thị" value={catalogTotal} />
        <Metric label="Mặt hàng trong giỏ" value={cartCount} />
      </div>
    </div>
  );
}

function NavButton({ tab, title, subtitle, setActiveTab, className }) {
  return (
    <button
      type="button"
      onClick={() => setActiveTab(tab)}
      className={className}
    >
      <span>{title}</span>
      <span className="text-xs opacity-70">{subtitle}</span>
    </button>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}
