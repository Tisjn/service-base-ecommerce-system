import { currencyFormatter } from "../../customer/orders/orderUtils";

export default function AdminProductCrudPage({
  products,
  categories,
  pagination,
  filterDraft,
  setFilterDraft,
  stats,
  isLoading,
  statusOptions,
  onApplyFilters,
  onResetFilters,
  onLoadProducts,
  onCreateCategory,
  onCreateProduct,
  onViewProduct,
  onEditProduct,
  onDeleteProduct,
  onRestoreProduct,
  onPermanentDeleteProduct,
  onEditCategory,
  onDeleteCategory,
}) {
  const page = Number(pagination.page || 0);
  const size = Number(pagination.size || 10);
  const totalPages = Number(pagination.totalPages || 1);
  const totalElements = Number(pagination.totalElements || 0);
  const start = totalElements === 0 ? 0 : page * size + 1;
  const end = Math.min(totalElements, page * size + products.length);

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-10">
      <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="mb-2 text-4xl font-extrabold tracking-tight text-[#191b23] [font-family:Manrope,system-ui,sans-serif]">
            Quản lý sản phẩm
          </h2>
          <p className="text-[#434655]">
            Theo dõi kho hàng, giá cả và hiển thị sản phẩm trên toàn hệ thống.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onCreateCategory}
            className="flex items-center gap-2 rounded-xl border border-[#c3c6d7]/30 bg-white px-5 py-3 font-semibold text-[#004ac6] shadow-sm transition hover:scale-105 active:scale-95"
          >
            <span className="material-symbols-outlined">category</span>
            <span>Thêm danh mục</span>
          </button>
          <button
            type="button"
            onClick={onCreateProduct}
            className="flex items-center gap-2 rounded-xl bg-[#ff4500] px-6 py-3 font-semibold text-white shadow-xl shadow-orange-500/10 transition hover:scale-105 hover:bg-[#e63e00] active:scale-95"
          >
            <span className="material-symbols-outlined">add</span>
            <span>Thêm sản phẩm mới</span>
          </button>
        </div>
      </div>

      <div className="mb-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tổng sản phẩm" value={stats.totalProducts} helper="+ đang quản lý" />
        <StatCard label="Sắp hết hàng" value={stats.outOfStock} helper="Cần nhập thêm" helperClass="text-[#9d4300]" />
        <StatCard label="Đang ẩn" value={stats.hidden} helper="Không hiển thị công khai" />
        <div className="rounded-xl border border-[#004ac6]/5 bg-[#ededf9] p-6 md:col-span-2 xl:col-span-1">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#434655]">
            Danh mục nổi bật
          </p>
          <span className="text-2xl font-extrabold [font-family:Manrope,system-ui,sans-serif]">
            {stats.topCategory}
          </span>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-[#c3c6d7]/10 bg-[#f3f3fe] p-2">
        <label className="relative min-w-64 flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#737686]">
            search
          </span>
          <input
            type="text"
            value={filterDraft.search}
            onChange={(event) =>
              setFilterDraft((prev) => ({ ...prev, search: event.target.value }))
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") onApplyFilters();
            }}
            placeholder="Tìm kiếm theo tên sản phẩm..."
            className="w-full rounded-lg border border-[#c3c6d7]/30 bg-white py-2 pl-10 pr-4 text-sm font-medium text-[#191b23] outline-none transition focus:border-[#004ac6] focus:ring-2 focus:ring-[#004ac6]/20"
          />
        </label>
        <CategoryFilterButton
          active={!filterDraft.categoryId}
          label="Tất cả sản phẩm"
          onClick={() => setFilterDraft((prev) => ({ ...prev, categoryId: "" }))}
        />
        {categories.slice(0, 4).map((category) => (
          <CategoryFilterButton
            key={category.id}
            active={String(filterDraft.categoryId) === String(category.id)}
            label={category.name}
            onClick={() =>
              setFilterDraft((prev) => ({
                ...prev,
                categoryId: String(category.id),
              }))
            }
          />
        ))}
        <div className="ml-auto flex flex-wrap items-center gap-2 pr-2">
          <span className="text-xs font-bold uppercase text-[#737686]">Lọc theo:</span>
          <select
            value={filterDraft.status}
            onChange={(event) =>
              setFilterDraft((prev) => ({ ...prev, status: event.target.value }))
            }
            className="rounded-lg border border-[#c3c6d7]/30 bg-white px-3 py-2 text-sm font-semibold text-[#191b23] focus:ring-2 focus:ring-[#004ac6]"
          >
            <option value="">Trạng thái kho</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button type="button" onClick={onApplyFilters} className="azure-button">
            Áp dụng
          </button>
          <button type="button" onClick={onResetFilters} className="azure-button-muted">
            Đặt lại
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#c3c6d7]/10 bg-[#f3f3fe] shadow-sm">
        <div className="max-h-[640px] overflow-auto">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#e7e7f3]">
                <TableHead>Tên sản phẩm</TableHead>
                <TableHead>Danh mục</TableHead>
                <TableHead>Giá</TableHead>
                <TableHead>Tồn kho</TableHead>
                <TableHead align="right">Thao tác</TableHead>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c3c6d7]/20">
              {isLoading ? (
                <EmptyRow text="Đang tải sản phẩm..." />
              ) : products.length === 0 ? (
                <EmptyRow text="Không có sản phẩm phù hợp." />
              ) : (
                products.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    onView={() => onViewProduct(product)}
                    onEdit={() => onEditProduct(product)}
                    onDelete={() => onDeleteProduct(product.id)}
                    onRestore={() => onRestoreProduct(product.id)}
                    onPermanentDelete={() =>
                      onPermanentDeleteProduct(product.id)
                    }
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-4 border-t border-[#c3c6d7]/20 bg-[#e1e2ed]/30 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-medium text-[#434655]">
            Hiển thị <span className="font-bold text-[#191b23]">{start} - {end}</span> trong số <span className="font-bold text-[#191b23]">{totalElements}</span> sản phẩm
          </p>
          <div className="flex items-center gap-4">
            <button type="button" disabled={isLoading || page <= 0} onClick={() => onLoadProducts(page - 1)} className="text-sm font-bold text-[#191b23] disabled:cursor-not-allowed disabled:opacity-40">
              Trước
            </button>
            <span className="rounded-lg bg-[#004ac6] px-3 py-2 text-xs font-bold text-white">
              {page + 1} / {totalPages}
            </span>
            <button type="button" disabled={isLoading || page + 1 >= totalPages} onClick={() => onLoadProducts(page + 1)} className="text-sm font-bold text-[#004ac6] disabled:cursor-not-allowed disabled:opacity-40">
              Tiếp
            </button>
          </div>
        </div>
      </div>

      <CategoryPanel
        categories={categories}
        onAdd={onCreateCategory}
        onEdit={onEditCategory}
        onDelete={onDeleteCategory}
      />
    </div>
  );
}

function StatCard({ label, value, helper, helperClass = "text-[#006242]" }) {
  return (
    <div className="rounded-xl border border-[#c3c6d7]/10 bg-white p-6">
      <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#434655]">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-extrabold [font-family:Manrope,system-ui,sans-serif]">{value}</span>
        <span className={`text-xs font-bold ${helperClass}`}>{helper}</span>
      </div>
    </div>
  );
}

function CategoryFilterButton({ active, label, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-lg px-4 py-2 text-sm transition-all ${active ? "bg-white font-bold text-[#004ac6] shadow-sm" : "font-medium text-[#434655] hover:bg-[#ededf9]"}`}>
      {label}
    </button>
  );
}

function TableHead({ children, align = "left" }) {
  return <th className={`px-6 py-5 text-xs font-bold uppercase tracking-widest text-[#434655] ${align === "right" ? "text-right" : "text-left"}`}>{children}</th>;
}

function EmptyRow({ text, colSpan = 5 }) {
  return <tr><td colSpan={colSpan} className="px-6 py-10 text-center text-sm text-[#737686]">{text}</td></tr>;
}

function ProductRow({
  product,
  onView,
  onEdit,
  onDelete,
  onRestore,
  onPermanentDelete,
}) {
  const stock = Number(product.stockQuantity || 0);
  const isHidden = product.status === "HIDDEN";
  return (
    <tr className="transition-colors duration-150 hover:bg-white">
      <td className="px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-[#ededf9]">
            {product.imageUrl ? <img alt={product.name} className="h-full w-full object-cover" src={product.imageUrl} /> : <span className="material-symbols-outlined text-[#737686]">inventory_2</span>}
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold text-[#191b23] [font-family:Manrope,system-ui,sans-serif]">{product.name}</p>
            <p className="text-xs text-[#434655]">ID: PRD-{product.id}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-5"><span className="rounded-full bg-[#004ac6]/10 px-3 py-1 text-[10px] font-bold uppercase text-[#004ac6]">{product.category?.name || "Chưa phân loại"}</span></td>
      <td className="px-6 py-5 font-semibold text-[#191b23]">{currencyFormatter.format(product.price || 0)}</td>
      <td className="px-6 py-5 text-sm font-bold text-[#434655]">{stock}</td>
      <td className="px-6 py-5">
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onView} className="rounded-lg p-2 text-[#004ac6] transition-colors hover:bg-[#004ac6]/5"><span className="material-symbols-outlined">visibility</span></button>
          <button type="button" onClick={onEdit} className="rounded-lg p-2 text-[#434655] transition-colors hover:bg-[#ededf9]"><span className="material-symbols-outlined">edit</span></button>
          {isHidden ? (
            <>
              <button type="button" title="Bỏ ẩn sản phẩm" onClick={onRestore} className="rounded-lg p-2 text-[#006242] transition-colors hover:bg-[#006242]/10"><span className="material-symbols-outlined">undo</span></button>
              <button type="button" title="Xóa vĩnh viễn" onClick={onPermanentDelete} className="rounded-lg p-2 text-[#ba1a1a] transition-colors hover:bg-[#ba1a1a]/10"><span className="material-symbols-outlined">delete_forever</span></button>
            </>
          ) : (
            <button type="button" onClick={onDelete} className="rounded-lg p-2 text-[#ba1a1a] transition-colors hover:bg-[#ba1a1a]/5"><span className="material-symbols-outlined">delete</span></button>
          )}
        </div>
      </td>
    </tr>
  );
}

function CategoryPanel({ categories, onAdd, onEdit, onDelete }) {
  return (
    <section className="mt-10 rounded-2xl border border-[#c3c6d7]/10 bg-white p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-extrabold text-[#191b23]">Danh mục</h3>
          <p className="text-sm text-[#434655]">Quản lý nhóm sản phẩm.</p>
        </div>
        <button type="button" onClick={onAdd} className="azure-button">Thêm danh mục</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <div key={category.id} className="rounded-xl border border-[#c3c6d7]/20 bg-[#f3f3fe] p-4">
            <p className="font-bold text-[#191b23]">{category.name}</p>
            <p className="mt-1 text-xs text-[#737686]">{category.slug || `CAT-${category.id}`}</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => onEdit(category)} className="azure-button-muted">Sửa</button>
              <button type="button" onClick={() => onDelete(category.id)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-600">Xóa</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
