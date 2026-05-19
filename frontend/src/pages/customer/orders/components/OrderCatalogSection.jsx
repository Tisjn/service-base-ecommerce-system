import { useEffect, useMemo, useState } from "react";
import orderApi from "../../../../api/orderApi";
import { currencyFormatter } from "../orderUtils";

const MAX_CATALOG_PRICE = 100000000;
const MIN_CATALOG_PRICE = 500;

function getProductRating(product, ratingStats) {
  const average = Number(
    ratingStats?.averageRating ??
      product?.averageRating ??
      product?.ratingAverage ??
      product?.averageStar ??
      product?.rating ??
      0,
  );
  const count = Number(
    ratingStats?.totalComments ??
      product?.totalComments ??
      product?.ratingCount ??
      product?.reviewCount ??
      product?.totalReviews ??
      0,
  );

  return {
    average: Number.isFinite(average) ? average : 0,
    count: Number.isFinite(count) ? count : 0,
  };
}

function ProductRating({ product, ratingStats }) {
  const { average, count } = getProductRating(product, ratingStats);
  const rounded = Math.round(average);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center text-amber-400">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className="material-symbols-outlined text-[18px]"
            style={{
              fontVariationSettings: `'FILL' ${star <= rounded ? 1 : 0}`,
            }}
          >
            star
          </span>
        ))}
      </div>
      <span className="text-sm font-extrabold text-slate-950">
        {average > 0 ? average.toFixed(1) : "0.0"}
      </span>
      <span className="text-xs font-semibold text-slate-400">
        ({count} đánh giá)
      </span>
    </div>
  );
}

