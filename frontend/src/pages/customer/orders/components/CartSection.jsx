import { useMemo, useState } from "react";
import { currencyFormatter } from "../orderUtils";

function formatAddress(address) {
  return [address?.street, address?.district, address?.city]
    .filter(Boolean)
    .join(", ");
}

export default function CartSection({
  userId,
  products,
  cartLoading,
  cart,
  checkout,
  setCheckout,
  addresses = [],
  onReloadAddresses,
  onQuantityChange,
  onRemoveFromCart,
  onCheckout,
  submitting,
  cartSummary,
}) {
  const [paymentMethod, setPaymentMethod] = useState("COD");

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

  const canCheckout = Boolean(userId) && cart.length > 0 && checkout.addressId;

  const handleSubmit = async (event) => {
    await onCheckout(event, { paymentMethod });
  };

  return (
    <div className="grid w-full gap-8 xl:grid-cols-[1fr_420px]">
      <div className="space-y-8">
        <section className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-950">
                Giỏ hàng của bạn
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Kiểm tra sản phẩm, số lượng và chọn địa chỉ giao hàng trước khi
                thanh toán.
              </p>
            </div>
            <div className="grid gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 sm:auto-cols-max sm:grid-flow-col sm:items-center">
              <div className="font-semibold">
                {cartSummary.itemCount} sản phẩm
              </div>
              <div className="font-semibold text-slate-900">
                {currencyFormatter.format(cartSummary.subtotal)}
              </div>
            </div>
          </div>

          {cartLoading ? (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
              Đang tải giỏ hàng...
            </div>
          ) : cart.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
              Giỏ hàng đang trống. Hãy thêm sản phẩm từ tab Danh mục.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {cart.map((item) => {
                const subtotal = (item.price || 0) * (item.quantity || 0);
                const imageUrl =
                  item.imageUrl ||
                  productLookup[item.productId]?.imageUrl ||
                  productLookup[item.productId]?.imageURL;
                return (
                  <div
                    key={item.productId}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-28 w-28 overflow-hidden rounded-3xl bg-slate-100">
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
                        <div>
                          <h3 className="text-lg font-bold text-slate-950">
                            {item.productName}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            Mã sản phẩm #{item.productId}
                          </p>
                        </div>
                      </div>
                      <div className="text-right md:text-left">
                        <p className="text-sm text-slate-500">Giá</p>
                        <p className="mt-2 text-lg font-bold text-primary">
                          {currencyFormatter.format(item.price || 0)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2">
                        <button
                          type="button"
                          onClick={() =>
                            onQuantityChange(
                              item.productId,
                              Math.max((item.quantity || 1) - 1, 0),
                            )
                          }
                          className="rounded-full p-2 text-slate-700 transition hover:bg-white"
                          aria-label="Giảm số lượng"
                        >
                          -
                        </button>
                        <span className="px-4 text-sm font-semibold text-slate-950">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onQuantityChange(
                              item.productId,
                              (item.quantity || 0) + 1,
                            )
                          }
                          className="rounded-full p-2 text-slate-700 transition hover:bg-white"
                          aria-label="Tăng số lượng"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div className="text-left">
                          <p className="text-xs text-slate-500">Thành tiền</p>
                          <p className="text-lg font-black text-slate-950">
                            {currencyFormatter.format(subtotal)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveFromCart(item.productId)}
                          className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {userId ? (
          <section className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">
                  Địa chỉ giao hàng
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Chọn một địa chỉ đã lưu trong user-service để tạo đơn hàng.
                </p>
              </div>
              <button
                type="button"
                onClick={onReloadAddresses}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Tải lại địa chỉ
              </button>
            </div>

            {addresses.length === 0 ? (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                Bạn chưa có địa chỉ. Hãy vào Account Settings &gt; Addresses để
                thêm địa chỉ trước khi đặt hàng.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {addresses.map((address) => {
                  const selected =
                    String(checkout.addressId) === String(address.id);
                  return (
                    <label
                      key={address.id}
                      className={`cursor-pointer rounded-3xl border p-5 transition hover:border-orange-300 hover:bg-orange-50 ${
                        selected
                          ? "border-orange-500 bg-orange-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="addressId"
                        className="sr-only"
                        checked={selected}
                        onChange={() =>
                          setCheckout((prev) => ({
                            ...prev,
                            addressId: String(address.id),
                          }))
                        }
                      />
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-slate-950">
                              {address.recipientName || "Người nhận"}
                            </p>
                            {address.defaultAddress ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
                                Mặc định
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm text-slate-500">
                            {address.phone || "-"}
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          {address.label || "Address"}
                        </span>
                      </div>
                      <p className="mt-4 text-sm leading-6 text-slate-600">
                        {formatAddress(address) || "Chưa nhập địa chỉ"}
                      </p>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <label className="text-sm font-bold text-slate-950">
                Ghi chú đơn hàng
              </label>
              <textarea
                rows="3"
                value={checkout.note || ""}
                onChange={(event) =>
                  setCheckout((prev) => ({ ...prev, note: event.target.value }))
                }
                className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                placeholder="Ví dụ: giao giờ hành chính, gọi trước khi giao..."
              />
            </div>
          </section>
        ) : cart.length > 0 ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center">
            <p className="text-sm text-amber-800">
              Hãy đăng nhập để chọn địa chỉ và thanh toán.
            </p>
          </section>
        ) : null}
      </div>

      <aside className="space-y-6">
        {userId ? (
          <>
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <h3 className="text-xl font-extrabold text-slate-950">
                Tóm tắt đơn hàng
              </h3>
              <div className="mt-6 space-y-4 text-sm text-slate-700">
                <div className="flex items-center justify-between">
                  <span>Tạm tính</span>
                  <span className="font-medium text-slate-900">
                    {currencyFormatter.format(cartSummary.subtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Vận chuyển</span>
                  <span
                    className={`font-medium ${
                      cartSummary.shipping === 0
                        ? "text-emerald-600"
                        : "text-slate-900"
                    }`}
                  >
                    {cartSummary.shipping === 0
                      ? "Miễn phí"
                      : currencyFormatter.format(cartSummary.shipping)}
                  </span>
                </div>
                <p className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                  Miễn phí vận chuyển cho đơn từ 500.000 VND, dưới mức này phí
                  vận chuyển là 10.000 VND.
                </p>
                <div className="my-4 h-px bg-slate-100" />
                <div className="flex items-center justify-between text-xl font-extrabold text-slate-950">
                  <span>Tổng cộng</span>
                  <span>{currencyFormatter.format(cartSummary.total)}</span>
                </div>
              </div>

              <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-slate-900 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
                  Phương thức thanh toán
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    { id: "COD", label: "COD" },
                    { id: "MOMO", label: "MoMo" },
                  ].map((method) => (
                    <button
                      type="button"
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`rounded-3xl border px-4 py-3 text-xs font-semibold transition ${
                        paymentMethod === method.id
                          ? "border-orange-600 bg-orange-600 text-white shadow"
                          : "border-slate-200 bg-white text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canCheckout || submitting}
                className="mt-6 w-full rounded-3xl bg-orange-600 py-4 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? "Đang tạo đơn..."
                  : paymentMethod === "MOMO"
                    ? "Thanh toán MoMo"
                    : "Đặt hàng COD"}
              </button>
            </div>

            <div className="flex items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
              <span className="material-symbols-outlined text-primary">
                verified_user
              </span>
              <span>Thông tin thanh toán được tạo qua payment-service</span>
            </div>
          </>
        ) : cart.length > 0 ? (
          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6 text-center">
            <p className="text-sm text-blue-800">
              Giỏ hàng tạm thời sẽ được đồng bộ khi bạn đăng nhập.
            </p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
