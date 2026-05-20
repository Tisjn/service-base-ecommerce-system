import { useCallback, useEffect, useMemo, useState } from "react";
import orderApi from "../../../api/orderApi";
import { getCategories, getProducts } from "../../../api/productApi";
import {
  currencyFormatter,
  formatDateTime,
  getOrderBadgeClass,
  getStatusLabel,
  sortOrdersNewestFirst,
} from "../../customer/orders/orderUtils";

const lookbackDays = 7;

export default function AdminDashboardPage({ onSectionChange }) {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [ordersResult, productsResult, categoriesResult] =
        await Promise.allSettled([
          orderApi.getAllOrders({ page: 0, size: 10, direction: "desc" }),
          getProducts({ page: 0, size: 10, sortBy: "createdAt", direction: "desc" }),
          getCategories(),
        ]);

      if (ordersResult.status === "fulfilled") {
        const payload = ordersResult.value;
        setOrders(
          Array.isArray(payload?.content)
            ? payload.content
            : Array.isArray(payload)
              ? payload
              : [],
        );
      }

      if (productsResult.status === "fulfilled") {
        const payload = productsResult.value;
        setProducts(Array.isArray(payload?.content) ? payload.content : []);
      }

      if (categoriesResult.status === "fulfilled") {
        setCategories(
          Array.isArray(categoriesResult.value) ? categoriesResult.value : [],
        );
      }

      const rejected = [ordersResult, productsResult, categoriesResult].find(
        (result) => result.status === "rejected",
      );
      if (rejected) {
        setError(
          rejected.reason?.message ||
            "Một số dữ liệu dashboard chưa tải được. Kiểm tra lại các service đang chạy.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const dashboard = useMemo(() => buildDashboardData(orders, products), [
    orders,
    products,
  ]);

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-10">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-sm font-bold text-[#004ac6]">
            DTPShop Admin
          </p>
          <h2 className="mb-2 text-4xl font-extrabold text-[#191b23] [font-family:Manrope,system-ui,sans-serif]">
            Bảng điều khiển
          </h2>
          <p className="max-w-3xl text-[#434655]">
            Tổng quan vận hành cửa hàng, đơn hàng mới, doanh thu gần đây và các
            sản phẩm cần chú ý.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            className="azure-button-muted"
          >
            <span className="material-symbols-outlined text-xl">refresh</span>
            {loading ? "Đang tải" : "Làm mới"}
          </button>
          <button
            type="button"
            onClick={() => onSectionChange?.("orders")}
            className="azure-button"
          >
            <span className="material-symbols-outlined text-xl">
              receipt_long
            </span>
            Xem đơn hàng
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800">
          {error}
        </div>
      ) : null}

      <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetric
          icon="payments"
          label="Doanh thu"
          value={currencyFormatter.format(dashboard.revenue)}
          helper={`${dashboard.completedOrders} đơn đã hoàn tất`}
        />
        <DashboardMetric
          icon="shopping_bag"
          label="Đơn hàng"
          value={dashboard.totalOrders}
          helper={`${dashboard.pendingOrders} đơn chờ xử lý`}
          tone="amber"
        />
        <DashboardMetric
          icon="inventory_2"
          label="Sản phẩm"
          value={products.length}
          helper={`${dashboard.lowStockProducts.length} sản phẩm tồn kho thấp`}
          tone="blue"
        />
        <DashboardMetric
          icon="category"
          label="Danh mục"
          value={categories.length}
          helper="Đang quản lý trong catalog"
          tone="green"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-lg border border-[#c3c6d7]/20 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-extrabold text-[#191b23]">
                Doanh thu {lookbackDays} ngày
              </h3>
              <p className="text-sm text-[#737686]">
                Tính theo các đơn không bị hủy trong khoảng thời gian gần nhất.
              </p>
            </div>
            <span className="rounded-full bg-[#ededf9] px-3 py-1 text-sm font-bold text-[#004ac6]">
              {currencyFormatter.format(dashboard.recentRevenue)}
            </span>
          </div>
          <div className="grid min-h-72 grid-cols-7 items-end gap-3">
            {dashboard.dailyRevenue.map((day) => (
              <RevenueBar key={day.key} day={day} max={dashboard.maxDailyRevenue} />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <Panel title="Trạng thái đơn hàng">
            <div className="space-y-3">
              {dashboard.statusSummary.map((item) => (
                <StatusRow key={item.status} item={item} total={dashboard.totalOrders} />
              ))}
            </div>
          </Panel>

          <Panel title="Cần xử lý">
            <div className="grid gap-3">
              <AlertItem
                icon="pending_actions"
                label="Đơn chờ xử lý"
                value={dashboard.pendingOrders}
                onClick={() => onSectionChange?.("orders")}
              />
              <AlertItem
                icon="inventory"
                label="Sản phẩm tồn kho thấp"
                value={dashboard.lowStockProducts.length}
                onClick={() => onSectionChange?.("products")}
              />
            </div>
          </Panel>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Đơn hàng mới nhất" action="Quản lý đơn" onAction={() => onSectionChange?.("orders")}>
          <div className="overflow-hidden rounded-lg border border-[#c3c6d7]/20">
            {loading ? (
              <EmptyState text="Đang tải đơn hàng..." />
            ) : dashboard.recentOrders.length === 0 ? (
              <EmptyState text="Chưa có đơn hàng nào." />
            ) : (
              <div className="divide-y divide-[#c3c6d7]/20">
                {dashboard.recentOrders.map((order) => (
                  <RecentOrderRow key={order.orderId || order.id} order={order} />
                ))}
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Tồn kho thấp" action="Quản lý sản phẩm" onAction={() => onSectionChange?.("products")}>
          {loading ? (
            <EmptyState text="Đang tải sản phẩm..." />
          ) : dashboard.lowStockProducts.length === 0 ? (
            <EmptyState text="Không có sản phẩm tồn kho thấp." />
          ) : (
            <div className="space-y-3">
              {dashboard.lowStockProducts.slice(0, 6).map((product) => (
                <LowStockRow key={product.id} product={product} />
              ))}
            </div>
          )}
        </Panel>
      </section>
    </div>
  );
}

function buildDashboardData(orders, products) {
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeProducts = Array.isArray(products) ? products : [];
  const activeOrders = safeOrders.filter((order) => order.status !== "CANCELLED");
  const completedOrders = safeOrders.filter(
    (order) => order.status === "DELIVERED",
  ).length;
  const revenue = activeOrders.reduce((sum, order) => sum + getOrderTotal(order), 0);
  const pendingOrders = safeOrders.filter((order) =>
    ["PENDING", "CONFIRMED", "PROCESSING"].includes(order.status),
  ).length;
  const statusSummary = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"].map(
    (status) => ({
      status,
      count: safeOrders.filter((order) => order.status === status).length,
    }),
  );
  const dailyRevenue = buildDailyRevenue(activeOrders);
  const maxDailyRevenue = Math.max(...dailyRevenue.map((day) => day.revenue), 0);

  return {
    totalOrders: safeOrders.length,
    completedOrders,
    revenue,
    recentRevenue: dailyRevenue.reduce((sum, day) => sum + day.revenue, 0),
    pendingOrders,
    statusSummary,
    dailyRevenue,
    maxDailyRevenue,
    recentOrders: sortOrdersNewestFirst(safeOrders).slice(0, 6),
    lowStockProducts: safeProducts
      .filter((product) => Number(product.stockQuantity || 0) <= 5)
      .sort((left, right) => Number(left.stockQuantity || 0) - Number(right.stockQuantity || 0)),
  };
}

function buildDailyRevenue(orders) {
  const now = new Date();
  const days = Array.from({ length: lookbackDays }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (lookbackDays - 1 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      label: new Intl.DateTimeFormat("vi-VN", { weekday: "short" }).format(date),
      dateLabel: new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      }).format(date),
      revenue: 0,
      orders: 0,
    };
  });
  const byKey = new Map(days.map((day) => [day.key, day]));

  orders.forEach((order) => {
    const createdAt = order.createdAt ? new Date(order.createdAt) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) return;
    const key = createdAt.toISOString().slice(0, 10);
    const day = byKey.get(key);
    if (!day) return;
    day.revenue += getOrderTotal(order);
    day.orders += 1;
  });

  return days;
}

