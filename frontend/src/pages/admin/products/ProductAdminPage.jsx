import { useCallback, useEffect, useMemo, useState } from "react";
import AdminDevelopmentPage from "../AdminDevelopmentPage";
import { ADMIN_SECTIONS } from "../adminSections";
import AdminSupportPage from "../support/AdminSupportPage";
import ProductImageUpload from "../../../components/ProductImageUpload";
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  getCategories,
  getProducts,
  updateCategory,
  updateProduct,
} from "../../../api/productApi";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const initialFormState = {
  name: "",
  description: "",
  price: "",
  stockQuantity: "",
  categoryId: "",
  status: "ACTIVE",
  imageUrl: "",
};

const initialCategoryFormState = {
  name: "",
  slug: "",
};

const statusOptions = [
  { value: "ACTIVE", label: "Đang bán" },
  { value: "HIDDEN", label: "Đang ẩn" },
];

export default function ProductAdminPage({ user, onLogout, onNavigate }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({
    page: 0,
    size: 20,
    totalPages: 1,
    totalElements: 0,
  });
  const [filter, setFilter] = useState({ search: "", status: "", categoryId: "" });
  const [filterDraft, setFilterDraft] = useState(filter);
  const [form, setForm] = useState(initialFormState);
  const [categoryForm, setCategoryForm] = useState(initialCategoryFormState);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCategorySaving, setIsCategorySaving] = useState(false);
  const [notification, setNotification] = useState(null);
  const [activeAdminSection, setActiveAdminSection] = useState("products");

  const stats = useMemo(() => {
    const outOfStock = products.filter(
      (product) => Number(product.stockQuantity || 0) <= 0,
    ).length;
    const hidden = products.filter((product) => product.status === "HIDDEN").length;
    const topCategory = categories[0]?.name || "Chưa có dữ liệu";

    return {
      totalProducts: pagination.totalElements,
      outOfStock,
      hidden,
      topCategory,
    };
  }, [categories, pagination.totalElements, products]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await getCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      showNotification("error", error.message || "Không tải được danh mục.");
    }
  }, []);

  const loadProducts = useCallback(
    async (page = 0) => {
      setIsLoading(true);
      try {
        const response = await getProducts({
          page,
          size: pagination.size,
          search: filter.search,
          status: filter.status || undefined,
          categoryId: filter.categoryId || undefined,
          sortBy: "createdAt",
          direction: "desc",
        });

        setProducts(response.content || []);
        setPagination((prev) => ({
          ...prev,
          page: response.number || page,
          totalPages: response.totalPages || 1,
          totalElements: response.totalElements || 0,
        }));
      } catch (error) {
        showNotification("error", error.message || "Không tải được sản phẩm.");
      } finally {
        setIsLoading(false);
      }
    },
    [filter.categoryId, filter.search, filter.status, pagination.size],
  );

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadProducts(0);
  }, [loadProducts]);

  useEffect(() => {
    if (!notification) return undefined;
    const timer = window.setTimeout(() => setNotification(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notification]);

  useEffect(() => {
    if (!showProductForm && !showCategoryForm) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeProductForm();
        closeCategoryForm();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showCategoryForm, showProductForm]);

  function showNotification(type, text) {
    setNotification({ type, text });
  }

  function applyFilters() {
    setFilter(filterDraft);
    setPagination((prev) => ({ ...prev, page: 0 }));
  }

  function resetFilters() {
    const resetState = { search: "", status: "", categoryId: "" };
    setFilter(resetState);
    setFilterDraft(resetState);
    setPagination((prev) => ({ ...prev, page: 0 }));
  }

  function openCreateProductForm() {
    setSelectedProduct(null);
    setForm(initialFormState);
    setShowProductForm(true);
  }

  function openEditProductForm(product) {
    setSelectedProduct(product);
    setForm({
      name: product.name || "",
      description: product.description || "",
      price: product.price?.toString() || "",
      stockQuantity: product.stockQuantity?.toString() || "",
      categoryId: product.category?.id?.toString() || "",
      status: product.status || "ACTIVE",
      imageUrl: product.imageUrl || "",
    });
    setShowProductForm(true);
  }

  function closeProductForm() {
    setShowProductForm(false);
    setSelectedProduct(null);
    setForm(initialFormState);
  }

  function openCreateCategoryForm() {
    setSelectedCategory(null);
    setCategoryForm(initialCategoryFormState);
    setShowCategoryForm(true);
  }

  function openEditCategoryForm(category) {
    setSelectedCategory(category);
    setCategoryForm({
      name: category.name || "",
      slug: category.slug || "",
    });
    setShowCategoryForm(true);
  }

  function closeCategoryForm() {
    setShowCategoryForm(false);
    setSelectedCategory(null);
    setCategoryForm(initialCategoryFormState);
  }

  function slugifyCategoryName(name) {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-+/g, "-");
  }

  async function handleSubmitProduct(event) {
    event.preventDefault();

    if (!form.name.trim() || !form.price || !form.stockQuantity) {
      showNotification("error", "Vui lòng nhập tên, giá và tồn kho.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      stockQuantity: Number(form.stockQuantity),
      categoryId: form.categoryId ? Number(form.categoryId) : undefined,
      status: form.status,
      imageUrl: form.imageUrl || undefined,
    };

    setIsSaving(true);
    try {
      if (selectedProduct?.id) {
        await updateProduct(selectedProduct.id, payload);
        showNotification("success", "Đã cập nhật sản phẩm.");
        await loadProducts(pagination.page);
      } else {
        await createProduct(payload);
        showNotification("success", "Đã thêm sản phẩm mới.");
        await loadProducts(0);
      }
      closeProductForm();
    } catch (error) {
      showNotification("error", error.message || "Không lưu được sản phẩm.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteProduct(productId) {
    if (!window.confirm("Ẩn sản phẩm này khỏi danh sách bán hàng?")) return;

    try {
      await deleteProduct(productId);
      showNotification("success", "Đã ẩn sản phẩm.");
      await loadProducts(pagination.page);
    } catch (error) {
      showNotification("error", error.message || "Không ẩn được sản phẩm.");
    }
  }

  async function handleSubmitCategory(event) {
    event.preventDefault();

    if (!categoryForm.name.trim()) {
      showNotification("error", "Vui lòng nhập tên danh mục.");
      return;
    }

    const payload = {
      name: categoryForm.name.trim(),
      slug: (categoryForm.slug || slugifyCategoryName(categoryForm.name)).trim(),
    };

    setIsCategorySaving(true);
    try {
      if (selectedCategory?.id) {
        await updateCategory(selectedCategory.id, payload);
        showNotification("success", "Đã cập nhật danh mục.");
      } else {
        await createCategory(payload);
        showNotification("success", "Đã thêm danh mục.");
      }
      await loadCategories();
      closeCategoryForm();
    } catch (error) {
      showNotification("error", error.message || "Không lưu được danh mục.");
    } finally {
      setIsCategorySaving(false);
    }
  }

  async function handleDeleteCategory(categoryId) {
    if (!window.confirm("Xóa danh mục này? Backend có thể từ chối nếu đang được dùng.")) {
      return;
    }

    try {
      await deleteCategory(categoryId);
      showNotification("success", "Đã xóa danh mục.");
      await loadCategories();
    } catch (error) {
      showNotification("error", error.message || "Không xóa được danh mục.");
    }
  }

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#191b23] [font-family:Inter,system-ui,sans-serif]">
      <AdminSidebar2
        activeSection={activeAdminSection}
        onSectionChange={setActiveAdminSection}
        onNavigate={onNavigate}
      />

      <main className="min-h-screen lg:ml-64">
        <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-[#c3c6d7]/20 bg-[#f3f3fe] px-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-8">
            <span className="hidden text-xl font-bold tracking-tight text-[#191b23] [font-family:Manrope,system-ui,sans-serif] sm:block">
              DTPShop
            </span>
            <div className="relative w-full max-w-96">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#737686] opacity-60">
                search
              </span>
              <input
                className="w-full rounded-lg border-none bg-[#e1e2ed] py-2 pl-10 pr-4 text-sm text-[#191b23] transition focus:bg-white focus:ring-2 focus:ring-[#004ac6]"
                placeholder="Tìm kiếm sản phẩm..."
                value={filterDraft.search}
                onChange={(event) =>
                  setFilterDraft((prev) => ({ ...prev, search: event.target.value }))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") applyFilters();
                }}
                type="text"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <IconButton icon="notifications" />
            <IconButton icon="settings" />
            <div className="hidden h-8 w-px bg-[#c3c6d7]/50 sm:block" />
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-3 active:opacity-80"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#004ac6] text-xs font-extrabold text-white">
                {(user?.fullName || user?.email || "A").slice(0, 1).toUpperCase()}
              </div>
              <span className="hidden font-semibold text-sm text-blue-600 sm:block">
                Đăng xuất
              </span>
            </button>
          </div>
        </header>

        {activeAdminSection === "products" ? (
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-10">
          <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="mb-2 text-4xl font-extrabold tracking-tight text-[#191b23] [font-family:Manrope,system-ui,sans-serif]">
                Quản lý Sản phẩm
              </h2>
              <p className="text-[#434655]">
                Theo dõi kho hàng, giá cả và hiển thị sản phẩm trên toàn hệ thống.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={openCreateCategoryForm}
                className="flex items-center gap-2 rounded-xl border border-[#c3c6d7]/30 bg-white px-5 py-3 font-semibold text-[#004ac6] shadow-sm transition hover:scale-105 active:scale-95"
              >
                <span className="material-symbols-outlined">category</span>
                <span>Thêm danh mục</span>
              </button>
              <button
                type="button"
                onClick={openCreateProductForm}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#9d4300] to-[#fd761a] px-6 py-3 font-semibold text-white shadow-xl shadow-orange-500/10 transition hover:scale-105 active:scale-95"
              >
                <span className="material-symbols-outlined">add</span>
                <span>Thêm sản phẩm mới</span>
              </button>
            </div>
          </div>

          <div className="mb-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Tổng sản phẩm" value={stats.totalProducts} helper="+ đang quản lý" />
            <StatCard
              label="Sắp hết hàng"
              value={stats.outOfStock}
              helper="Cần nhập thêm"
              helperClass="text-[#9d4300]"
            />
            <StatCard label="Đang ẩn" value={stats.hidden} helper="Không hiển thị công khai" />
            <div className="rounded-xl border border-[#004ac6]/5 bg-[#ededf9] p-6 md:col-span-2 xl:col-span-1">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#434655]">
                    Danh mục nổi bật
                  </p>
                  <span className="text-2xl font-extrabold [font-family:Manrope,system-ui,sans-serif]">
                    {stats.topCategory}
                  </span>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#004ac6]/10 text-[#004ac6]">
                  <span className="material-symbols-outlined">trending_up</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-[#c3c6d7]/10 bg-[#f3f3fe] p-2">
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
              <span className="text-xs font-bold uppercase text-[#737686]">
                Lọc theo:
              </span>
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
              <button type="button" onClick={applyFilters} className="azure-button">
                Áp dụng
              </button>
              <button type="button" onClick={resetFilters} className="azure-button-muted">
                Đặt lại
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#c3c6d7]/10 bg-[#f3f3fe] shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
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
                        onEdit={() => openEditProductForm(product)}
                        onDelete={() => handleDeleteProduct(product.id)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-4 border-t border-[#c3c6d7]/20 bg-[#e1e2ed]/30 px-6 py-6 md:flex-row md:items-center md:justify-between">
              <p className="text-sm font-medium text-[#434655]">
                Hiển thị{" "}
                <span className="font-bold text-[#191b23]">
                  {products.length ? pagination.page * pagination.size + 1 : 0} -{" "}
                  {pagination.page * pagination.size + products.length}
                </span>{" "}
                trong số{" "}
                <span className="font-bold text-[#191b23]">
                  {pagination.totalElements}
                </span>{" "}
                sản phẩm
              </p>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  disabled={pagination.page <= 0}
                  onClick={() => loadProducts(pagination.page - 1)}
                  className="flex items-center gap-1 text-sm font-bold text-[#191b23] transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-lg">
                    chevron_left
                  </span>
                  Trước
                </button>
                <div className="flex items-center gap-1">
                  <button className="h-8 w-8 rounded-lg bg-[#004ac6] text-xs font-bold text-white">
                    {pagination.page + 1}
                  </button>
                  <span className="px-1 text-[#434655]">/</span>
                  <span className="px-2 text-xs font-bold text-[#434655]">
                    {pagination.totalPages}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={pagination.page + 1 >= pagination.totalPages}
                  onClick={() => loadProducts(pagination.page + 1)}
                  className="flex items-center gap-1 text-sm font-bold text-[#004ac6] transition hover:translate-x-1 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-x-0"
                >
                  Tiếp
                  <span className="material-symbols-outlined text-lg">
                    chevron_right
                  </span>
                </button>
              </div>
            </div>
          </div>

          <CategoryPanel
            categories={categories}
            onAdd={openCreateCategoryForm}
            onEdit={openEditCategoryForm}
            onDelete={handleDeleteCategory}
          />
        </div>
        ) : activeAdminSection === "support" ? (
          <AdminSupportPage user={user} />
        ) : (
          <AdminDevelopmentPage section={ADMIN_SECTIONS[activeAdminSection]} />
        )}
      </main>

      <button
        type="button"
        className="fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/80 text-[#004ac6] shadow-2xl backdrop-blur-xl transition hover:scale-110 active:scale-95"
      >
        <span className="material-symbols-outlined text-2xl transition group-hover:rotate-12">
          chat_bubble
        </span>
      </button>

      {notification && (
        <Toast notification={notification} onClose={() => setNotification(null)} />
      )}

      {showProductForm && (
        <ProductModal
          form={form}
          setForm={setForm}
          categories={categories}
          selectedProduct={selectedProduct}
          isSaving={isSaving}
          onClose={closeProductForm}
          onSubmit={handleSubmitProduct}
        />
      )}

      {showCategoryForm && (
        <CategoryModal
          categoryForm={categoryForm}
          setCategoryForm={setCategoryForm}
          selectedCategory={selectedCategory}
          isCategorySaving={isCategorySaving}
          onClose={closeCategoryForm}
          onSubmit={handleSubmitCategory}
          slugifyCategoryName={slugifyCategoryName}
        />
      )}
    </div>
  );
}

function AdminSidebar2({ activeSection, onSectionChange }) {
  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-64 flex-col bg-[#f3f3fe] px-4 py-6 lg:flex">
      <div className="mb-10 px-4">
        <h1 className="text-lg font-extrabold text-blue-700 [font-family:Manrope,system-ui,sans-serif]">
          DTPShop Admin
        </h1>
        <p className="text-xs font-medium text-[#191b23]/60">
          Quản lý cửa hàng của bạn
        </p>
      </div>
      <nav className="flex-1 space-y-2">
        <SideNavItem
          icon="dashboard"
          label="Bảng điều khiển"
          active={activeSection === "dashboard"}
          onClick={() => onSectionChange("dashboard")}
        />
        <SideNavItem
          icon="inventory_2"
          label="Sản phẩm"
          active={activeSection === "products"}
          filled={activeSection === "products"}
          onClick={() => onSectionChange("products")}
        />
        <SideNavItem
          icon="shopping_cart"
          label="Đơn hàng"
          active={activeSection === "orders"}
          onClick={() => onSectionChange("orders")}
        />
        <SideNavItem
          icon="group"
          label="Khách hàng"
          active={activeSection === "customers"}
          onClick={() => onSectionChange("customers")}
        />
        <SideNavItem
          icon="analytics"
          label="Phân tích"
          active={activeSection === "analytics"}
          onClick={() => onSectionChange("analytics")}
        />
      </nav>
      <div className="mt-auto space-y-2 pt-6">
        <SideNavItem
          icon="help"
          label="Hỗ trợ"
          active={activeSection === "support"}
          onClick={() => onSectionChange("support")}
        />
        <SideNavItem
          icon="settings"
          label="Cài đặt"
          active={activeSection === "settings"}
          onClick={() => onSectionChange("settings")}
        />
      </div>
    </aside>
  );
}

function AdminSidebar({ activeSection, onSectionChange }) {
  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-64 flex-col bg-[#f3f3fe] px-4 py-6 lg:flex">
      <div className="mb-10 px-4">
        <h1 className="text-lg font-extrabold text-blue-700 [font-family:Manrope,system-ui,sans-serif]">
          Trang Quản Trị
        </h1>
        <p className="text-xs font-medium text-[#191b23]/60">
          Quản lý cửa hàng của bạn
        </p>
      </div>
      <nav className="flex-1 space-y-2">
        <SideNavItem icon="dashboard" label="Bảng điều khiển" />
        <SideNavItem icon="inventory_2" label="Sản phẩm" active filled />
        <SideNavItem
          icon="shopping_cart"
          label="Đơn hàng"
          onClick={() => onNavigate?.("orders")}
        />
        <SideNavItem
          icon="group"
          label="Khách hàng"
          onClick={() => onNavigate?.("account")}
        />
        <SideNavItem icon="analytics" label="Phân tích" />
      </nav>
      <div className="mt-auto space-y-2 pt-6">
        <SideNavItem icon="help" label="Hỗ trợ" />
        <SideNavItem icon="settings" label="Cài đặt" />
      </div>
    </aside>
  );
}

function SideNavItem({ icon, label, active = false, filled = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition-all duration-150 ${
        active
          ? "bg-[#e1e2ed] font-bold text-blue-700"
          : "font-medium text-[#191b23] hover:bg-[#ededf9]"
      }`}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0" }}
      >
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

function IconButton({ icon }) {
  return (
    <button
      type="button"
      className="material-symbols-outlined rounded-full p-2 text-[#434655] transition-colors hover:bg-[#ededf9]"
    >
      {icon}
    </button>
  );
}

function StatCard({ label, value, helper, helperClass = "text-[#006242]" }) {
  return (
    <div className="rounded-xl border border-[#c3c6d7]/10 bg-white p-6">
      <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#434655]">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-extrabold [font-family:Manrope,system-ui,sans-serif]">
          {value}
        </span>
        <span className={`text-xs font-bold ${helperClass}`}>{helper}</span>
      </div>
    </div>
  );
}

function CategoryFilterButton({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm transition-all ${
        active
          ? "bg-white font-bold text-[#004ac6] shadow-sm"
          : "font-medium text-[#434655] hover:bg-[#ededf9]"
      }`}
    >
      {label}
    </button>
  );
}

function TableHead({ children, align = "left" }) {
  return (
    <th
      className={`px-6 py-5 text-xs font-bold uppercase tracking-widest text-[#434655] ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function ProductRow({ product, onEdit, onDelete }) {
  const stock = Number(product.stockQuantity || 0);
  const stockPercent = Math.max(0, Math.min(100, stock));
  const lowStock = stock > 0 && stock <= 12;
  const outOfStock = stock <= 0;

  return (
    <tr className="transition-colors duration-150 hover:bg-white">
      <td className="px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-[#ededf9]">
            {product.imageUrl ? (
              <img
                alt={product.name}
                className="h-full w-full object-cover"
                src={product.imageUrl}
              />
            ) : (
              <span className="material-symbols-outlined text-[#737686]">
                inventory_2
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold text-[#191b23] [font-family:Manrope,system-ui,sans-serif]">
              {product.name}
            </p>
            <p className="text-xs text-[#434655]">ID: PRD-{product.id}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-5">
        <span className="rounded-full bg-[#004ac6]/10 px-3 py-1 text-[10px] font-bold uppercase text-[#004ac6]">
          {product.category?.name || "Chưa phân loại"}
        </span>
      </td>
      <td className="px-6 py-5 font-semibold text-[#191b23] [font-family:Manrope,system-ui,sans-serif]">
        {currencyFormatter.format(product.price || 0)}
      </td>
      <td className="px-6 py-5">
        <div className="flex flex-col gap-1">
          <span
            className={`text-sm font-semibold ${
              outOfStock
                ? "w-fit rounded border border-[#ba1a1a]/10 bg-[#ba1a1a]/5 px-2 py-0.5 font-bold uppercase tracking-tight text-[#ba1a1a]"
                : lowStock
                  ? "text-[#9d4300]"
                  : "text-[#006242]"
            }`}
          >
            {outOfStock
              ? "Hết hàng"
              : lowStock
                ? `Sắp hết (${stock})`
                : `Còn ${stock} sản phẩm`}
          </span>
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#e1e2ed]">
            <div
              className={`h-full ${
                outOfStock ? "bg-[#ba1a1a]" : lowStock ? "bg-[#fd761a]" : "bg-[#007d55]"
              }`}
              style={{ width: `${stockPercent}%` }}
            />
          </div>
        </div>
      </td>
      <td className="px-6 py-5 text-right">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg p-2 text-[#004ac6] transition-colors hover:bg-[#004ac6]/5"
          >
            <span className="material-symbols-outlined">edit</span>
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg p-2 text-[#ba1a1a] transition-colors hover:bg-[#ba1a1a]/5"
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      </td>
    </tr>
  );
}

function EmptyRow({ text }) {
  return (
    <tr>
      <td colSpan="5" className="px-6 py-12 text-center text-sm text-[#434655]">
        {text}
      </td>
    </tr>
  );
}

function CategoryPanel({ categories, onAdd, onEdit, onDelete }) {
  return (
    <section className="mt-6 rounded-2xl border border-[#c3c6d7]/10 bg-white p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#434655]">
            Quản lý danh mục
          </p>
          <h3 className="mt-1 text-xl font-extrabold [font-family:Manrope,system-ui,sans-serif]">
            Danh mục sản phẩm
          </h3>
        </div>
        <button type="button" onClick={onAdd} className="azure-button">
          Thêm danh mục
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-[#c3c6d7]/20 bg-[#faf8ff] p-4"
          >
            <div className="min-w-0">
              <p className="truncate font-bold text-[#191b23]">{category.name}</p>
              <p className="truncate text-xs text-[#434655]">
                {category.slug || "no-slug"}
              </p>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => onEdit(category)}
                className="rounded-lg p-2 text-[#004ac6] hover:bg-[#004ac6]/5"
              >
                <span className="material-symbols-outlined text-lg">edit</span>
              </button>
              <button
                type="button"
                onClick={() => onDelete(category.id)}
                className="rounded-lg p-2 text-[#ba1a1a] hover:bg-[#ba1a1a]/5"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProductModal({
  form,
  setForm,
  categories,
  selectedProduct,
  isSaving,
  onClose,
  onSubmit,
}) {
  return (
    <Modal onClose={onClose} maxWidth="max-w-6xl">
      <div className="border-b border-[#c3c6d7]/20 bg-[#f3f3fe] px-6 py-5">
        <p className="text-xs font-bold uppercase tracking-widest text-[#004ac6]">
          {selectedProduct ? "Chỉnh sửa sản phẩm" : "Sản phẩm mới"}
        </p>
        <h3 className="mt-2 text-2xl font-extrabold text-[#191b23] [font-family:Manrope,system-ui,sans-serif]">
          {selectedProduct ? "Cập nhật thông tin sản phẩm" : "Thêm sản phẩm"}
        </h3>
      </div>
      <form onSubmit={onSubmit} className="grid gap-0 lg:grid-cols-[1fr_420px]">
        <div className="space-y-5 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Tên sản phẩm">
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                className="azure-input"
              />
            </AdminField>
            <AdminField label="Danh mục">
              <select
                value={form.categoryId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, categoryId: event.target.value }))
                }
                className="azure-input"
              >
                <option value="">Chưa phân loại</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </AdminField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <AdminField label="Giá">
              <input
                type="number"
                min="0"
                value={form.price}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, price: event.target.value }))
                }
                className="azure-input"
              />
            </AdminField>
            <AdminField label="Tồn kho">
              <input
                type="number"
                min="0"
                value={form.stockQuantity}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, stockQuantity: event.target.value }))
                }
                className="azure-input"
              />
            </AdminField>
            <AdminField label="Trạng thái">
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, status: event.target.value }))
                }
                className="azure-input"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </AdminField>
          </div>
          <AdminField label="Mô tả">
            <textarea
              rows="7"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              className="azure-input min-h-40 resize-y"
            />
          </AdminField>
        </div>
        <div className="space-y-5 border-t border-[#c3c6d7]/20 bg-[#faf8ff] p-6 lg:border-l lg:border-t-0">
          <div>
            <h4 className="font-extrabold text-[#191b23] [font-family:Manrope,system-ui,sans-serif]">
              Ảnh sản phẩm
            </h4>
            <p className="mt-1 text-sm text-[#434655]">
              Ảnh sẽ upload lên S3 rồi lưu URL vào sản phẩm.
            </p>
          </div>
          <ProductImageUpload
            initialImage={form.imageUrl}
            onImageUpload={(imageUrl) => setForm((prev) => ({ ...prev, imageUrl }))}
          />
          {form.imageUrl && (
            <p className="break-all rounded-xl border border-[#007d55]/20 bg-[#007d55]/5 px-4 py-3 text-xs text-[#006242]">
              {form.imageUrl}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="azure-button-muted">
              Hủy
            </button>
            <button type="submit" disabled={isSaving} className="azure-button">
              {isSaving ? "Đang lưu..." : selectedProduct ? "Cập nhật" : "Tạo sản phẩm"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function CategoryModal({
  categoryForm,
  setCategoryForm,
  selectedCategory,
  isCategorySaving,
  onClose,
  onSubmit,
  slugifyCategoryName,
}) {
  return (
    <Modal onClose={onClose} maxWidth="max-w-xl">
      <form onSubmit={onSubmit} className="space-y-5 p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#004ac6]">
            Danh mục sản phẩm
          </p>
          <h3 className="mt-2 text-2xl font-extrabold text-[#191b23] [font-family:Manrope,system-ui,sans-serif]">
            {selectedCategory ? "Cập nhật danh mục" : "Thêm danh mục"}
          </h3>
        </div>
        <AdminField label="Tên danh mục">
          <input
            value={categoryForm.name}
            onChange={(event) =>
              setCategoryForm((prev) => ({
                name: event.target.value,
                slug: prev.slug || slugifyCategoryName(event.target.value),
              }))
            }
            className="azure-input"
          />
        </AdminField>
        <AdminField label="Slug">
          <input
            value={categoryForm.slug}
            onChange={(event) =>
              setCategoryForm((prev) => ({ ...prev, slug: event.target.value }))
            }
            className="azure-input"
          />
        </AdminField>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="azure-button-muted">
            Hủy
          </button>
          <button type="submit" disabled={isCategorySaving} className="azure-button">
            {isCategorySaving ? "Đang lưu..." : "Lưu danh mục"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AdminField({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-[#434655]">
        {label}
      </span>
      {children}
    </label>
  );
}

function Modal({ children, onClose, maxWidth }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-[#191b23]/70 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`my-auto w-full ${maxWidth} overflow-hidden rounded-2xl border border-white/60 bg-white shadow-2xl`}
        onClick={(event) => event.stopPropagation()}
        role="presentation"
      >
        {children}
      </div>
    </div>
  );
}

function Toast({ notification, onClose }) {
  const isError = notification.type === "error";

  return (
    <div className="fixed right-4 top-20 z-[70] w-[calc(100vw-2rem)] max-w-md rounded-2xl border border-white/80 bg-white p-4 shadow-2xl">
      <div
        className={`rounded-xl border px-4 py-3 text-sm ${
          isError
            ? "border-[#ba1a1a]/20 bg-[#ffdad6] text-[#93000a]"
            : "border-[#007d55]/20 bg-[#bdffdb] text-[#005236]"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-extrabold">{isError ? "Có lỗi xảy ra" : "Thành công"}</p>
            <p className="mt-1">{notification.text}</p>
          </div>
          <button type="button" onClick={onClose} className="font-extrabold">
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
