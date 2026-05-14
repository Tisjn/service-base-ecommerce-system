import {
  canCustomerCancel,
  currencyFormatter,
  formatDateTime,
  getOrderBadgeClass,
  getStatusLabel,
  orderStatusOptions,
} from "../orderUtils";

export default function OrderAdminSection({
  adminLoading,
  adminOrders,
  adminStats,
  updatingOrderId,
  onUpdateOrderStatus,
  onCancelOrder,
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">
            Quản trị đơn hàng
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">
            Duyệt đơn COD và cập nhật tiến độ giao hàng
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Danh sách được sắp xếp theo ngày tạo mới nhất. Admin xem chi tiết
            đơn, địa chỉ giao hàng và chuyển trạng thái theo nghiệp vụ.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Tổng" value={adminStats.total} />
          <Stat label="Chờ" value={adminStats.pending} />
          <Stat label="Đã xác nhận" value={adminStats.confirmed} />
          <Stat label="Hoàn tất" value={adminStats.delivered} />
        </div>
      </div>

      {adminLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
          Đang tải danh sách đơn hàng...
        </div>
      ) : adminOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
          Chưa có đơn hàng nào để quản trị.
        </div>
      ) : (
        <div className="space-y-4">
          {adminOrders.map((order) => (
            <article
              key={order.orderId}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-bold text-slate-950">
                      Đơn #{order.orderId}
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

                  <dl className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                    <Info label="Khách hàng" value={`User #${order.userId || "-"}`} />
                    <Info label="Ngày tạo" value={formatDateTime(order.createdAt)} />
                    <Info
                      label="Tổng tiền"
                      value={currencyFormatter.format(order.totalAmount || 0)}
                    />
                  </dl>

                  {order.shippingAddress && (
                    <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                      <span className="font-semibold text-slate-950">
                        Địa chỉ giao:
                      </span>{" "}
                      {order.shippingAddress}
                    </p>
                  )}

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {(order.items || []).map((item) => (
                      <div
                        key={`${order.orderId}-${item.productId}`}
                        className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm"
                      >
                        <p className="font-semibold text-slate-900">
                          {item.productName}
                        </p>
                        <p className="mt-1 text-slate-500">
                          SL {item.quantity} ·{" "}
                          {currencyFormatter.format(item.price || 0)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <label className="text-sm font-semibold text-slate-800">
                    Cập nhật trạng thái
                    <select
                      value={order.status || "PENDING"}
                      disabled={updatingOrderId === order.orderId}
                      onChange={(event) =>
                        onUpdateOrderStatus(order.orderId, event.target.value)
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {orderStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {getStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </label>

                  {canCustomerCancel(order) && (
                    <button
                      type="button"
                      disabled={updatingOrderId === order.orderId}
                      onClick={() => onCancelOrder(order.orderId)}
                      className="mt-3 w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Hủy đơn chờ xử lý
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-slate-900">{value}</p>
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