function getOrderTotal(order) {
  return Number(order?.totalAmount ?? order?.total ?? order?.grandTotal ?? 0) || 0;
}

function DashboardMetric({ icon, label, value, helper, tone = "orange" }) {
  const toneClass = {
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-[#9d4300]",
  }[tone];

  return (
    <div className="rounded-lg border border-[#c3c6d7]/20 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-4">
        <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${toneClass}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </span>
        <span className="text-xs font-bold text-[#737686]">{label}</span>
      </div>
      <p className="text-3xl font-extrabold text-[#191b23]">{value}</p>
      <p className="mt-2 text-sm text-[#737686]">{helper}</p>
    </div>
  );
}

function RevenueBar({ day, max }) {
  const height = max > 0 ? Math.max(8, Math.round((day.revenue / max) * 100)) : 8;

  return (
    <div className="flex h-full min-w-0 flex-col justify-end gap-3">
      <div className="flex h-52 items-end rounded-lg bg-[#f3f3fe] p-2">
        <div
          className="w-full rounded-md bg-[#004ac6] transition-all"
          style={{ height: `${height}%` }}
          title={`${day.dateLabel}: ${currencyFormatter.format(day.revenue)}`}
        />
      </div>
      <div className="text-center">
        <p className="truncate text-xs font-bold text-[#191b23]">{day.label}</p>
        <p className="truncate text-xs text-[#737686]">{day.orders} đơn</p>
      </div>
    </div>
  );
}

function Panel({ title, action, onAction, children }) {
  return (
    <section className="rounded-lg border border-[#c3c6d7]/20 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="text-xl font-extrabold text-[#191b23]">{title}</h3>
        {action ? (
          <button
            type="button"
            onClick={onAction}
            className="text-sm font-bold text-[#004ac6] hover:text-[#003a8c]"
          >
            {action}
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function StatusRow({ item, total }) {
  const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className={`rounded-full px-3 py-1 font-bold ${getOrderBadgeClass(item.status)}`}>
          {getStatusLabel(item.status)}
        </span>
        <span className="font-bold text-[#191b23]">{item.count}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#ededf9]">
        <div className="h-full rounded-full bg-[#004ac6]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function AlertItem({ icon, label, value, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between gap-4 rounded-lg border border-[#c3c6d7]/20 bg-[#faf8ff] p-4 text-left transition hover:border-[#004ac6]/30 hover:bg-[#f3f3fe]"
    >
      <span className="flex items-center gap-3">
        <span className="material-symbols-outlined text-[#004ac6]">{icon}</span>
        <span className="font-semibold text-[#434655]">{label}</span>
      </span>
      <span className="text-2xl font-extrabold text-[#191b23]">{value}</span>
    </button>
  );
}

function RecentOrderRow({ order }) {
  const orderId = order.orderId || order.id || "N/A";
  const customer =
    order.customerName || order.customerEmail || `User #${order.userId || "?"}`;

  return (
    <div className="grid gap-3 bg-white p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="font-extrabold text-[#191b23]">#{orderId}</span>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${getOrderBadgeClass(order.status)}`}>
            {getStatusLabel(order.status)}
          </span>
        </div>
        <p className="truncate text-sm font-semibold text-[#434655]">{customer}</p>
        <p className="mt-1 text-xs text-[#737686]">
          {formatDateTime(order.createdAt)}
        </p>
      </div>
      <p className="text-right font-extrabold text-[#191b23]">
        {currencyFormatter.format(getOrderTotal(order))}
      </p>
    </div>
  );
}

function LowStockRow({ product }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-[#c3c6d7]/20 bg-[#faf8ff] p-4">
      <div className="min-w-0">
        <p className="truncate font-bold text-[#191b23]">{product.name}</p>
        <p className="mt-1 truncate text-sm text-[#737686]">
          {product.category?.name || "Chưa phân loại"}
        </p>
      </div>
      <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-extrabold text-amber-800">
        {Number(product.stockQuantity || 0)} còn
      </span>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-lg border border-dashed border-[#c3c6d7]/50 bg-[#faf8ff] p-6 text-center text-sm font-semibold text-[#737686]">
      {text}
    </div>
  );
}
