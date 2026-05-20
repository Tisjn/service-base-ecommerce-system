import {
  currencyFormatter,
  formatDateTime,
  getOrderBadgeClass,
  getStatusLabel,
  orderStatusOptions,
} from "../../customer/orders/orderUtils";

export default function AdminOrdersPage({
  orders,
  filteredOrders,
  pagination,
  loading,
  error,
  sortDirection,
  filterDate,
  filterStatus,
  selectedOrder,
  selectedCustomer,
  selectedAddress,
  comments,
  detailLoading,
  detailError,
  updating,
  onToggleSort,
  onFilterDateChange,
  onFilterStatusChange,
  onClearFilterDate,
  onPageChange,
  onOpenOrder,
  onCloseDetail,
  onStatusChange,
}) {
  const page = Number(pagination?.page || 0);
  const size = Number(pagination?.size || 10);
  const totalPages = Number(pagination?.totalPages || 1);
  const totalCount = Number(pagination?.totalElements || orders.length || 0);
  const visibleOrders = filteredOrders;
  const start = totalCount === 0 ? 0 : page * size + 1;
  const end = Math.min(totalCount, page * size + visibleOrders.length);

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-10">
      <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="mb-2 text-4xl font-extrabold tracking-tight text-[#191b23] [font-family:Manrope,system-ui,sans-serif]">
            Quản lý đơn hàng
          </h2>
          <p className="text-[#434655]">
            Xem danh sách đơn mới nhất, theo dõi trạng thái và cập nhật tiến
            trình giao hàng.
          </p>
        </div>
        <div className="rounded-3xl border border-[#c3c6d7]/10 bg-white p-5">
          <p className="text-xs uppercase tracking-widest text-[#434655]">
            Tổng đơn hàng
          </p>
          <p className="mt-2 text-3xl font-extrabold text-[#004ac6]">
            {totalCount}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[#434655]">
            <span>Sắp xếp theo ngày:</span>
            <button
              type="button"
              onClick={onToggleSort}
              className="rounded-full border border-[#c3c6d7]/50 bg-[#f3f3fe] px-3 py-1 text-sm font-semibold text-[#004ac6] transition hover:bg-[#e7e7f3]"
            >
              {sortDirection === "desc" ? "Mới nhất trước" : "Cũ nhất trước"}
            </button>
            <label className="inline-flex items-center gap-2 rounded-full border border-[#c3c6d7]/50 bg-white px-3 py-1 text-sm text-[#434655] shadow-sm">
              <span className="material-symbols-outlined text-base text-[#004ac6]">
                tune
              </span>
              <span>Trạng thái:</span>
              <select
                value={filterStatus || "ALL"}
                onChange={(event) => onFilterStatusChange?.(event.target.value)}
                className="cursor-pointer rounded-lg border border-[#c3c6d7]/60 bg-white px-2 py-1 text-sm font-semibold text-[#191b23] outline-none transition focus:border-[#004ac6] focus:ring-2 focus:ring-[#004ac6]/20"
              >
                <option value="ALL">Tất cả</option>
                {orderStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {getStatusLabel(status)}
                  </option>
                ))}
              </select>
            </label>
            <label className="inline-flex items-center gap-2 rounded-full border border-[#c3c6d7]/50 bg-white px-3 py-1 text-sm text-[#434655] shadow-sm">
              <span className="material-symbols-outlined text-base text-[#004ac6]">
                calendar_month
              </span>
              <span>Chọn ngày:</span>
              <input
                type="date"
                value={filterDate}
                onChange={(event) => onFilterDateChange(event.target.value)}
                onFocus={openDatePicker}
                onClick={openDatePicker}
                onKeyDown={(event) => event.preventDefault()}
                className="w-36 cursor-pointer rounded-lg border border-[#c3c6d7]/60 bg-white px-2 py-1 text-sm text-[#191b23] outline-none transition focus:border-[#004ac6] focus:ring-2 focus:ring-[#004ac6]/20"
              />
            </label>
            {filterDate && (
              <button
                type="button"
                onClick={onClearFilterDate}
                className="rounded-full border border-[#c3c6d7]/50 bg-[#f3f3fe] px-3 py-1 text-sm font-semibold text-[#004ac6] transition hover:bg-[#e7e7f3]"
              >
                Xóa filter
              </button>
            )}
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#c3c6d7]/10 bg-[#f3f3fe] shadow-sm">
        <div className="max-h-[640px] overflow-auto">
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
              ) : visibleOrders.length === 0 ? (
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
        {!loading && !error && visibleOrders.length > 0 ? (
          <div className="flex flex-col gap-3 border-t border-[#c3c6d7]/20 bg-[#e1e2ed]/30 px-6 py-4 text-sm font-medium text-[#434655] sm:flex-row sm:items-center sm:justify-between">
            <p>
              Hiển thị{" "}
              <span className="font-bold text-[#191b23]">
                {start} - {end}
              </span>{" "}
              trong số{" "}
              <span className="font-bold text-[#191b23]">{totalCount}</span> đơn
              hàng
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={loading || page <= 0}
                onClick={() => onPageChange?.(page - 1)}
                className="text-sm font-bold text-[#191b23] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trước
              </button>
              <span className="rounded-lg bg-[#004ac6] px-3 py-2 text-xs font-bold text-white">
                {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                disabled={loading || page + 1 >= totalPages}
                onClick={() => onPageChange?.(page + 1)}
                className="text-sm font-bold text-[#004ac6] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Tiếp
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {selectedOrder && (
        <AdminOrderDetailModal
          order={selectedOrder}
          customer={selectedCustomer}
          address={selectedAddress}
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
  const customer =
    order.customerName || order.customerEmail || `User #${order.userId || "?"}`;
  return (
    <tr className="transition hover:bg-white">
      <td className="px-6 py-5 font-semibold text-[#191b23]">#{orderId}</td>
      <td className="px-6 py-5 text-sm text-[#434655]">{customer}</td>
      <td className="px-6 py-5">
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${getOrderBadgeClass(order.status)}`}
        >
          {getStatusLabel(order.status)}
        </span>
      </td>
      <td className="px-6 py-5 text-sm text-[#434655]">
        {formatDateTime(order.createdAt)}
      </td>
      <td className="px-6 py-5 text-right font-semibold text-[#191b23]">
        {currencyFormatter.format(order.finalAmount || order.totalAmount || 0)}
      </td>
      <td className="px-6 py-5 text-right">
        <button type="button" onClick={onOpen} className="azure-button-muted">
          Chi tiết
        </button>
      </td>
    </tr>
  );
}

function AdminOrderDetailModal({
  order,
  customer,
  address,
  comments,
  loading,
  error,
  updating,
  onClose,
  onStatusChange,
}) {
  const currentIndex = orderStatusOptions.indexOf(order?.status);
  const nextStatus = orderStatusOptions[currentIndex + 1] || "";
  const orderItems = Array.isArray(order?.items) ? order.items : [];
  const customerName =
    customer?.fullName ||
    order?.customerName ||
    customer?.email ||
    order?.customerEmail ||
    `User #${order?.userId || "?"}`;
  const customerPhone = customer?.phone || address?.phone || "-";
  const customerEmail = customer?.email || order?.customerEmail || "-";
  const shippingAddress =
    formatAddress(address) || order?.shippingAddress || order?.note || "";
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <section className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#c3c6d7]/20 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#737686]">
              Chi tiết đơn hàng
            </p>
            <h3 className="mt-1 text-2xl font-extrabold text-[#191b23]">
              Đơn #{order?.orderId || order?.id || "-"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#434655] hover:bg-[#f3f3fe]"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="space-y-5 px-6 py-6">
          {loading ? (
            <p className="text-sm text-[#737686]">Đang tải chi tiết...</p>
          ) : null}
          {error ? (
            <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}
          <div className="grid gap-4 md:grid-cols-3">
            <Info label="Trạng thái" value={getStatusLabel(order?.status)} />
            <Info
              label="Thanh toán"
              value={`${order?.paymentMethod || "COD"} - ${order?.paymentStatus || "PENDING"}`}
            />
            <Info
              label="Tổng tiền"
              value={currencyFormatter.format(
                order?.finalAmount || order?.totalAmount || 0,
              )}
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#c3c6d7]/20 bg-white p-5">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#004ac6]">
                Thông tin khách hàng
              </p>
              <div className="space-y-3 text-sm">
                <DetailLine label="Tên khách hàng" value={customerName} />
                <DetailLine label="Email" value={customerEmail} />
                <DetailLine label="Số điện thoại" value={customerPhone} />
                <DetailLine
                  label="Mã khách hàng"
                  value={`#${order?.userId || "-"}`}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-[#c3c6d7]/20 bg-white p-5">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#004ac6]">
                Giao hàng
              </p>
              <div className="space-y-3 text-sm">
                <DetailLine
                  label="Người nhận"
                  value={address?.recipientName || customerName}
                />
                <DetailLine
                  label="Điện thoại nhận hàng"
                  value={address?.phone || customerPhone}
                />
                <DetailLine
                  label="Địa chỉ"
                  value={
                    shippingAddress || `Address #${order?.addressId || "-"}`
                  }
                />
                <DetailLine label="Ghi chú" value={order?.note || "-"} />
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <Info
              label="Mã đơn"
              value={
                order?.orderCode || `#${order?.orderId || order?.id || "-"}`
              }
            />
            <Info label="Ngày tạo" value={formatDateTime(order?.createdAt)} />
            <Info label="Cập nhật" value={formatDateTime(order?.updatedAt)} />
            <Info label="Số món" value={`${orderItems.length} món`} />
          </div>
          <div className="rounded-2xl border border-[#c3c6d7]/20">
            <div className="grid grid-cols-[1fr_90px_130px_140px] gap-4 bg-[#f3f3fe] px-4 py-3 text-xs font-bold uppercase tracking-widest text-[#434655]">
              <span>Sản phẩm</span>
              <span className="text-right">SL</span>
              <span className="text-right">Đơn giá</span>
              <span className="text-right">Thành tiền</span>
            </div>
            {orderItems.map((item) => (
              <div
                key={`${order.orderId || order.id}-${item.productId}-${item.productName}`}
                className="flex items-center justify-between gap-4 border-b border-[#c3c6d7]/10 px-4 py-3 last:border-b-0"
              >
                <div>
                  <p className="font-bold text-[#191b23]">{item.productName}</p>
                  <p className="text-sm text-[#737686]">
                    Mã sản phẩm: PRD-{item.productId} · SL: {item.quantity}
                  </p>
                </div>
                <p className="font-semibold">
                  {currencyFormatter.format(
                    item.subtotal || item.price * item.quantity || 0,
                  )}
                </p>
              </div>
            ))}
            {orderItems.length === 0 ? (
              <p className="px-4 py-6 text-sm text-[#737686]">
                Không có dữ liệu sản phẩm trong đơn.
              </p>
            ) : null}
            <div className="space-y-2 bg-white px-4 py-4 text-sm">
              <DetailLine
                label="Tạm tính"
                value={currencyFormatter.format(order?.subtotal || 0)}
              />
              <DetailLine
                label="Phí vận chuyển"
                value={currencyFormatter.format(order?.shippingFee || 0)}
              />
              <DetailLine
                label="Tổng thanh toán"
                value={currencyFormatter.format(
                  order?.finalAmount || order?.totalAmount || 0,
                )}
                strong
              />
            </div>
          </div>
          {comments?.length ? (
            <div className="rounded-2xl bg-[#f3f3fe] p-4">
              <p className="mb-3 font-bold text-[#191b23]">Bình luận</p>
              {comments.map((comment) => (
                <p
                  key={
                    comment.id || `${comment.productId}-${comment.createdAt}`
                  }
                  className="text-sm text-[#434655]"
                >
                  {comment.comment}
                </p>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex justify-end gap-3 border-t border-[#c3c6d7]/20 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            className="azure-button-muted"
          >
            Đóng
          </button>
          {nextStatus ? (
            <button
              type="button"
              disabled={updating}
              onClick={() => onStatusChange(nextStatus)}
              className="azure-button"
            >
              {updating
                ? "Đang cập nhật..."
                : `Chuyển sang ${getStatusLabel(nextStatus)}`}
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
      <p className="text-xs font-bold uppercase tracking-widest text-[#737686]">
        {label}
      </p>
      <p className="mt-2 font-bold text-[#191b23]">{value}</p>
    </div>
  );
}

function DetailLine({ label, value, strong = false }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="shrink-0 text-[#737686]">{label}</span>
      <span
        className={`text-right ${strong ? "font-extrabold text-[#191b23]" : "font-semibold text-[#434655]"}`}
      >
        {value || "-"}
      </span>
    </div>
  );
}

function formatAddress(address) {
  if (!address) return "";
  return [address.street, address.district, address.city]
    .filter(Boolean)
    .join(", ");
}

function TableHead({ children, align = "left" }) {
  return (
    <th
      className={`px-6 py-5 text-xs font-bold uppercase tracking-widest text-[#434655] ${align === "right" ? "text-right" : "text-left"}`}
    >
      {children}
    </th>
  );
}

function EmptyRow({ text, colSpan = 6 }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-6 py-10 text-center text-sm text-[#737686]"
      >
        {text}
      </td>
    </tr>
  );
}

function openDatePicker(event) {
  event.currentTarget.showPicker?.();
}
