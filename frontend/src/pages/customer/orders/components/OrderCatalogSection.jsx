import { useState } from "react";
import { currencyFormatter } from "../orderUtils";

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
  const sortLabel =
    sortBy === "createdAt"
      ? "Mới nhất"
      : sortBy === "price" && sortDirection === "asc"
        ? "Giá tăng dần"
        : "Giá giảm dần";

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
                type="range"
                min="500"
                max="50000"
                step="500"
                value={maxPrice}
                onChange={(event) => setMaxPrice(Number(event.target.value))}
                className="w-full accent-orange-600"
              />
              <div className="mt-4 flex justify-between text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                <span>$500</span>
                <span>$50.000+</span>
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

          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
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
                  className="group flex flex-col overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-2xl"
                >
                  <div className="relative aspect-4/5 overflow-hidden bg-slate-100">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400">
                        Không có ảnh
                      </div>
                    )}

                    <button className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-lg transition hover:text-orange-600">
                      <span className="material-symbols-outlined">
                        favorite
                      </span>
                    </button>

                    <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow">
                      {product.category?.name || "Chưa phân loại"}
                    </div>
                  </div>

                  <div className="space-y-4 p-6">
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.35em] text-orange-600/90 font-semibold">
                        Sản phẩm nổi bật
                      </p>
                      <h3 className="text-2xl font-bold text-slate-950">
                        {product.name}
                      </h3>
                      <p className="line-clamp-3 text-sm leading-6 text-slate-600">
                        {product.description ||
                          "Chưa có mô tả cho sản phẩm này."}
                      </p>
                    </div>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-xs text-slate-500">Giá</p>
                        <p className="mt-2 text-3xl font-black text-slate-950">
                          {currencyFormatter.format(product.price || 0)}
                        </p>
                      </div>
                      <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700 shadow-sm">
                        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
                          Tồn kho
                        </p>
                        <p className="mt-2 text-lg font-bold text-slate-950">
                          {product.stockQuantity}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onViewProduct(product)}
                      className="flex w-full items-center justify-center rounded-3xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-700 transition hover:bg-slate-100"
                    >
                      Xem chi tiết
                    </button>

                    <button
                      type="button"
                      disabled={updatingProductId === product.id}
                      onClick={() => onAddToCart(product)}
                      className="flex w-full items-center justify-center rounded-3xl bg-orange-600 px-6 py-3 text-sm font-bold uppercase tracking-[0.08em] text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
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
