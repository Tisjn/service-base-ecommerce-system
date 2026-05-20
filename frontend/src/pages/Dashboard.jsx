import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AccountProfilePage from "./customer/AccountProfilePage.jsx";
import CustomerOrderHubPage from "./customer/CustomerOrderHubPage";
import ProductAdminPage from "./admin/products/ProductAdminPage";
import ChatWidget from "../components/chat/ChatWidget.jsx";
import BrandLogo from "../components/BrandLogo.jsx";

function isAdminUser(user) {
  return String(user?.role || user?.roles?.[0] || user?.authorities?.[0] || "")
    .toUpperCase()
    .includes("ADMIN");
}

function getDisplayName(user) {
  return user?.fullName || user?.email || "Khách hàng";
}

function getFirstName(user) {
  const displayName = getDisplayName(user);
  return displayName.split(" ").filter(Boolean).at(-1) || displayName;
}

function getInitial(value) {
  return String(value || "K").trim().slice(0, 1).toUpperCase();
}

function Dashboard({
  routeView,
  customerTab,
  onLogout,
  onUserUpdate,
  onRequestLogin,
  user,
}) {
  const navigate = useNavigate();
  const { section } = useParams();
  const isAdmin = isAdminUser(user);
  const [activeView, setActiveView] = useState(() =>
    routeView || (isAdminUser(user) ? "products" : "orders"),
  );

  useEffect(() => {
    setActiveView(routeView || (isAdmin ? "products" : "orders"));
  }, [isAdmin, routeView, user?.id, user?.userId, user?.email]);

  function navigateTo(view) {
    setActiveView(view);
    if (view === "account") {
      navigate("/customer/account");
      return;
    }
    if (view === "products") {
      navigate("/admin/products");
      return;
    }
    navigate("/customer/products");
  }

  if (activeView === "products" && isAdmin) {
    return (
      <ProductAdminPage
        user={user}
        initialSection={section || "products"}
        onLogout={onLogout}
        onNavigate={(target) => {
          const adminSections = [
            "dashboard",
            "products",
            "orders",
            "customers",
            "analytics",
            "support",
            "settings",
          ];
          if (adminSections.includes(target)) {
            navigate(`/admin/${target}`);
            return;
          }
          navigateTo(target);
        }}
        onUserUpdate={onUserUpdate}
      />
    );
  }

  const customerPageTitle =
    customerTab === "cart"
      ? "Giỏ hàng của bạn"
      : customerTab === "history"
        ? "Theo dõi đơn hàng"
        : user
          ? `Xin chào, ${getFirstName(user)}`
          : "Khám phá DTPShop";
  const pageTitle =
    activeView === "products"
      ? "Quản trị sản phẩm"
      : activeView === "account"
        ? `Tài khoản của ${getDisplayName(user)}`
        : customerPageTitle;
  const displayName = getDisplayName(user);
  const avatarUrl = user?.avatarUrl || "";
  const pageDescription =
    activeView === "account"
      ? "Cập nhật hồ sơ, bảo mật và địa chỉ giao hàng để đặt hàng nhanh hơn."
      : customerTab === "cart"
        ? "Kiểm tra sản phẩm đã chọn, địa chỉ giao hàng và hoàn tất thanh toán."
        : customerTab === "history"
          ? "Theo dõi trạng thái đơn hàng và xem lại lịch sử mua sắm của bạn."
          : "Chọn sản phẩm phù hợp, thêm vào giỏ hàng và quản lý đơn mua trong một không gian rõ ràng.";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.10),transparent_28%),radial-gradient(circle_at_top_right,rgba(15,23,42,0.06),transparent_30%),linear-gradient(180deg,#fffaf5_0%,#f7f4ef_100%)] px-4 py-5 sm:px-6 lg:px-8">
      <section className="mx-auto grid max-w-7xl gap-6">
        <div className="overflow-hidden rounded-4xl border border-[#ead8cc] bg-white/95 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.34)] backdrop-blur">
          <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-5">
              <BrandLogo className="h-16 w-56 shrink-0 object-contain object-left sm:h-20 sm:w-72" />
              <div className="hidden h-12 w-px bg-[#ead8cc] lg:block" />
              <div className="min-w-0">
                <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.24em] text-orange-600">
                  DTPShop customer
                </p>
                <h1 className="!m-0 text-3xl !font-black tracking-tight !text-slate-950 [font-family:Manrope,system-ui,sans-serif] sm:text-4xl">
                  {pageTitle}
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                  {pageDescription}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {user ? (
                <button
                  type="button"
                  onClick={() => navigateTo("account")}
                  className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50 focus:outline-none focus:ring-4 focus:ring-orange-100"
                  aria-label="Mở trang tài khoản"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="h-12 w-12 rounded-full object-cover ring-2 ring-white"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-600 text-base font-extrabold text-white ring-2 ring-white">
                      {getInitial(displayName)}
                    </div>
                  )}
                  <div className="min-w-0 max-w-[280px] sm:max-w-[360px]">
                    <p className="whitespace-normal break-words text-sm font-extrabold leading-5 text-slate-950">
                      {displayName}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {user?.email || "Tài khoản khách hàng"}
                    </p>
                  </div>
                </button>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                {activeView === "account" && !isAdmin ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView("orders");
                      navigate("/customer/products");
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-200"
                  >
                    <span className="material-symbols-outlined text-lg">
                      arrow_back
                    </span>
                    Quay lại sản phẩm
                  </button>
                ) : null}
                {isAdmin && (
                  <NavButton
                    active={activeView === "products"}
                    activeClass="bg-orange-600 text-white shadow-lg shadow-orange-500/20"
                    onClick={() => navigateTo("products")}
                  >
                    Sản phẩm
                  </NavButton>
                )}
                {user ? (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="rounded-2xl bg-orange-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-orange-700"
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
        </div>

        {activeView === "account" ? (
          <AccountProfilePage user={user} onUserUpdate={onUserUpdate} />
        ) : (
          <CustomerOrderHubPage user={user} initialTab={customerTab} />
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
  activeClass = "bg-orange-600 text-white shadow-lg shadow-orange-500/20",
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
