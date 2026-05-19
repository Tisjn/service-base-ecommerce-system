import {
  currencyFormatter,
  formatDateTime,
  getOrderBadgeClass,
  getStatusLabel,
  orderStatusOptions,
} from "../../customer/orders/orderUtils";
import { useIncrementalRows } from "../../../hooks/useIncrementalRows";

export default function AdminOrdersPage({
  orders,
  filteredOrders,
  loading,
  error,
  sortDirection,
  filterDate,
  selectedOrder,
  comments,
  detailLoading,
  detailError,
  updating,
  onToggleSort,
  onFilterDateChange,
  onClearFilterDate,
  onOpenOrder,
  onCloseDetail,
  onStatusChange,
}) {
  const {
    visibleItems: visibleOrders,
    visibleCount,
    totalCount,
    hasMore,
    handleScroll,
  } = useIncrementalRows(filteredOrders);

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-10">
      <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="mb-2 text-4xl font-extrabold tracking-tight text-[#191b23] [font-family:Manrope,system-ui,sans-serif]">
            Quản lý đơn hàng
          </h2>
          <p className="text-[#434655]">
            Xem danh sách đơn mới nhất, theo dõi trạng thái và cập nhật tiến trình giao hàng.
          </p>
        </div>
        <div className="rounded-3xl border border-[#c3c6d7]/10 bg-white p-5">
          <p className="text-xs uppercase tracking-widest text-[#434655]">Tổng đơn hàng</p>
          <p className="mt-2 text-3xl font-extrabold text-[#004ac6]">{orders.length}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[#434655]">
            <span>Sắp xếp theo ngày:</span>
            <button type="button" onClick={onToggleSort} className="rounded-full border border-[#c3c6d7]/50 bg-[#f3f3fe] px-3 py-1 text-sm font-semibold text-[#004ac6] transition hover:bg-[#e7e7f3]">
              {sortDirection === "desc" ? "Mới nhất trước" : "Cũ nhất trước"}
            </button>
            <label className="inline-flex items-center gap-2 rounded-full border border-[#c3c6d7]/50 bg-white px-3 py-1 text-sm text-[#434655] shadow-sm">
              <span className="material-symbols-outlined text-base text-[#004ac6]">calendar_month</span>
              <span>Chọn ngày:</span>
              <input type="date" value={filterDate} onChange={(event) => onFilterDateChange(event.target.value)} onKeyDown={(event) => event.preventDefault()} className="w-36 cursor-pointer rounded-lg border border-[#c3c6d7]/60 bg-white px-2 py-1 text-sm text-[#191b23] outline-none transition focus:border-[#004ac6] focus:ring-2 focus:ring-[#004ac6]/20" />
            </label>
            {filterDate && (
              <button type="button" onClick={onClearFilterDate} className="rounded-full border border-[#c3c6d7]/50 bg-[#f3f3fe] px-3 py-1 text-sm font-semibold text-[#004ac6] transition hover:bg-[#e7e7f3]">
                Xóa filter
              </button>
            )}
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#c3c6d7]/10 bg-[#f3f3fe] shadow-sm">
        <div className="max-h-[640px] overflow-auto" onScroll={handleScroll}>
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#e7e7f3]">
                <TableHead>Mã đơn hàng</TableHead>
                <TableHead>Khách hàng</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead align="right">Tổng tiền</TableHead>
                <TableHead align="right">Thao tác</TableHead>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c3c6d7]/20">
              {loading ? (
                <EmptyRow colSpan={6} text="Đang tải đơn hàng..." />
              ) : error ? (
                <EmptyRow colSpan={6} text={error} />
              ) : filteredOrders.length === 0 ? (
                <EmptyRow colSpan={6} text="Không có đơn hàng phù hợp." />
              ) : (
                visibleOrders.map((order) => (
                  <AdminOrderRow
                    key={order.orderId || order.id}
                    order={order}
                    onOpen={() => onOpenOrder(order)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && !error && filteredOrders.length > 0 ? (
          <div className="flex flex-col gap-3 border-t border-[#c3c6d7]/20 bg-[#e1e2ed]/30 px-6 py-4 text-sm font-medium text-[#434655] sm:flex-row sm:items-center sm:justify-between">
            <p>
              Đã hiển thị <span className="font-bold text-[#191b23]">{visibleCount}</span> trong số <span className="font-bold text-[#191b23]">{totalCount}</span> đơn hàng
            </p>
            <span className="rounded-lg bg-[#004ac6] px-3 py-2 text-xs font-bold text-white">
              {hasMore ? "Cuộn để tải thêm" : "Đã tải hết"}
            </span>
          </div>
        ) : null}
      </section>

      {selectedOrder && (
        <AdminOrderDetailModal
          order={selectedOrder}
          comments={comments}
          loading={detailLoading}
          error={detailError}
          updating={updating}
          onClose={onCloseDetail}
          onStatusChange={onStatusChange}
        />
      )}
    </div>
  );
}

function AdminOrderRow({ order, onOpen }) {
  const orderId = order.orderId || order.id || "N/A";
  const customer = order.customerName || order.customerEmail || `User #${order.userId || "?"}`;
  return (
    <tr className="transition hover:bg-white">
      <td className="px-6 py-5 font-semibold text-[#191b23]">#{orderId}</td>
      <td className="px-6 py-5 text-sm text-[#434655]">{customer}</td>
      <td className="px-6 py-5">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${getOrderBadgeClass(order.status)}`}>
          {getStatusLabel(order.status)}
        </span>
      </td>
      <td className="px-6 py-5 text-sm text-[#434655]">{formatDateTime(order.createdAt)}</td>
      <td className="px-6 py-5 text-right font-semibold text-[#191b23]">
        {currencyFormatter.format(order.finalAmount || order.totalAmount || 0)}
      </td>
      <td className="px-6 py-5 text-right">
        <button type="button" onClick={onOpen} className="azure-button-muted">Chi tiết</button>
      </td>
    </tr>
  );
}

function AdminOrderDetailModal({ order, comments, loading, error, updating, onClose, onStatusChange }) {
  const currentIndex = orderStatusOptions.indexOf(order?.status);
  const nextStatus = orderStatusOptions[currentIndex + 1] || "";
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <section className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#c3c6d7]/20 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#737686]">Chi tiết đơn hàng</p>
            <h3 className="mt-1 text-2xl font-extrabold text-[#191b23]">Đơn #{order?.orderId || order?.id || "-"}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-[#434655] hover:bg-[#f3f3fe]">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="space-y-5 px-6 py-6">
          {loading ? <p className="text-sm text-[#737686]">Đang tải chi tiết...</p> : null}
          {error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
          <div className="grid gap-4 md:grid-cols-3">
            <Info label="Trạng thái" value={getStatusLabel(order?.status)} />
            <Info label="Thanh toán" value={`${order?.paymentMethod || "COD"} - ${order?.paymentStatus || "PENDING"}`} />
            <Info label="Tổng tiền" value={currencyFormatter.format(order?.finalAmount || order?.totalAmount || 0)} />
          </div>
          <div className="rounded-2xl border border-[#c3c6d7]/20">
            {(order?.items || []).map((item) => (
              <div key={`${order.orderId || order.id}-${item.productId}-${item.productName}`} className="flex items-center justify-between gap-4 border-b border-[#c3c6d7]/10 px-4 py-3 last:border-b-0">
                <div>
                  <p className="font-bold text-[#191b23]">{item.productName}</p>
                  <p className="text-sm text-[#737686]">SL: {item.quantity}</p>
                </div>
                <p className="font-semibold">{currencyFormatter.format(item.subtotal || item.price * item.quantity || 0)}</p>
              </div>
            ))}
          </div>
          {comments?.length ? (
            <div className="rounded-2xl bg-[#f3f3fe] p-4">
              <p className="mb-3 font-bold text-[#191b23]">Bình luận</p>
              {comments.map((comment) => (
                <p key={comment.id || `${comment.productId}-${comment.createdAt}`} className="text-sm text-[#434655]">
                  {comment.comment}
                </p>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex justify-end gap-3 border-t border-[#c3c6d7]/20 px-6 py-5">
          <button type="button" onClick={onClose} className="azure-button-muted">Đóng</button>
          {nextStatus ? (
            <button type="button" disabled={updating} onClick={() => onStatusChange(nextStatus)} className="azure-button">
              {updating ? "Đang cập nhật..." : `Chuyển sang ${getStatusLabel(nextStatus)}`}
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl bg-[#f3f3fe] p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-[#737686]">{label}</p>
      <p className="mt-2 font-bold text-[#191b23]">{value}</p>
    </div>
  );
}

function TableHead({ children, align = "left" }) {
  return <th className={`px-6 py-5 text-xs font-bold uppercase tracking-widest text-[#434655] ${align === "right" ? "text-right" : "text-left"}`}>{children}</th>;
}

function EmptyRow({ text, colSpan = 6 }) {
  return <tr><td colSpan={colSpan} className="px-6 py-10 text-center text-sm text-[#737686]">{text}</td></tr>;
}