export default function OrderCatalogSection({
  products,
  categories,
  catalogLoading,
  search,
  setSearch,
  categoryId,
  setCategoryId,
  catalogMeta,
  setCatalogPage,
  maxPrice,
  setMaxPrice,
  sortBy,
  sortDirection,
  onToggleSort,
  updatingProductId,
  onAddToCart,
  onViewProduct,
}) {
  const [showFilters, setShowFilters] = useState(false);
  const [ratingStatsByProductId, setRatingStatsByProductId] = useState({});
  const productIds = useMemo(
    () =>
      products
        .map((product) => product?.id)
        .filter((id) => id !== undefined && id !== null),
    [products],
  );
  const sortLabel =
    sortBy === "createdAt"
      ? "Mới nhất"
      : sortBy === "price" && sortDirection === "asc"
        ? "Giá tăng dần"
        : "Giá giảm dần";

  function handleMaxPriceInput(value) {
    const normalized = Number(String(value).replace(/[^\d]/g, ""));
    setMaxPrice(Number.isFinite(normalized) ? normalized : 0);
  }

  useEffect(() => {
    if (!productIds.length) {
      setRatingStatsByProductId({});
      return undefined;
    }

    let cancelled = false;

    async function loadRatingStats() {
      const results = await Promise.allSettled(
        productIds.map((productId) =>
          orderApi.getProductDetailWithComments(productId),
        ),
      );

      if (cancelled) return;

      const nextStats = {};
      results.forEach((result, index) => {
        if (result.status !== "fulfilled") return;

        const detail = result.value || {};
        const comments = Array.isArray(detail.comments) ? detail.comments : [];
        const totalComments = Number(detail.totalComments ?? comments.length);
        const averageRating = Number(
          detail.averageRating ??
            (comments.length
              ? comments.reduce(
                  (sum, comment) => sum + (Number(comment.rating) || 0),
                  0,
                ) / comments.length
              : 0),
        );

        nextStats[productIds[index]] = {
          averageRating: Number.isFinite(averageRating) ? averageRating : 0,
          totalComments: Number.isFinite(totalComments) ? totalComments : 0,
        };
      });

      setRatingStatsByProductId(nextStats);
    }

    loadRatingStats();

    return () => {
      cancelled = true;
    };
  }, [productIds]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-orange-600/90 font-semibold">
            Danh mục sản phẩm
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-950">
            Khám phá bộ sưu tập tinh tế
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Khám phá {catalogMeta.totalElements || 0} vật phẩm độc quyền được
            tuyển chọn cho phong cách hiện đại.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside
          className={`space-y-6 rounded-4xl border border-slate-200 bg-slate-50 p-6 shadow-sm ${
            showFilters ? "block" : "hidden lg:block"
          }`}
        >
          <div className="flex items-center justify-between gap-4 lg:hidden">
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
              Lọc sản phẩm
            </h2>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              onClick={() => setShowFilters(false)}
            >
              Đóng
            </button>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
              Danh mục
            </h2>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setCatalogPage(0);
                  setCategoryId("");
                }}
                className={`w-full rounded-3xl px-4 py-3 text-left text-sm font-semibold transition ${
                  categoryId === ""
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                Tất cả bộ sưu tập
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setCatalogPage(0);
                    setCategoryId(String(category.id));
                  }}
                  className={`w-full rounded-3xl px-4 py-3 text-left text-sm font-semibold transition ${
                    categoryId === String(category.id)
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
              Khoảng giá
            </h2>
            <div className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3 text-sm font-semibold text-slate-700">
                <span>Giá tối đa</span>
                <span>
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(maxPrice)}
                </span>
              </div>
              <input
                type="number"
                min="0"
                step="500"
                value={maxPrice}
                onChange={(event) => handleMaxPriceInput(event.target.value)}
                className="mb-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                placeholder="Nhập giá tối đa"
              />
              <input
                type="range"
                min={MIN_CATALOG_PRICE}
                max={MAX_CATALOG_PRICE}
                step="500"
                value={Math.min(
                  Math.max(maxPrice, MIN_CATALOG_PRICE),
                  MAX_CATALOG_PRICE,
                )}
                onChange={(event) => setMaxPrice(Number(event.target.value))}
                className="w-full accent-orange-600"
              />
              <div className="mt-4 flex justify-between text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                <span>500 VND</span>
                <span>100.000.000 VND+</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-slate-950 p-5 text-white shadow-[0_20px_60px_-20px_rgba(15,23,42,0.3)]">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-300">
              Cần hỗ trợ?
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-200">
              Các chuyên gia của chúng tôi luôn sẵn sàng 24/7 để đưa ra gợi ý
              phù hợp nhất.
            </p>
            <button className="mt-6 inline-flex items-center gap-2 rounded-3xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
              Trò chuyện với Quản gia
              <span className="material-symbols-outlined text-base">
                arrow_forward
              </span>
            </button>
          </div>
        </aside>

        <main className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium text-slate-500">
                Tìm kiếm sản phẩm
              </label>
              <input
                type="text"
                value={search}
                onChange={(event) => {
                  setCatalogPage(0);
                  setSearch(event.target.value);
                }}
                placeholder="Tìm kiếm bộ sưu tập..."
                className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 lg:hidden"
                onClick={() => setShowFilters((prev) => !prev)}
              >
                <span className="material-symbols-outlined text-base">
                  tune
                </span>
                Bộ lọc
              </button>
              <button
                type="button"
                onClick={onToggleSort}
                className="inline-flex items-center gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Sắp xếp: {sortLabel}
                <span className="material-symbols-outlined text-base">
                  expand_more
                </span>
              </button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {catalogLoading ? (
              <div className="md:col-span-2 xl:col-span-3 rounded-4xl border border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
                Đang tải sản phẩm...
              </div>
            ) : products.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3 rounded-4xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
                Không tìm thấy sản phẩm phù hợp.
              </div>
            ) : (
              products.map((product) => (
                <article
                  key={product.id}
                  className="group flex min-h-full flex-col overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-[0_18px_48px_-34px_rgba(15,23,42,0.55)] transition duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_26px_70px_-34px_rgba(249,115,22,0.45)]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-50 to-slate-100 text-sm font-semibold text-slate-400">
                        Không có ảnh
                      </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                    <button
                      type="button"
                      className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-[0_14px_34px_-18px_rgba(15,23,42,0.75)] ring-1 ring-slate-950/5 transition hover:scale-105 hover:text-orange-600"
                      aria-label="Yeu thich san pham"
                    >
                      <span className="material-symbols-outlined text-2xl">
                        favorite
                      </span>
                    </button>

                    <div className="absolute left-4 top-4 max-w-[70%] rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-extrabold text-slate-800 shadow-[0_14px_34px_-22px_rgba(15,23,42,0.65)] ring-1 ring-slate-950/5">
                      {product.category?.name || "Chưa phân loại"}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <div className="space-y-2.5">
                      <h3 className="line-clamp-2 min-h-14 text-2xl font-black leading-tight tracking-tight text-slate-950">
                        {product.name}
                      </h3>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <ProductRating
                          product={product}
                          ratingStats={ratingStatsByProductId[product.id]}
                        />
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                          <span className="material-symbols-outlined text-sm">
                            inventory_2
                          </span>
                          Còn {product.stockQuantity || 0}
                        </span>
                      </div>
                      <p className="line-clamp-2 min-h-10 text-sm leading-5 text-slate-600">
                        {product.description ||
                          "Chưa có mô tả cho sản phẩm này."}
                      </p>
                    </div>

                    <div className="mt-5">
                      <div>
                        <p className="text-xs text-slate-500">Giá</p>
                        <p className="mt-1 text-3xl font-black tracking-tight text-slate-950">
                          {currencyFormatter.format(product.price || 0)}
                        </p>
                      </div>
                      <div className="hidden">
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-slate-500">
                          Tồn kho
                        </p>
                        <p className="mt-2 text-2xl font-black text-slate-950">
                          {product.stockQuantity}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onViewProduct(product)}
                      className="mt-auto flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                    >
                      Xem chi tiết
                    </button>

                    <button
                      type="button"
                      disabled={updatingProductId === product.id}
                      onClick={() => onAddToCart(product)}
                      className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-full bg-orange-600 px-5 py-3 text-xs font-black uppercase tracking-[0.09em] text-white shadow-[0_18px_45px_-24px_rgba(234,88,12,0.9)] transition hover:-translate-y-0.5 hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="material-symbols-outlined text-lg">
                        add_shopping_cart
                      </span>
                      {updatingProductId === product.id
                        ? "Đang thêm..."
                        : "Thêm vào giỏ"}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="flex flex-col gap-4 rounded-4xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Trang {catalogMeta.page + 1} / {catalogMeta.totalPages}
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={catalogMeta.page <= 0}
                onClick={() => setCatalogPage((prev) => Math.max(prev - 1, 0))}
                className="rounded-3xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={catalogMeta.page + 1 >= catalogMeta.totalPages}
                onClick={() =>
                  setCatalogPage((prev) =>
                    Math.min(prev + 1, catalogMeta.totalPages - 1),
                  )
                }
                className="rounded-3xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Tiếp
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
