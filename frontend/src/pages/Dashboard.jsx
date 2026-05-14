import { useEffect, useState } from "react";
import AccountProfilePage from "./customer/AccountProfilePage.jsx";
import CustomerOrderHubPage from "./customer/CustomerOrderHubPage";
import ProductAdminPage from "./admin/products/ProductAdminPage";
import ChatWidget from "../components/chat/ChatWidget.jsx";

function isAdminUser(user) {
  return String(user?.role || user?.roles?.[0] || user?.authorities?.[0] || "")
    .toUpperCase()
    .includes("ADMIN");
}

function Dashboard({ onLogout, onUserUpdate, onRequestLogin, user }) {
  const isAdmin = isAdminUser(user);
  const [activeView, setActiveView] = useState(() =>
    isAdminUser(user) ? "products" : "orders",
  );

  useEffect(() => {
    setActiveView(isAdmin ? "products" : "orders");
  }, [isAdmin, user?.id, user?.userId, user?.email]);

  if (activeView === "products" && isAdmin) {
    return (
      <ProductAdminPage
        user={user}
        onLogout={onLogout}
        onNavigate={setActiveView}
      />
    );
  }

  const pageTitle =
    activeView === "products"
      ? "Quản trị sản phẩm"
      : activeView === "account"
        ? "Tài khoản"
        : "DTPShop";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.1),transparent_30%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.12),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#f3f7fb_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto grid max-w-7xl gap-6">
        <div className="rounded-4xl border border-white/70 bg-white/90 p-5 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)] backdrop-blur sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-sky-600/80">
                DTPShop
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                {pageTitle}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Xin chào {user?.fullName || user?.email || "người dùng"}. Bạn có
                thể mua hàng, theo dõi đơn, quản trị và chỉnh sửa hồ sơ.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <NavButton
                active={activeView === "orders"}
                onClick={() => setActiveView("orders")}
              >
                Đơn hàng
              </NavButton>
              {user ? (
                <NavButton
                  active={activeView === "account"}
                  activeClass="bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                  onClick={() => setActiveView("account")}
                >
                  Tài khoản
                </NavButton>
              ) : null}
              {isAdmin && (
                <NavButton
                  active={activeView === "products"}
                  activeClass="bg-orange-600 text-white shadow-lg shadow-orange-500/20"
                  onClick={() => setActiveView("products")}
                >
                  Sản phẩm
                </NavButton>
              )}
              {user ? (
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
                >
                  Đăng xuất
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onRequestLogin}
                  className="rounded-2xl bg-orange-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-700"
                >
                  Đăng nhập
                </button>
              )}
            </div>
          </div>
        </div>

        {activeView === "account" ? (
          <AccountProfilePage user={user} onUserUpdate={onUserUpdate} />
        ) : (
          <CustomerOrderHubPage user={user} />
        )}
      </section>
      {!isAdmin ? (
        <ChatWidget user={user} onRequestLogin={onRequestLogin} />
      ) : null}
    </main>
  );
}

function NavButton({
  active,
  activeClass = "bg-sky-600 text-white shadow-lg shadow-sky-500/20",
  children,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-5 py-3 text-sm font-semibold transition ${
        active ? activeClass : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

export default Dashboard;
