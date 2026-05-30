import { useCallback, useEffect, useMemo, useState } from "react";
import orderApi from "../../../api/orderApi";
import { getCategories, getProducts } from "../../../api/productApi";
import { listUsers } from "../../../api/userApi";
import {
  currencyFormatter,
  formatDateTime,
  getOrderBadgeClass,
  getStatusLabel,
  sortOrdersNewestFirst,
} from "../../customer/orders/orderUtils";

const LOOKBACK_DAYS = 7;
const ANALYTICS_WINDOW_DAYS = 30;
const LOW_STOCK_THRESHOLD = 5;
const REVIEW_SAMPLE_COUNT = 5;
const DASHBOARD_FAST_RENDER_MS = 900;
const DASHBOARD_CACHE_KEY = "dtpshop.adminDashboard.snapshot";
const AGENT_EXECUTED_EVENT = "dtpshop:agent-executed";

export default function AdminDashboardPage({ onSectionChange }) {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [reviewSamples, setReviewSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    const cached = readDashboardSnapshot();
    if (cached) {
      applyDashboardSnapshot(cached, {
        setOrders,
        setProducts,
        setCategories,
        setUsers,
        setReviewSamples,
      });
      setLoading(false);
    }

    let fastRenderTimer = null;
    try {
      fastRenderTimer = window.setTimeout(() => {
        setLoading(false);
      }, DASHBOARD_FAST_RENDER_MS);

      const ordersPromise = orderApi
        .getAllOrders({ direction: "desc" })
        .then((data) => {
          const nextOrders = normalizeCollection(data);
          setOrders(nextOrders);
          return data;
        });
      const productsPromise = getProducts({
        page: 0,
        size: 100,
        sortBy: "createdAt",
        direction: "desc",
        force: true,
      }).then((data) => {
        const nextProducts = normalizeCollection(data);
        setProducts(nextProducts);
        return data;
      });
      const categoriesPromise = getCategories({ force: true }).then((data) => {
        const nextCategories = normalizeCollection(data);
        setCategories(nextCategories);
        return data;
      });
      const usersPromise = listUsers().then((data) => {
        const nextUsers = normalizeCollection(data);
        setUsers(nextUsers);
        return data;
      });

      const [ordersResult, productsResult, categoriesResult, usersResult] =
        await Promise.allSettled([
          ordersPromise,
          productsPromise,
          categoriesPromise,
          usersPromise,
        ]);

      const nextOrders = normalizeCollection(ordersResult.value);
      const nextProducts = normalizeCollection(productsResult.value);

      if (ordersResult.status === "fulfilled") {
        setOrders(nextOrders);
      }

      if (productsResult.status === "fulfilled") {
        setProducts(nextProducts);
      }

      if (categoriesResult.status === "fulfilled") {
        setCategories(normalizeCollection(categoriesResult.value));
      }

      if (usersResult.status === "fulfilled") {
        setUsers(normalizeCollection(usersResult.value));
      }

      const rejected = [
        ordersResult,
        productsResult,
        categoriesResult,
        usersResult,
      ].find((result) => result.status === "rejected");

      if (rejected) {
        setError(
          rejected.reason?.message ||
            "Một số số liệu dashboard chưa tải được. Kiểm tra lại các service đang chạy.",
        );
      }

      const coreSnapshot = {
        orders: ordersResult.status === "fulfilled" ? nextOrders : orders,
        products: productsResult.status === "fulfilled" ? nextProducts : products,
        categories:
          categoriesResult.status === "fulfilled"
            ? normalizeCollection(categoriesResult.value)
            : categories,
        users:
          usersResult.status === "fulfilled"
            ? normalizeCollection(usersResult.value)
            : users,
        reviewSamples,
      };
      writeDashboardSnapshot(coreSnapshot);
      setLoading(false);

      const sampleProducts = nextProducts.slice(0, REVIEW_SAMPLE_COUNT);
      if (sampleProducts.length > 0) {
        setReviewLoading(true);
        const reviewResults = await Promise.allSettled(
          sampleProducts.map((product) =>
            orderApi.getProductDetailWithComments(product.id),
          ),
        );

        const nextReviewSamples = reviewResults
            .map((result, index) => {
              if (result.status !== "fulfilled") {
                return null;
              }
              return {
                product: sampleProducts[index],
                ...result.value,
              };
            })
            .filter(Boolean);
        setReviewSamples(nextReviewSamples);
        writeDashboardSnapshot({
          ...coreSnapshot,
          reviewSamples: nextReviewSamples,
        });
      } else {
        setReviewSamples([]);
        writeDashboardSnapshot({
          ...coreSnapshot,
          reviewSamples: [],
        });
      }
    } finally {
      if (fastRenderTimer) {
        window.clearTimeout(fastRenderTimer);
      }
      setReviewLoading(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    window.addEventListener(AGENT_EXECUTED_EVENT, loadDashboard);
    return () => {
      window.removeEventListener(AGENT_EXECUTED_EVENT, loadDashboard);
    };
  }, [loadDashboard]);

  const dashboard = useMemo(
    () =>
      buildDashboardData({
        orders,
        products,
        categories,
        users,
        reviewSamples,
      }),
    [orders, products, categories, users, reviewSamples],
  );

  return (
    <div className="relative mx-auto max-w-7xl overflow-hidden px-4 py-6 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(0,74,198,0.14),transparent_36%),radial-gradient(circle_at_top_right,rgba(255,103,0,0.12),transparent_30%),linear-gradient(180deg,rgba(243,243,254,0.92),rgba(255,255,255,0.96))]" />

      <header className="mb-8 overflow-hidden rounded-4xl border border-white/70 bg-white/80 p-6 shadow-[0_18px_60px_rgba(25,27,35,0.08)] backdrop-blur sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#004ac6]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-[#004ac6]">
              DTPShop Admin
            </p>
            <h2 className="text-4xl font-extrabold tracking-tight text-[#191b23] sm:text-5xl font-[Manrope,system-ui,sans-serif]">
              Bảng điều khiển tổng quan
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[#434655]">
              Theo dõi doanh thu, lợi nhuận gộp ước tính, đơn hàng, khách hàng,
              tồn kho, chất lượng sản phẩm và thanh toán trong một màn hình.
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
      </header>

      {error ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800 shadow-sm">
          {error}
        </div>
      ) : null}

      <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          icon="payments"
          label="Doanh thu"
          value={currencyFormatter.format(dashboard.revenue)}
          helper={`${dashboard.completedOrders} đơn đã hoàn tất`}
          tone="blue"
        />
        <MetricCard
          icon="account_balance_wallet"
          label="Lợi nhuận gộp"
          value={currencyFormatter.format(dashboard.grossProfit)}
          helper={`${formatPercent(dashboard.grossMarginRate)} biên lợi nhuận thực`}
          tone="emerald"
        />
        <MetricCard
          icon="shopping_bag"
          label="Đơn hàng"
          value={dashboard.totalOrders}
          helper={`${dashboard.pendingOrders} đơn chờ xử lý`}
          tone="amber"
        />
        <MetricCard
          icon="group"
          label="Khách hàng"
          value={dashboard.totalUsers}
          helper={`${dashboard.newUsers30} tài khoản mới trong 30 ngày`}
          tone="violet"
        />
        <MetricCard
          icon="inventory_2"
          label="Sản phẩm"
          value={dashboard.totalProducts}
          helper={`${dashboard.lowStockProducts.length} sản phẩm sắp hết hàng`}
          tone="teal"
        />
        <MetricCard
          icon="badge"
          label="Đánh giá trung bình"
          value={dashboard.reviewOverview.displayAverage}
          helper={
            reviewLoading
              ? "Đang tải dữ liệu đánh giá"
              : `${dashboard.reviewOverview.totalComments} bình luận từ các sản phẩm mẫu`
          }
          tone="rose"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel
          title="1. Doanh thu"
          subtitle="Biểu đồ 7 ngày gần nhất và xu hướng doanh thu thực nhận"
          action="Xem đơn hàng"
          onAction={() => onSectionChange?.("orders")}
        >
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl bg-[#f8f9ff] p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#434655]">
                    7 ngày gần nhất
                  </p>
                  <p className="text-2xl font-extrabold text-[#191b23]">
                    {currencyFormatter.format(dashboard.recentRevenue)}
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#004ac6] shadow-sm">
                  {dashboard.dailyRevenue.length} điểm dữ liệu
                </span>
              </div>
              <div className="grid min-h-72 grid-cols-7 items-end gap-3">
                {dashboard.dailyRevenue.map((day) => (
                  <RevenueBar
                    key={day.key}
                    day={day}
                    max={dashboard.maxDailyRevenue}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <StatBox
                label="Doanh thu trung bình / đơn"
                value={currencyFormatter.format(dashboard.averageOrderValue)}
                description="Chỉ tính trên đơn hoàn tất"
              />
              <StatBox
                label="Doanh thu tháng gần nhất"
                value={currencyFormatter.format(dashboard.recentRevenue30)}
                description={`${dashboard.recentOrders30} đơn trong 30 ngày`}
              />
              <StatBox
                label="Tỷ lệ hoàn tất"
                value={formatPercent(dashboard.completedRate)}
                description={`${dashboard.completedOrders} / ${dashboard.totalOrders} đơn`}
              />
              <StatBox
                label="Tỷ lệ hủy"
                value={formatPercent(dashboard.cancelRate)}
                description="Đơn bị hủy trên tổng đơn"
              />
            </div>
          </div>
        </Panel>

        <Panel
          title="2. Lợi nhuận"
          subtitle="Từ giá bán và giá vốn snapshot tại thời điểm tạo đơn"
        >
          <div className="space-y-4">
            <div className="rounded-3xl border border-[#c3c6d7]/20 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#737686]">
                    Lợi nhuận gộp ước tính
                  </p>
                  <p className="mt-3 text-3xl font-extrabold text-[#191b23]">
                    {currencyFormatter.format(dashboard.grossProfit)}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">
                  {formatPercent(dashboard.grossMarginRate)}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#434655]">
                Số liệu này lấy từ `order_items.costPrice` đã được chụp lúc tạo
                đơn, nên ổn định theo lịch sử ngay cả khi giá vốn sản phẩm thay
                đổi về sau.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <MiniStat
                label="Tổng doanh thu"
                value={currencyFormatter.format(dashboard.revenue)}
              />
              <MiniStat
                label="Chi phí hàng bán"
                value={currencyFormatter.format(dashboard.costOfGoods)}
              />
              <MiniStat
                label="Biên lợi nhuận"
                value={formatPercent(dashboard.grossMarginRate)}
              />
              <MiniStat
                label="Số sản phẩm có margin dương"
                value={dashboard.profitableProducts}
              />
            </div>

            <div className="rounded-3xl border border-dashed border-[#c3c6d7]/40 bg-[#faf8ff] p-5">
              <p className="text-sm font-semibold text-[#191b23]">
                Gợi ý ưu tiên
              </p>
              <p className="mt-2 text-sm leading-6 text-[#434655]">
                Theo dõi song song doanh thu và lợi nhuận gộp sẽ giúp admin nhìn
                được sản phẩm nào bán tốt nhưng biên lợi nhuận thấp để điều
                chỉnh giá, khuyến mãi hoặc nhập hàng.
              </p>
            </div>
          </div>
        </Panel>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel
          title="3. Đơn hàng"
          subtitle="Trạng thái xử lý, giao hàng và danh sách đơn mới nhất"
          action="Quản lý đơn"
          onAction={() => onSectionChange?.("orders")}
        >
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {dashboard.statusSummary.map((item) => (
                <StatusMiniCard
                  key={item.status}
                  item={item}
                  total={dashboard.totalOrders}
                />
              ))}
            </div>

            <div className="grid gap-3 rounded-3xl bg-[#f8f9ff] p-4 sm:grid-cols-3">
              <MiniStat label="Đơn chờ xử lý" value={dashboard.pendingOrders} />
              <MiniStat label="Đơn hủy" value={dashboard.cancelledOrders} />
              <MiniStat
                label="Thời gian xử lý TB"
                value={formatMinutes(dashboard.averageFulfillmentMinutes)}
              />
            </div>

            <div className="overflow-hidden rounded-3xl border border-[#c3c6d7]/20 bg-white shadow-sm">
              {loading ? (
                <EmptyState text="Đang tải đơn hàng..." />
              ) : dashboard.recentOrders.length === 0 ? (
                <EmptyState text="Chưa có đơn hàng nào." />
              ) : (
                <div className="divide-y divide-[#c3c6d7]/15">
                  {dashboard.recentOrders.map((order) => (
                    <RecentOrderRow
                      key={order.orderId || order.id}
                      order={order}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </Panel>

        <Panel
          title="4. Khách hàng"
          subtitle="Tăng trưởng tài khoản, khách mua lặp lại và top khách hàng"
          action="Quản lý khách hàng"
          onAction={() => onSectionChange?.("customers")}
        >
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniStat label="Tổng khách hàng" value={dashboard.totalUsers} />
              <MiniStat
                label="Khách mới 30 ngày"
                value={dashboard.newUsers30}
              />
              <MiniStat
                label="Khách hoạt động 30 ngày"
                value={dashboard.activeCustomers30}
              />
              <MiniStat
                label="Khách quay lại"
                value={dashboard.repeatCustomers}
              />
            </div>

            <div className="rounded-3xl border border-[#c3c6d7]/20 bg-[#f8f9ff] p-5">
              <div className="mb-3 flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-[#191b23]">
                  Tỷ lệ mua lại
                </p>
                <p className="text-sm font-bold text-[#004ac6]">
                  {formatPercent(dashboard.repeatRate)}
                </p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-[#004ac6]"
                  style={{
                    width: `${Math.min(100, dashboard.repeatRate * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-3 text-sm leading-6 text-[#434655]">
                Tỷ lệ càng cao thì khả năng giữ chân khách hàng càng tốt.
              </p>
            </div>

            <div className="overflow-hidden rounded-3xl border border-[#c3c6d7]/20 bg-white shadow-sm">
              {dashboard.topCustomers.length === 0 ? (
                <EmptyState text="Chưa có dữ liệu khách hàng nổi bật." />
              ) : (
                <div className="divide-y divide-[#c3c6d7]/15">
                  {dashboard.topCustomers.map((customer) => (
                    <CustomerRow key={customer.userId} customer={customer} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </Panel>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel
          title="5. Sản phẩm & kho"
          subtitle="Tồn kho, giá trị hàng hóa, nhóm danh mục và cảnh báo sắp hết hàng"
          action="Quản lý sản phẩm"
          onAction={() => onSectionChange?.("products")}
        >
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MiniStat label="Tổng sản phẩm" value={dashboard.totalProducts} />
              <MiniStat
                label="Sắp hết hàng"
                value={dashboard.lowStockProducts.length}
              />
              <MiniStat
                label="Hết hàng"
                value={dashboard.outOfStockProducts.length}
              />
              <MiniStat
                label="Giá trị tồn kho"
                value={currencyFormatter.format(dashboard.inventoryValue)}
              />
            </div>

            <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-3xl border border-[#c3c6d7]/20 bg-[#f8f9ff] p-5">
                <p className="text-sm font-semibold text-[#191b23]">
                  Top danh mục theo số lượng
                </p>
                <div className="mt-4 space-y-3">
                  {dashboard.categorySummary.length === 0 ? (
                    <EmptyState text="Chưa có dữ liệu danh mục." compact />
                  ) : (
                    dashboard.categorySummary
                      .slice(0, 5)
                      .map((item) => (
                        <ProgressRow
                          key={item.id}
                          label={item.label}
                          value={item.count}
                          max={dashboard.maxCategoryCount}
                          helper={item.helper}
                        />
                      ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-[#c3c6d7]/20 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-[#191b23]">
                  Sản phẩm cần chú ý
                </p>
                <div className="mt-4 space-y-3">
                  {dashboard.lowStockProducts.length === 0 ? (
                    <EmptyState
                      text="Không có sản phẩm tồn kho thấp."
                      compact
                    />
                  ) : (
                    dashboard.lowStockProducts
                      .slice(0, 6)
                      .map((product) => (
                        <LowStockRow key={product.id} product={product} />
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel
          title="6. Đánh giá & chất lượng"
          subtitle="Phản hồi sản phẩm mẫu và tín hiệu chất lượng danh mục"
          action="Xem sản phẩm"
          onAction={() => onSectionChange?.("products")}
        >
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniStat
                label="Điểm đánh giá TB"
                value={dashboard.reviewOverview.displayAverage}
              />
              <MiniStat
                label="Tổng bình luận"
                value={dashboard.reviewOverview.totalComments}
              />
            </div>

            <div className="rounded-3xl bg-[#f8f9ff] p-5">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-[#191b23]">
                  Điểm chất lượng danh mục
                </p>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#004ac6] shadow-sm">
                  {dashboard.reviewOverview.sampleCount} mẫu
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {dashboard.reviewOverview.ratingBuckets.length === 0 ? (
                  <EmptyState text="Chưa có dữ liệu đánh giá mẫu." compact />
                ) : (
                  dashboard.reviewOverview.ratingBuckets.map((item) => (
                    <RatingRow key={item.label} item={item} />
                  ))
                )}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <ProductReviewCard
                title="Sản phẩm được đánh giá cao"
                item={dashboard.reviewOverview.topRated}
              />
              <ProductReviewCard
                title="Sản phẩm cần theo dõi"
                item={dashboard.reviewOverview.lowRated}
                accent="rose"
              />
            </div>
          </div>
        </Panel>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel
          title="7. Thanh toán"
          subtitle="Phương thức, trạng thái và tỷ lệ thanh toán thành công"
        >
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniStat
                label="Thanh toán thành công"
                value={dashboard.paidOrders}
              />
              <MiniStat
                label="Thanh toán lỗi / quá hạn"
                value={dashboard.failedPayments}
              />
              <MiniStat
                label="Tỷ lệ thanh toán thành công"
                value={formatPercent(dashboard.paymentSuccessRate)}
              />
              <MiniStat
                label="Doanh thu đã thu"
                value={currencyFormatter.format(dashboard.paidRevenue)}
              />
            </div>

            <div className="rounded-3xl border border-[#c3c6d7]/20 bg-[#f8f9ff] p-5">
              <p className="text-sm font-semibold text-[#191b23]">
                Phân bổ phương thức thanh toán
              </p>
              <div className="mt-4 space-y-3">
                {dashboard.paymentMethodSummary.length === 0 ? (
                  <EmptyState text="Chưa có dữ liệu thanh toán." compact />
                ) : (
                  dashboard.paymentMethodSummary.map((item) => (
                    <ProgressRow
                      key={item.label}
                      label={item.label}
                      value={item.count}
                      max={dashboard.maxPaymentMethodCount}
                      helper={item.helper}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </Panel>

        <Panel
          title="Giao dịch gần đây"
          subtitle="Đơn mới, trạng thái thanh toán và số tiền"
        >
          <div className="overflow-hidden rounded-3xl border border-[#c3c6d7]/20 bg-white shadow-sm">
            {dashboard.recentOrders.length === 0 ? (
              <EmptyState text="Chưa có giao dịch gần đây." />
            ) : (
              <div className="divide-y divide-[#c3c6d7]/15">
                {dashboard.recentOrders.slice(0, 8).map((order) => (
                  <PaymentRow key={order.orderId || order.id} order={order} />
                ))}
              </div>
            )}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function buildDashboardData({
  orders,
  products,
  categories,
  users,
  reviewSamples,
}) {
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeProducts = Array.isArray(products) ? products : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeUsers = Array.isArray(users) ? users : [];
  const safeReviewSamples = Array.isArray(reviewSamples) ? reviewSamples : [];

  const completedOrders = safeOrders.filter(isCompletedOrder);
  const cancelledOrders = safeOrders.filter(isCancelledOrder);
  const activeOrders = safeOrders.filter((order) => !isCancelledOrder(order));

  const revenue = completedOrders.reduce(
    (sum, order) => sum + getOrderTotal(order),
    0,
  );
  const grossProfit = completedOrders.reduce(
    (sum, order) => sum + getOrderGrossProfit(order),
    0,
  );
  const revenue30Days = filterOrdersByWindow(
    completedOrders,
    ANALYTICS_WINDOW_DAYS,
  ).reduce((sum, order) => sum + getOrderTotal(order), 0);

  const grossMarginRate = revenue > 0 ? grossProfit / revenue : 0;
  const costOfGoods = Math.max(0, revenue - grossProfit);
  const profitableProducts = safeProducts.filter(
    (product) => getMarginRate(product) > 0,
  ).length;

  const dailyRevenue = buildDailySeries(
    completedOrders,
    LOOKBACK_DAYS,
    (order) => getOrderTotal(order),
  );
  const maxDailyRevenue = Math.max(...dailyRevenue.map((day) => day.value), 0);

  const statusOrder = [
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ];
  const statusSummary = statusOrder.map((status) => ({
    status,
    count: safeOrders.filter((order) => getOrderStatus(order) === status)
      .length,
  }));

  const paymentMethods = countBy(safeOrders, (order) =>
    normalizePaymentMethod(getPaymentMethod(order)),
  );
  const paymentStatuses = countBy(safeOrders, (order) =>
    normalizePaymentStatus(getPaymentStatus(order)),
  );
  const paymentMethodSummary = Object.entries(paymentMethods)
    .sort((left, right) => right[1] - left[1])
    .map(([label, count]) => ({
      label,
      count,
      helper: paymentMethodHint(label),
    }));
  const maxPaymentMethodCount = Math.max(
    ...paymentMethodSummary.map((item) => item.count),
    0,
  );

  const totalUsers = safeUsers.length;
  const newUsers30 = safeUsers.filter((user) =>
    isWithinDays(user.createdAt || user.created_at, ANALYTICS_WINDOW_DAYS),
  ).length;
  const activeCustomerIds = new Set(
    activeOrders
      .filter((order) => order.userId != null || order.user_id != null)
      .map((order) => String(order.userId ?? order.user_id)),
  );
  const userOrderCounts = new Map();
  activeOrders.forEach((order) => {
    const userId = String(order.userId ?? order.user_id ?? "");
    if (!userId) return;
    const current = userOrderCounts.get(userId) || {
      count: 0,
      revenue: 0,
      lastOrderAt: 0,
    };
    current.count += 1;
    current.revenue += getOrderTotal(order);
    const time = getDateValue(order.createdAt || order.created_at);
    if (time > current.lastOrderAt) {
      current.lastOrderAt = time;
    }
    userOrderCounts.set(userId, current);
  });
  const repeatCustomers = [...userOrderCounts.values()].filter(
    (item) => item.count > 1,
  ).length;
  const repeatRate =
    activeCustomerIds.size > 0 ? repeatCustomers / activeCustomerIds.size : 0;
  const activeCustomers30 = [...userOrderCounts.entries()].filter(([, value]) =>
    isWithinDays(value.lastOrderAt, ANALYTICS_WINDOW_DAYS),
  ).length;

  const usersById = new Map(safeUsers.map((user) => [String(user.id), user]));
  const topCustomers = [...userOrderCounts.entries()]
    .map(([userId, value]) => ({
      userId,
      ...value,
      user: usersById.get(userId) || null,
    }))
    .sort((left, right) => right.revenue - left.revenue)
    .slice(0, 5);

  const totalProducts = safeProducts.length;
  const hiddenProducts = safeProducts.filter(
    (product) => normalizeProductStatus(product.status) === "HIDDEN",
  ).length;
  const lowStockProducts = safeProducts
    .filter(
      (product) =>
        Number(product.stockQuantity ?? product.stock_quantity ?? 0) <=
        LOW_STOCK_THRESHOLD,
    )
    .sort(
      (left, right) =>
        Number(left.stockQuantity ?? left.stock_quantity ?? 0) -
        Number(right.stockQuantity ?? right.stock_quantity ?? 0),
    );
  const outOfStockProducts = safeProducts.filter(
    (product) =>
      Number(product.stockQuantity ?? product.stock_quantity ?? 0) <= 0,
  ).length;
  const inventoryValue = safeProducts.reduce(
    (sum, product) => sum + getInventoryValue(product),
    0,
  );

  const categoryMap = new Map(
    safeCategories.map((category) => [String(category.id), category]),
  );
  const categoryCounts = countBy(safeProducts, (product) =>
    String(product.category?.id ?? product.category_id ?? "uncategorized"),
  );
  const categorySummary = Object.entries(categoryCounts)
    .map(([id, count]) => {
      const category = categoryMap.get(id);
      return {
        id,
        count,
        label: category?.name || "Chưa phân loại",
        helper: category?.slug || `CAT-${id}`,
      };
    })
    .sort((left, right) => right.count - left.count);
  const maxCategoryCount = Math.max(
    ...categorySummary.map((item) => item.count),
    0,
  );

  const recentOrders = sortOrdersNewestFirst(safeOrders).slice(0, 8);
  const recentOrders30 = filterOrdersByWindow(
    safeOrders,
    ANALYTICS_WINDOW_DAYS,
  ).length;
  const averageOrderValue =
    completedOrders.length > 0 ? revenue / completedOrders.length : 0;
  const completedRate =
    activeOrders.length > 0 ? completedOrders.length / activeOrders.length : 0;
  const cancelRate =
    safeOrders.length > 0 ? cancelledOrders.length / safeOrders.length : 0;
  const averageFulfillmentMinutes = averageCompletedMinutes(completedOrders);
  const paymentSuccessRate =
    safeOrders.length > 0 ? (paymentStatuses.PAID || 0) / safeOrders.length : 0;
  const paidOrders = paymentStatuses.PAID || 0;
  const failedPayments =
    (paymentStatuses.FAILED || 0) +
    (paymentStatuses.EXPIRED || 0) +
    (paymentStatuses.CANCELLED || 0);
  const paidRevenue = safeOrders
    .filter((order) => isPaidOrder(order))
    .reduce((sum, order) => sum + getOrderTotal(order), 0);

  const reviewOverview = buildReviewOverview(safeReviewSamples);

  return {
    totalOrders: safeOrders.length,
    completedOrders: completedOrders.length,
    cancelledOrders: cancelledOrders.length,
    pendingOrders: safeOrders.filter((order) =>
      ["PENDING", "CONFIRMED", "PROCESSING"].includes(getOrderStatus(order)),
    ).length,
    revenue,
    grossProfit,
    revenue30Days,
    recentRevenue: dailyRevenue.reduce((sum, day) => sum + day.value, 0),
    recentRevenue30: revenue30Days,
    averageOrderValue,
    completedRate,
    cancelRate,
    grossMarginRate,
    costOfGoods,
    profitableProducts,
    dailyRevenue,
    maxDailyRevenue,
    statusSummary,
    paymentMethodSummary,
    paymentStatuses,
    maxPaymentMethodCount,
    totalUsers,
    newUsers30,
    activeCustomers30,
    repeatCustomers,
    repeatRate,
    topCustomers,
    totalProducts,
    hiddenProducts,
    lowStockProducts,
    outOfStockProducts,
    inventoryValue,
    categorySummary,
    maxCategoryCount,
    recentOrders,
    recentOrders30,
    averageFulfillmentMinutes,
    paidOrders,
    failedPayments,
    paymentSuccessRate,
    paidRevenue,
    reviewOverview,
  };
}

function buildReviewOverview(reviewSamples) {
  const items = Array.isArray(reviewSamples) ? reviewSamples : [];
  const normalized = items
    .map((item) => {
      const averageRating =
        Number(item?.averageRating ?? item?.ratingStats?.averageRating ?? 0) ||
        0;
      const totalComments =
        Number(item?.totalComments ?? item?.ratingStats?.totalComments ?? 0) ||
        0;
      return {
        product: item?.product || null,
        averageRating,
        totalComments,
        comments: Array.isArray(item?.comments) ? item.comments : [],
      };
    })
    .filter((item) => item.product);

  const overallAverage = normalized.length
    ? normalized.reduce((sum, item) => sum + item.averageRating, 0) /
      normalized.length
    : 0;
  const totalComments = normalized.reduce(
    (sum, item) => sum + item.totalComments,
    0,
  );
  const topRated =
    [...normalized].sort(
      (left, right) => right.averageRating - left.averageRating,
    )[0] || null;
  const lowRated =
    [...normalized].sort(
      (left, right) => left.averageRating - right.averageRating,
    )[0] || null;

  return {
    displayAverage: normalized.length ? overallAverage.toFixed(1) : "0.0",
    totalComments,
    sampleCount: normalized.length,
    ratingBuckets: normalized.map((item) => ({
      label: item.product?.name || "Sản phẩm",
      value: item.averageRating,
      count: item.totalComments,
    })),
    topRated,
    lowRated,
  };
}

function buildDailySeries(orders, days, valueSelector) {
  const now = new Date();
  const items = Array.from({ length: days }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (days - 1 - index));
    return {
      key: date.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat("vi-VN", { weekday: "short" }).format(
        date,
      ),
      dateLabel: new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      }).format(date),
      value: 0,
      orders: 0,
    };
  });

  const byKey = new Map(items.map((item) => [item.key, item]));
  orders.forEach((order) => {
    const createdAt = getDateValue(order.createdAt || order.created_at);
    if (!createdAt) return;
    const key = new Date(createdAt).toISOString().slice(0, 10);
    const bucket = byKey.get(key);
    if (!bucket) return;
    bucket.value += valueSelector(order);
    bucket.orders += 1;
  });

  return items;
}

function averageCompletedMinutes(orders) {
  if (!orders.length) return 0;

  const durations = orders
    .map((order) => {
      const start = getDateValue(order.createdAt || order.created_at);
      const end = getDateValue(
        order.completedAt ||
          order.completed_at ||
          order.updatedAt ||
          order.updated_at,
      );
      if (!start || !end || end <= start) return null;
      return (end - start) / 60000;
    })
    .filter((value) => typeof value === "number");

  if (!durations.length) return 0;
  return durations.reduce((sum, value) => sum + value, 0) / durations.length;
}

function filterOrdersByWindow(orders, days) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return orders.filter(
    (order) => getDateValue(order.createdAt || order.created_at) >= cutoff,
  );
}

function getOrderTotal(order) {
  return (
    Number(
      order?.finalAmount ??
        order?.final_amount ??
        order?.totalAmount ??
        order?.total ??
        order?.grandTotal ??
        0,
    ) || 0
  );
}

function getOrderGrossProfit(order) {
  if (order?.grossProfit != null) {
    return Number(order.grossProfit) || 0;
  }
  const items = Array.isArray(order?.items) ? order.items : [];
  return items.reduce((sum, item) => {
    const salePrice = Number(item?.price ?? 0) || 0;
    const costPrice = Number(item?.costPrice ?? 0) || 0;
    const quantity = Number(item?.quantity ?? 0) || 0;
    return sum + (salePrice - costPrice) * quantity;
  }, 0);
}

function getOrderStatus(order) {
  return String(
    order?.status ?? order?.orderStatus ?? order?.order_status ?? "",
  ).toUpperCase();
}

function getPaymentStatus(order) {
  return String(
    order?.paymentStatus ?? order?.payment_status ?? "",
  ).toUpperCase();
}

function getPaymentMethod(order) {
  return String(
    order?.paymentMethod ?? order?.payment_method ?? "COD",
  ).toUpperCase();
}

function isCancelledOrder(order) {
  return ["CANCELLED", "CANCELED"].includes(getOrderStatus(order));
}

function isCompletedOrder(order) {
  return ["DELIVERED", "COMPLETED"].includes(getOrderStatus(order));
}

function isPaidOrder(order) {
  return (
    ["PAID", "SUCCESS", "COMPLETED", "DELIVERED"].includes(
      getPaymentStatus(order),
    ) || isCompletedOrder(order)
  );
}

function normalizeProductStatus(status) {
  return String(status || "ACTIVE").toUpperCase();
}

function normalizePaymentMethod(method) {
  const value = String(method || "COD").toUpperCase();
  const labels = {
    COD: "COD",
    MOMO: "MoMo",
    VNPAY: "VNPay",
    BANK_TRANSFER: "Chuyển khoản",
    BANKING: "Chuyển khoản",
    CREDIT_CARD: "Thẻ tín dụng",
    PAYPAL: "PayPal",
  };
  return labels[value] || value;
}

function normalizePaymentStatus(status) {
  const value = String(status || "PENDING").toUpperCase();
  const labels = {
    PENDING: "Chờ thanh toán",
    PAID: "Đã thanh toán",
    SUCCESS: "Thành công",
    FAILED: "Thất bại",
    EXPIRED: "Quá hạn",
    CANCELLED: "Đã hủy",
    CANCELED: "Đã hủy",
  };
  return labels[value] || value;
}

function paymentMethodHint(method) {
  switch (method) {
    case "COD":
      return "Thu hộ khi giao hàng";
    case "MoMo":
      return "Ví điện tử";
    case "VNPay":
      return "Cổng thanh toán";
    case "Chuyển khoản":
      return "Ngân hàng";
    case "Thẻ tín dụng":
      return "Thẻ thanh toán";
    case "PayPal":
      return "Thanh toán quốc tế";
    default:
      return "Phương thức khác";
  }
}

function getDateValue(value) {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function isWithinDays(value, days) {
  const timestamp = typeof value === "number" ? value : getDateValue(value);
  if (!timestamp) return false;
  return timestamp >= Date.now() - days * 24 * 60 * 60 * 1000;
}

function getMarginRate(product) {
  const price = Number(product?.price ?? 0) || 0;
  const cost =
    Number(
      product?.costPrice ?? product?.cost_price ?? product?.purchasePrice ?? 0,
    ) || 0;
  if (price <= 0) return 0;
  return Math.max(0, Math.min(1, (price - cost) / price));
}

function getInventoryValue(product) {
  const cost =
    Number(
      product?.costPrice ?? product?.cost_price ?? product?.purchasePrice ?? 0,
    ) || 0;
  const stock =
    Number(product?.stockQuantity ?? product?.stock_quantity ?? 0) || 0;
  return cost * stock;
}

function readDashboardSnapshot() {
  return null;
}

function writeDashboardSnapshot() {
  try {
    window.sessionStorage.removeItem(DASHBOARD_CACHE_KEY);
  } catch {
    // Ignore storage failures; dashboard data is always refreshed from services.
  }
}

function applyDashboardSnapshot(snapshot, setters) {
  setters.setOrders(normalizeCollection(snapshot.orders));
  setters.setProducts(normalizeCollection(snapshot.products));
  setters.setCategories(normalizeCollection(snapshot.categories));
  setters.setUsers(normalizeCollection(snapshot.users));
  setters.setReviewSamples(normalizeCollection(snapshot.reviewSamples));
}

function normalizeCollection(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
}

function countBy(items, getter) {
  return items.reduce((accumulator, item) => {
    const key = getter(item);
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
}

function formatPercent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

function formatMinutes(value) {
  if (!value) return "-";
  return `${Math.round(value)} phút`;
}

function MetricCard({ icon, label, value, helper, tone = "blue" }) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
    teal: "bg-teal-50 text-teal-700",
    rose: "bg-rose-50 text-rose-700",
  }[tone];

  return (
    <div className="rounded-[1.6rem] border border-white/70 bg-white/90 p-5 shadow-[0_12px_40px_rgba(25,27,35,0.06)] backdrop-blur">
      <div className="mb-5 flex items-center justify-between gap-4">
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${toneClass}`}
        >
          <span className="material-symbols-outlined">{icon}</span>
        </span>
        <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#737686]">
          {label}
        </span>
      </div>
      <p className="text-3xl font-extrabold tracking-tight text-[#191b23]">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[#737686]">{helper}</p>
    </div>
  );
}

function Panel({ title, subtitle, action, onAction, children }) {
  return (
    <section className="rounded-[1.8rem] border border-white/70 bg-white/90 p-5 shadow-[0_14px_50px_rgba(25,27,35,0.06)] backdrop-blur sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-extrabold tracking-tight text-[#191b23]">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-2 text-sm leading-6 text-[#737686]">{subtitle}</p>
          ) : null}
        </div>
        {action ? (
          <button
            type="button"
            onClick={onAction}
            className="rounded-full border border-[#004ac6]/20 bg-[#f3f3fe] px-4 py-2 text-sm font-bold text-[#004ac6] transition hover:bg-[#e8edff]"
          >
            {action}
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function StatBox({ label, value, description }) {
  return (
    <div className="rounded-3xl border border-[#c3c6d7]/20 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#737686]">
        {label}
      </p>
      <p className="mt-3 text-2xl font-extrabold tracking-tight text-[#191b23]">
        {value}
      </p>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-[#737686]">{description}</p>
      ) : null}
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#c3c6d7]/20 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#737686]">
        {label}
      </p>
      <p className="mt-3 text-lg font-extrabold text-[#191b23]">{value}</p>
    </div>
  );
}

function RevenueBar({ day, max }) {
  const height = max > 0 ? Math.max(8, Math.round((day.value / max) * 100)) : 8;

  return (
    <div className="flex h-full min-w-0 flex-col justify-end gap-3">
      <div className="flex h-52 items-end rounded-2xl bg-white p-2 shadow-sm">
        <div
          className="w-full rounded-xl bg-[linear-gradient(180deg,#0057d6,#004ac6)] transition-all"
          style={{ height: `${height}%` }}
          title={`${day.dateLabel}: ${currencyFormatter.format(day.value)}`}
        />
      </div>
      <div className="text-center">
        <p className="truncate text-xs font-bold text-[#191b23]">{day.label}</p>
        <p className="truncate text-xs text-[#737686]">{day.orders} đơn</p>
      </div>
    </div>
  );
}

function StatusMiniCard({ item, total }) {
  const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;

  return (
    <div className="rounded-3xl border border-[#c3c6d7]/20 bg-[#f8f9ff] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${getOrderBadgeClass(item.status)}`}
        >
          {getStatusLabel(item.status)}
        </span>
        <span className="text-sm font-extrabold text-[#191b23]">
          {item.count}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full bg-[#004ac6]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function RecentOrderRow({ order }) {
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-bold text-[#191b23]">
          #{order.orderCode || order.order_code || order.orderId || order.id}
        </p>
        <p className="mt-1 text-sm text-[#737686]">
          {formatDateTime(order.createdAt || order.created_at)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${getOrderBadgeClass(getOrderStatus(order))}`}
        >
          {getStatusLabel(getOrderStatus(order))}
        </span>
        <span className="rounded-full bg-[#f3f3fe] px-3 py-1 text-xs font-bold text-[#004ac6]">
          {normalizePaymentMethod(getPaymentMethod(order))}
        </span>
        <span className="text-sm font-extrabold text-[#191b23]">
          {currencyFormatter.format(getOrderTotal(order))}
        </span>
      </div>
    </div>
  );
}

function CustomerRow({ customer }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div>
        <p className="font-bold text-[#191b23]">
          {customer.user?.fullName ||
            customer.user?.full_name ||
            customer.user?.email ||
            `Khách #${customer.userId}`}
        </p>
        <p className="mt-1 text-sm text-[#737686]">
          {customer.count} đơn • Cập nhật {formatDateTime(customer.lastOrderAt)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-extrabold text-[#191b23]">
          {currencyFormatter.format(customer.revenue)}
        </p>
        <p className="text-xs text-[#737686]">Doanh thu</p>
      </div>
    </div>
  );
}

function LowStockRow({ product }) {
  const stock =
    Number(product.stockQuantity ?? product.stock_quantity ?? 0) || 0;
  const marginRate = getMarginRate(product);

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#c3c6d7]/20 bg-[#faf8ff] p-4">
      <div className="min-w-0">
        <p className="truncate font-bold text-[#191b23]">{product.name}</p>
        <p className="mt-1 text-sm text-[#737686]">
          Tồn kho: {stock} • Biên: {formatPercent(marginRate)}
        </p>
      </div>
      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
        {stock <= 0 ? "Hết hàng" : "Sắp hết"}
      </span>
    </div>
  );
}

function ProgressRow({ label, value, max, helper }) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <div>
          <p className="font-semibold text-[#191b23]">{label}</p>
          {helper ? <p className="text-xs text-[#737686]">{helper}</p> : null}
        </div>
        <span className="font-bold text-[#191b23]">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full bg-[#004ac6]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function RatingRow({ item }) {
  const percent = Math.max(
    0,
    Math.min(100, Math.round((Number(item.value) || 0) * 20)),
  );
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <div>
          <p className="font-semibold text-[#191b23]">{item.label}</p>
          <p className="text-xs text-[#737686]">{item.count} bình luận mẫu</p>
        </div>
        <span className="font-bold text-[#191b23]">
          {Number(item.value).toFixed(1)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#ff6b1a,#004ac6)]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function ProductReviewCard({ title, item, accent = "blue" }) {
  if (!item?.product) {
    return (
      <div className="rounded-3xl border border-dashed border-[#c3c6d7]/30 bg-[#faf8ff] p-4">
        <p className="text-sm font-semibold text-[#191b23]">{title}</p>
        <p className="mt-2 text-sm text-[#737686]">
          Chưa có dữ liệu đánh giá mẫu.
        </p>
      </div>
    );
  }

  const accentClass =
    accent === "rose"
      ? "text-rose-700 bg-rose-50"
      : "text-[#004ac6] bg-[#f3f3fe]";

  return (
    <div className="rounded-3xl border border-[#c3c6d7]/20 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-[#191b23]">{title}</p>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-bold text-[#191b23]">
            {item.product.name || "Sản phẩm"}
          </p>
          <p className="mt-1 text-sm text-[#737686]">
            {item.totalComments} bình luận mẫu
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${accentClass}`}
        >
          {Number(item.averageRating).toFixed(1)}/5
        </span>
      </div>
    </div>
  );
}

function PaymentRow({ order }) {
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-bold text-[#191b23]">
          #{order.orderCode || order.order_code || order.orderId || order.id}
        </p>
        <p className="mt-1 text-sm text-[#737686]">
          {normalizePaymentMethod(getPaymentMethod(order))} •{" "}
          {normalizePaymentStatus(getPaymentStatus(order))}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-extrabold text-[#191b23]">
          {currencyFormatter.format(getOrderTotal(order))}
        </p>
        <p className="text-xs text-[#737686]">
          {formatDateTime(
            order.updatedAt ||
              order.updated_at ||
              order.createdAt ||
              order.created_at,
          )}
        </p>
      </div>
    </div>
  );
}

function EmptyState({ text, compact = false }) {
  return (
    <div
      className={`flex items-center justify-center text-center text-sm text-[#737686] ${
        compact ? "py-4" : "min-h-28 py-8"
      }`}
    >
      {text}
    </div>
  );
}
