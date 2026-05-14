import { useMemo, useState } from "react";
import {
  canCustomerCancel,
  currencyFormatter,
  formatDateTime,
  getOrderBadgeClass,
  getStatusLabel,
  orderStatusOptions,
  orderStatusSteps,
} from "../orderUtils";

function OrderTimeline({ status }) {
  if (status === "CANCELLED") {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
        Đơn hàng đã hủy
      </div>
    );
  }

  const currentIndex = orderStatusSteps.indexOf(status);

  return (
    <div className="grid gap-2 sm:grid-cols-5">
      {orderStatusSteps.map((step, index) => {
        const active = index <= currentIndex;
        return (
          <div
            key={step}
            className={`rounded-2xl border px-3 py-2 text-center text-[11px] font-semibold ${
              active
                ? "border-orange-200 bg-orange-50 text-orange-700"
                : "border-slate-200 bg-slate-50 text-slate-400"
            }`}
          >
            {getStatusLabel(step)}
          </div>
        );
      })}
    </div>
  );
}

export default function OrderHistorySection({
  userId,
  products,
  ordersLoading,
  orders,
  orderStats,
  onCancelOrder,
  updatingOrderId,
}) {
  const [statusFilter, setStatusFilter] = useState("ALL");

  const productLookup = useMemo(
    () =>
      Array.isArray(products)
        ? products.reduce((map, product) => {
            if (product?.id != null) {
              map[product.id] = product;
            }
            return map;
          }, {})
        : {},
    [products],
  );

  const resolveItemImageUrl = (item) =>
    item.imageUrl ||
    item.imageURL ||
    productLookup[item.productId]?.imageUrl ||
    productLookup[item.productId]?.imageURL ||
    null;

  const filteredOrders = useMemo(() => {
    if (!orders || statusFilter === "ALL") {
      return orders;
    }
    return orders.filter((order) => order.status === statusFilter);
  }, [orders, statusFilter]);

  const statusOptions = ["ALL", ...orderStatusOptions];

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50/90 p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-600">
            Lịch sử đơn hàng
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">
            Theo dõi trạng thái theo thời gian tạo mới nhất
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Xem nhanh số lượng đơn, tiến độ giao hàng và thông tin đơn gần đây.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Chờ xử lý" value={orderStats.pending} />
          <Stat label="Đã xác nhận" value={orderStats.confirmed} />
          <Stat label="Đang giao" value={orderStats.shipped} />
          <Stat label="Đã hủy" value={orderStats.cancelled} />
        </div>
      </div>

      {!userId ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          Bạn cần đăng nhập để xem lịch sử đơn hàng.
        </div>
      ) : ordersLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
          Đang tải lịch sử đơn hàng...
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
          Chưa có đơn hàng nào.
        </div>
      ) : (
        <>
          <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                Bộ lọc trạng thái đơn hàng
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      statusFilter === status
                        ? "bg-orange-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {status === "ALL" ? "Tất cả" : getStatusLabel(status)}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-semibold text-slate-900">
                  {filteredOrders.length}
                </span>
                <span className="text-slate-500">Đơn hàng được hiển thị</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {filteredOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
                Không có đơn hàng phù hợp với bộ lọc.
              </div>
            ) : (
              filteredOrders.map((order) => {
                return (
                  <article
                    key={order.orderId}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-bold text-slate-950">
                            Đơn hàng #{order.orderId}
                          </h3>
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getOrderBadgeClass(order.status)}`}
                          >
                            {getStatusLabel(order.status)}
                          </span>
                          <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            COD
                          </span>
                        </div>

                        <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                          <Info
                            label="Ngày tạo"
                            value={formatDateTime(order.createdAt)}
                          />
                          <Info
                            label="Số mặt hàng"
                            value={`${order.items?.length || 0} món`}
                          />
                          <Info
                            label="Tổng thanh toán"
                            value={currencyFormatter.format(
                              order.totalAmount || 0,
                            )}
                          />
                        </div>

                        {order.shippingAddress && (
                          <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                            <span className="font-semibold text-slate-950">
                              Giao đến:
                            </span>{" "}
                            {order.shippingAddress}
                          </p>
                        )}
                      </div>

                      <div className="min-w-[240px] rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                          Tình trạng đơn
                        </p>
                        <p className="mt-2 text-lg font-semibold text-slate-950">
                          {getStatusLabel(order.status)}
                        </p>
                        <div className="mt-4">
                          <OrderTimeline status={order.status} />
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 space-y-3">
                      {(order.items || []).map((item) => {
                        const subtotal =
                          (item.price || 0) * (item.quantity || 0);
                        const imageUrl = resolveItemImageUrl(item);
                        return (
                          <div
                            key={`${order.orderId}-${item.productId}-detail`}
                            className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="h-16 w-16 overflow-hidden rounded-3xl bg-slate-100">
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={item.productName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="h-full w-full bg-slate-200" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-950 truncate">
                                {item.productName}
                              </p>
                              <p className="mt-1 text-sm text-slate-500 truncate">
                                {item.variant ||
                                  `Mã sản phẩm #${item.productId}`}
                              </p>
                              <p className="mt-2 text-sm text-slate-600">
                                {currencyFormatter.format(item.price || 0)} · SL{" "}
                                {item.quantity}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                                Tổng
                              </p>
                              <p className="mt-1 text-lg font-semibold text-slate-950">
                                {currencyFormatter.format(subtotal)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {canCustomerCancel(order) && (
                      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                        <button
                          type="button"
                          disabled={updatingOrderId === order.orderId}
                          onClick={() => onCancelOrder(order.orderId)}
                          className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {updatingOrderId === order.orderId
                            ? "Đang xử lý..."
                            : "Hủy đơn chờ xử lý"}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-950">{value}</dd>
    </div>
  );
}
