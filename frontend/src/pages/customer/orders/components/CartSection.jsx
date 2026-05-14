import { useEffect, useMemo, useState } from "react";
import { currencyFormatter } from "../orderUtils";

export default function CartSection({
  account,
  userId,
  guestToken,
  products,
  cartLoading,
  cart,
  checkout,
  setCheckout,
  onQuantityChange,
  onRemoveFromCart,
  onCheckout,
  submitting,
  cartSummary,
}) {
  const [selectedAddress, setSelectedAddress] = useState(
    account?.shippingAddress ? "saved" : "custom",
  );
  const [showAddressInput, setShowAddressInput] = useState(
    !account?.shippingAddress,
  );
  const [savedAddress, setSavedAddress] = useState(
    account?.shippingAddress || "",
  );
  const [addressDraft, setAddressDraft] = useState(
    checkout.shippingAddress || "",
  );
  const [saveAddress, setSaveAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cod");

  useEffect(() => {
    if (account?.shippingAddress && !checkout.shippingAddress.trim()) {
      setCheckout((prev) => ({
        ...prev,
        shippingAddress: account.shippingAddress,
      }));
      setSelectedAddress("saved");
      setShowAddressInput(false);
    }
  }, [account?.shippingAddress, checkout.shippingAddress, setCheckout]);

  useEffect(() => {
    setSavedAddress(account?.shippingAddress || savedAddress);
  }, [account?.shippingAddress]);

  useEffect(() => {
    setAddressDraft(checkout.shippingAddress || "");
  }, [checkout.shippingAddress]);

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

  const estimatedTax = useMemo(
    () => Math.round((cartSummary.subtotal || 0) * 0.08 * 100) / 100,
    [cartSummary.subtotal],
  );

  const displayTotal = useMemo(
    () => currencyFormatter.format((cartSummary.subtotal || 0) + estimatedTax),
    [cartSummary.subtotal, estimatedTax],
  );

  const canCheckout =
    Boolean(userId) && cart.length > 0 && checkout.shippingAddress.trim();

  const isGuest = !userId && guestToken;
  const hasCart = Boolean(userId) || isGuest;

  const handleSelectSavedAddress = () => {
    setSelectedAddress("saved");
    setShowAddressInput(false);
    setSaveAddress(false);
    setCheckout((prev) => ({
      ...prev,
      shippingAddress: savedAddress || account?.shippingAddress || "",
    }));
  };

  const handleUseCustomAddress = () => {
    setSelectedAddress("custom");
    setShowAddressInput(true);
    setAddressDraft(checkout.shippingAddress || "");
  };

  const handleSaveNewAddress = () => {
    const trimmedAddress = addressDraft.trim();
    if (!trimmedAddress) {
      return;
    }

    setSavedAddress(trimmedAddress);
    setSelectedAddress("saved");
    setShowAddressInput(false);
    setSaveAddress(false);
    setCheckout((prev) => ({
      ...prev,
      shippingAddress: trimmedAddress,
    }));
  };

  const handleSubmit = async (event) => {
    await onCheckout(event, {
      paymentMethod,
      saveAddress,
    });
  };

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_420px] w-full">
      <div className="space-y-8">
        <section className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-950">
                Giỏ hàng của bạn
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Xem lại sản phẩm, điều chỉnh số lượng và hoàn tất đơn hàng với
                địa chỉ giao hàng thật.
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

          {!hasCart ? (
            <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
              Bạn cần đăng nhập hoặc tiếp tục mua sắm để xem giỏ hàng.
            </div>
          ) : cartLoading ? (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
              Đang tải giỏ hàng...
            </div>
          ) : cart.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
              Giỏ hàng đang trống. Hãy thêm sản phẩm từ tab Cửa hàng.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {cart.map((item) => {
                const subtotal = (item.price || 0) * (item.quantity || 0);
                return (
                  <div
                    key={item.productId}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-28 w-28 overflow-hidden rounded-3xl bg-slate-100">
                          {item.imageUrl ||
                          productLookup[item.productId]?.imageUrl ||
                          productLookup[item.productId]?.imageURL ? (
                            <img
                              src={
                                item.imageUrl ||
                                productLookup[item.productId]?.imageUrl ||
                                productLookup[item.productId]?.imageURL
                              }
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
                            {item.variant || `Mã sản phẩm #${item.productId}`}
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
                  Chọn địa chỉ đã lưu hoặc thêm địa chỉ mới để giao hàng nhanh
                  chóng.
                </p>
              </div>
              <p className="text-sm text-slate-500">
                Nhấn vào thẻ để chọn địa chỉ giao hàng.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {savedAddress ? (
                <label
                  className={`cursor-pointer rounded-3xl border p-5 transition hover:border-orange-300 hover:bg-orange-50 ${
                    selectedAddress === "saved" && !showAddressInput
                      ? "border-orange-500 bg-orange-50"
                      : "border-slate-200 bg-white"
                  }`}
                  onClick={handleSelectSavedAddress}
                >
                  <input
                    type="radio"
                    name="shippingAddress"
                    className="sr-only"
                    checked={selectedAddress === "saved" && !showAddressInput}
                    readOnly
                  />
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-slate-950">Nhà riêng</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Địa chỉ đã lưu của bạn.
                      </p>
                    </div>
                    {selectedAddress === "saved" && !showAddressInput ? (
                      <span className="material-symbols-outlined text-orange-600">
                        check_circle
                      </span>
                    ) : (
                      <span className="h-10 w-10 rounded-full border border-slate-200 bg-white text-slate-700 flex items-center justify-center">
                        <span className="material-symbols-outlined text-base">
                          location_on
                        </span>
                      </span>
                    )}
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600 whitespace-pre-line">
                    {savedAddress}
                  </p>
                </label>
              ) : null}

              <label
                className={`cursor-pointer rounded-3xl border p-5 transition hover:border-orange-300 hover:bg-orange-50 ${
                  selectedAddress === "custom"
                    ? "border-orange-500 bg-orange-50"
                    : "border-slate-200 bg-white"
                }`}
                onClick={handleUseCustomAddress}
              >
                <input
                  type="radio"
                  name="shippingAddress"
                  className="sr-only"
                  checked={selectedAddress === "custom"}
                  readOnly
                />
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-950">Thêm địa chỉ mới</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Nhập địa chỉ giao hàng mới và lưu lại để dùng lần sau.
                    </p>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-600 text-white shadow-sm">
                    <span className="material-symbols-outlined">add</span>
                  </span>
                </div>
                {selectedAddress === "custom" ? (
                  <div className="mt-5 space-y-4 rounded-3xl border border-orange-200 bg-orange-50 p-4">
                    <textarea
                      rows="4"
                      value={addressDraft}
                      onChange={(event) => setAddressDraft(event.target.value)}
                      placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành..."
                      className="w-full rounded-3xl border border-orange-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleSaveNewAddress}
                        disabled={!addressDraft.trim()}
                        className="rounded-3xl bg-orange-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Lưu địa chỉ
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (savedAddress) {
                            handleSelectSavedAddress();
                          } else {
                            setSelectedAddress("custom");
                            setShowAddressInput(true);
                          }
                        }}
                        className="rounded-3xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : null}
              </label>
            </div>
          </section>
        ) : isGuest ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center">
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Ghi chú cho khách:</span> Hãy đăng
              nhập để hoàn tất đơn hàng và lưu địa chỉ giao hàng.
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
                  <span className="font-medium text-emerald-600">Miễn phí</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Thuế ước tính</span>
                  <span className="font-medium text-slate-900">
                    {currencyFormatter.format(estimatedTax)}
                  </span>
                </div>
                <div className="h-px bg-slate-100 my-4" />
                <div className="flex items-center justify-between text-xl font-extrabold text-slate-950">
                  <span>Tổng cộng</span>
                  <span>{displayTotal}</span>
                </div>
              </div>

              <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-slate-900 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
                  Phương thức thanh toán
                </p>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { id: "cod", label: "COD" },
                    { id: "card", label: "Thẻ" },
                    { id: "bank", label: "Ngân hàng" },
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
                {submitting ? "Đang tạo đơn..." : "Tiến hành thanh toán"}
              </button>

              <p className="mt-4 text-center text-xs leading-relaxed text-slate-500">
                Bằng cách hoàn tất giao dịch, bạn đồng ý với{" "}
                <span className="underline">Điều khoản Dịch vụ</span> và{" "}
                <span className="underline">Chính sách Bảo mật</span> của chúng
                tôi.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
              <span className="material-symbols-outlined text-primary">
                verified_user
              </span>
              <span>Đã bao gồm Bảo vệ Người mua DTPShop</span>
            </div>
          </>
        ) : isGuest ? (
          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6 text-center">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Giỏ hàng tạm thời:</span> Các sản
              phẩm của bạn được lưu trữ tạm thời. Hãy đăng nhập để lưu vĩnh viễn
              và thanh toán.
            </p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
