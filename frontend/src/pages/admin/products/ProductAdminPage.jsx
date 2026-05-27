import { useCallback, useEffect, useMemo, useState } from "react";
import AdminDevelopmentPage from "../AdminDevelopmentPage";
import { ADMIN_SECTIONS } from "../adminSections";
import AdminCustomersPage from "../customers/AdminCustomersPage";
import AdminDashboardPage from "../dashboard/AdminDashboardPage";
import AdminOrdersPage from "../orders/AdminOrdersPage";
import AdminSettingsPage from "../settings/AdminSettingsPage";
import AdminSupportPage from "../support/AdminSupportPage";
import AdminAiChatWidget from "../../../components/admin/AdminAiChatWidget";
import AdminTopbar from "../../../components/admin/AdminTopbar";
import AdminProductCrudPage from "./AdminProductCrudPage";
import ProductDetailModal from "./ProductDetailModal";
import ProductImageUpload from "../../../components/ProductImageUpload";
import { useOrderNotifications } from "../../../context/OrderNotificationContext";
import orderApi from "../../../api/orderApi";
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  getCategories,
  getProduct,
  getProducts,
  permanentlyDeleteProduct,
  restoreProduct,
  updateCategory,
  updateProduct,
} from "../../../api/productApi";
import { getUserAddressesById, getUserById } from "../../../api/userApi";
import { formatDateTime } from "../../customer/orders/orderUtils";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const PRODUCT_TABLE_PAGE_SIZE = 10;
const ORDER_TABLE_PAGE_SIZE = 10;

const initialFormState = {
  name: "",
  description: "",
  price: "",
  purchasePrice: "",
  stockQuantity: "",
  categoryId: "",
  status: "ACTIVE",
  imageUrl: "",
  descriptionImageUrlsText: "",
};

const initialCategoryFormState = {
  name: "",
  slug: "",
};

const statusOptions = [
  { value: "ACTIVE", label: "Đang bán" },
  { value: "HIDDEN", label: "Đang ẩn" },
];

export default function ProductAdminPage({
  user,
  initialSection = "products",
  onLogout,
  onNavigate,
  onUserUpdate,
}) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({
    page: 0,
    size: PRODUCT_TABLE_PAGE_SIZE,
    totalPages: 1,
    totalElements: 0,
  });
  const [filter, setFilter] = useState({
    search: "",
    status: "",
    categoryId: "",
  });
  const [filterDraft, setFilterDraft] = useState(filter);
  const [form, setForm] = useState(initialFormState);
  const [categoryForm, setCategoryForm] = useState(initialCategoryFormState);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [selectedDetailProduct, setSelectedDetailProduct] = useState(null);
  const [detailProductLoading, setDetailProductLoading] = useState(false);
  const [detailProductError, setDetailProductError] = useState("");
  const [detailProductData, setDetailProductData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMoreProducts, setIsLoadingMoreProducts] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCategorySaving, setIsCategorySaving] = useState(false);
  const [notification, setNotification] = useState(null);
  const [activeAdminSection, setActiveAdminSection] = useState(initialSection);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [adminOrders, setAdminOrders] = useState([]);
  const [adminOrdersLoading, setAdminOrdersLoading] = useState(false);
  const [adminOrdersError, setAdminOrdersError] = useState("");
  const [adminOrderPage, setAdminOrderPage] = useState(0);
  const [adminOrderMeta, setAdminOrderMeta] = useState({
    page: 0,
    size: ORDER_TABLE_PAGE_SIZE,
    totalPages: 1,
    totalElements: 0,
  });
  const [orderSortDirection, setOrderSortDirection] = useState("desc");
  const [orderFilterDate, setOrderFilterDate] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");
  const [selectedAdminOrderId, setSelectedAdminOrderId] = useState(null);
  const [selectedAdminOrder, setSelectedAdminOrder] = useState(null);
  const [selectedAdminOrderCustomer, setSelectedAdminOrderCustomer] =
    useState(null);
  const [selectedAdminOrderAddress, setSelectedAdminOrderAddress] =
    useState(null);
  const [selectedAdminOrderComments, setSelectedAdminOrderComments] = useState(
    [],
  );
  const [selectedAdminOrderLoading, setSelectedAdminOrderLoading] =
    useState(false);
  const [selectedAdminOrderError, setSelectedAdminOrderError] = useState("");
  const [orderStatusUpdating, setOrderStatusUpdating] = useState(false);
  const { openedOrderId, lastNotification } =
    useOrderNotifications() || {
      openedOrderId: null,
      lastNotification: null,
    };

  const loadAdminOrders = useCallback(
    async (page = adminOrderPage) => {
      setAdminOrdersLoading(true);
      setAdminOrdersError("");
      try {
        const data = await orderApi.getAllOrders({
          page,
          size: ORDER_TABLE_PAGE_SIZE,
          status: orderStatusFilter,
          date: orderFilterDate || undefined,
          direction: orderSortDirection,
        });
        const nextOrders = Array.isArray(data?.content)
          ? data.content
          : Array.isArray(data)
            ? data
            : [];
        setAdminOrders(nextOrders);
        setAdminOrderMeta({
          page: Number(data?.number ?? page) || 0,
          size:
            Number(data?.size ?? ORDER_TABLE_PAGE_SIZE) ||
            ORDER_TABLE_PAGE_SIZE,
          totalPages: Number(data?.totalPages ?? 1) || 1,
          totalElements:
            Number(data?.totalElements ?? nextOrders.length) || 0,
        });
      } catch (error) {
        setAdminOrdersError(
          error.message || "Không tải được đơn hàng.",
        );
      } finally {
        setAdminOrdersLoading(false);
      }
    },
    [
      adminOrderPage,
      orderFilterDate,
      orderSortDirection,
      orderStatusFilter,
    ],
  );

  const loadAdminOrderDetail = useCallback(async (orderId) => {
    if (!orderId) return;
    setSelectedAdminOrderLoading(true);
    setSelectedAdminOrderError("");
    setSelectedAdminOrderCustomer(null);
    setSelectedAdminOrderAddress(null);
    setSelectedAdminOrderComments([]);
    try {
      const [orderResult, commentsResult] = await Promise.all([
        orderApi.getOrder(orderId),
        orderApi.getOrderComments(orderId),
      ]);
      setSelectedAdminOrder(orderResult);
      setSelectedAdminOrderComments(
        Array.isArray(commentsResult) ? commentsResult : [],
      );
      if (orderResult?.userId) {
        const [customerResult, addressesResult] = await Promise.allSettled([
          getUserById(orderResult.userId),
          getUserAddressesById(orderResult.userId),
        ]);
        if (customerResult.status === "fulfilled") {
          setSelectedAdminOrderCustomer(customerResult.value);
        }
        if (addressesResult.status === "fulfilled") {
          const addresses = Array.isArray(addressesResult.value)
            ? addressesResult.value
            : [];
          setSelectedAdminOrderAddress(
            addresses.find(
              (address) => String(address.id) === String(orderResult.addressId),
            ) || null,
          );
        }
      }
    } catch (error) {
      setSelectedAdminOrderError(
        error.message || "Không tải được chi tiết đơn hàng.",
      );
    } finally {
      setSelectedAdminOrderLoading(false);
    }
  }, []);

  const openAdminOrderDetail = useCallback((order) => {
    const id = order.orderId || order.id;
    setSelectedAdminOrder(order);
    setSelectedAdminOrderId(id);
  }, []);

  useEffect(() => {
    setActiveAdminSection(initialSection || "products");
  }, [initialSection]);

  useEffect(() => {
    if (!lastNotification) return;

    loadAdminOrders(0);

    const newOrderId = String(
      lastNotification.orderId || lastNotification.id || "",
    );
    if (newOrderId && String(selectedAdminOrderId) === newOrderId) {
      loadAdminOrderDetail(newOrderId);
    }
  }, [
    lastNotification,
    loadAdminOrderDetail,
    loadAdminOrders,
    selectedAdminOrderId,
  ]);

  useEffect(() => {
    if (!openedOrderId) return;
    const orderId = String(openedOrderId);
    if (!orderId || String(selectedAdminOrderId) === orderId) return;

    setActiveAdminSection("orders");
    setAdminOrderPage(0);
    loadAdminOrders(0);
    openAdminOrderDetail({ id: orderId });
  }, [openedOrderId, selectedAdminOrderId, loadAdminOrders, openAdminOrderDetail]);

  const stats = useMemo(() => {
    const outOfStock = products.filter(
      (product) => Number(product.stockQuantity || 0) <= 0,
    ).length;
    const hidden = products.filter(
      (product) => product.status === "HIDDEN",
    ).length;
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
    async (page = 0, options = {}) => {
      const append = Boolean(options.append && page > 0);
      if (append) {
        setIsLoadingMoreProducts(true);
      } else {
        setIsLoading(true);
      }
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

        const nextProducts = response.content || [];
        setProducts((current) => {
          if (!append) return nextProducts;
          const seen = new Set(current.map((product) => String(product.id)));
          const merged = [...current];
          nextProducts.forEach((product) => {
            const key = String(product.id);
            if (!seen.has(key)) {
              seen.add(key);
              merged.push(product);
            }
          });
          return merged;
        });
        setPagination((prev) => ({
          ...prev,
          page: response.number || page,
          totalPages: response.totalPages || 1,
          totalElements: response.totalElements || 0,
        }));
      } catch (error) {
        showNotification("error", error.message || "Không tải được sản phẩm.");
      } finally {
        if (append) {
          setIsLoadingMoreProducts(false);
        } else {
          setIsLoading(false);
        }
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
    if (activeAdminSection === "orders") {
      loadAdminOrders(adminOrderPage);
    }
  }, [
    activeAdminSection,
    adminOrderPage,
    loadAdminOrders,
    orderFilterDate,
    orderSortDirection,
    orderStatusFilter,
  ]);

  const filteredAdminOrders = adminOrders;

  function toggleOrderSortDirection() {
    setAdminOrderPage(0);
    setOrderSortDirection((prev) => (prev === "desc" ? "asc" : "desc"));
  }

  function clearOrderFilterDate() {
    setAdminOrderPage(0);
    setOrderFilterDate("");
  }

  const hasMoreProducts = pagination.page + 1 < pagination.totalPages;

  function loadMoreProducts() {
    if (isLoading || isLoadingMoreProducts || !hasMoreProducts) return;
    loadProducts(pagination.page + 1, { append: true });
  }

  useEffect(() => {
    if (!selectedAdminOrderId) return undefined;
    loadAdminOrderDetail(selectedAdminOrderId);
  }, [loadAdminOrderDetail, selectedAdminOrderId]);

  useEffect(() => {
    if (!notification) return undefined;
    const timer = window.setTimeout(() => setNotification(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notification]);

  async function loadAdminOrdersLegacy(page = adminOrderPage) {
    setAdminOrdersLoading(true);
    setAdminOrdersError("");
    try {
      const data = await orderApi.getAllOrders({
        page,
        size: ORDER_TABLE_PAGE_SIZE,
        status: orderStatusFilter,
        date: orderFilterDate || undefined,
        direction: orderSortDirection,
      });
      const nextOrders = Array.isArray(data?.content)
        ? data.content
        : Array.isArray(data)
          ? data
          : [];
      setAdminOrders(nextOrders);
      setAdminOrderMeta({
        page: Number(data?.number ?? page) || 0,
        size:
          Number(data?.size ?? ORDER_TABLE_PAGE_SIZE) || ORDER_TABLE_PAGE_SIZE,
        totalPages: Number(data?.totalPages ?? 1) || 1,
        totalElements: Number(data?.totalElements ?? nextOrders.length) || 0,
      });
    } catch (error) {
      setAdminOrdersError(error.message || "Không tải được đơn hàng.");
    } finally {
      setAdminOrdersLoading(false);
    }
  }

  function handleAdminOrderDateChange(value) {
    setAdminOrderPage(0);
    setOrderFilterDate(value);
  }

  function handleAdminOrderStatusFilterChange(value) {
    setAdminOrderPage(0);
    setOrderStatusFilter(value);
  }

  async function loadAdminOrderDetailLegacy(orderId) {
    if (!orderId) return;
    setSelectedAdminOrderLoading(true);
    setSelectedAdminOrderError("");
    setSelectedAdminOrderCustomer(null);
    setSelectedAdminOrderAddress(null);
    setSelectedAdminOrderComments([]);
    try {
      const [orderResult, commentsResult] = await Promise.all([
        orderApi.getOrder(orderId),
        orderApi.getOrderComments(orderId),
      ]);
      setSelectedAdminOrder(orderResult);
      setSelectedAdminOrderComments(
        Array.isArray(commentsResult) ? commentsResult : [],
      );
      if (orderResult?.userId) {
        const [customerResult, addressesResult] = await Promise.allSettled([
          getUserById(orderResult.userId),
          getUserAddressesById(orderResult.userId),
        ]);
        if (customerResult.status === "fulfilled") {
          setSelectedAdminOrderCustomer(customerResult.value);
        }
        if (addressesResult.status === "fulfilled") {
          const addresses = Array.isArray(addressesResult.value)
            ? addressesResult.value
            : [];
          setSelectedAdminOrderAddress(
            addresses.find(
              (address) => String(address.id) === String(orderResult.addressId),
            ) || null,
          );
        }
      }
    } catch (error) {
      setSelectedAdminOrderError(
        error.message || "Không tải được chi tiết đơn hàng.",
      );
    } finally {
      setSelectedAdminOrderLoading(false);
    }
  }

  function openAdminOrderDetailLegacy(order) {
    const id = order.orderId || order.id;
    setSelectedAdminOrder(order);
    setSelectedAdminOrderId(id);
  }

  function closeAdminOrderDetail() {
    setSelectedAdminOrderId(null);
    setSelectedAdminOrder(null);
    setSelectedAdminOrderCustomer(null);
    setSelectedAdminOrderAddress(null);
    setSelectedAdminOrderError("");
  }

  async function handleAdminOrderStatusUpdate(newStatus) {
    if (!selectedAdminOrderId) return;
    setOrderStatusUpdating(true);
    try {
      await orderApi.updateOrderStatus(selectedAdminOrderId, newStatus);
      showNotification("success", `Đã chuyển đơn sang ${newStatus}.`);
      await Promise.all([
        loadAdminOrders(adminOrderPage),
        loadAdminOrderDetail(selectedAdminOrderId),
      ]);
    } catch (error) {
      showNotification(
        "error",
        error.message || "Không cập nhật được trạng thái đơn hàng.",
      );
    } finally {
      setOrderStatusUpdating(false);
    }
  }

  // Notifications handled globally via OrderNotificationProvider

  useEffect(() => {
    if (!showProductForm && !showCategoryForm && !selectedDetailProduct)
      return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeProductForm();
        closeCategoryForm();
        closeProductDetail();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showCategoryForm, showProductForm, selectedDetailProduct]);

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
      purchasePrice: product.purchasePrice?.toString() || "",
      stockQuantity: product.stockQuantity?.toString() || "",
      categoryId: product.category?.id?.toString() || "",
      status: product.status || "ACTIVE",
      imageUrl: product.imageUrl || "",
      descriptionImageUrlsText: Array.isArray(product.descriptionImageUrls)
        ? product.descriptionImageUrls.join("\n")
        : "",
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

    if (
      !form.name.trim() ||
      !form.price ||
      !form.purchasePrice ||
      !form.stockQuantity
    ) {
      showNotification("error", "Vui lòng nhập tên, giá bán, giá nhập và tồn kho.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      purchasePrice: Number(form.purchasePrice),
      stockQuantity: Number(form.stockQuantity),
      categoryId: form.categoryId ? Number(form.categoryId) : undefined,
      status: form.status,
      imageUrl: form.imageUrl || undefined,
      descriptionImageUrls: form.descriptionImageUrlsText
        .split(/\r?\n/)
        .map((url) => url.trim())
        .filter(Boolean),
    };

    setIsSaving(true);
    try {
      if (selectedProduct?.id) {
        await updateProduct(selectedProduct.id, payload);
        showNotification("success", "Đã cập nhật sản phẩm.");
        await loadProducts(0);
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
    if (
      !window.confirm(
        "Ẩn sản phẩm này khỏi danh sách bán hàng? Chỉ sản phẩm chưa phát sinh đơn hàng mới có thể bị ẩn.",
      )
    )
      return;

    try {
      await deleteProduct(productId);
      showNotification("success", "Đã ẩn sản phẩm.");
      await loadProducts(0);
    } catch (error) {
      showNotification("error", error.message || "Không ẩn được sản phẩm.");
    }
  }

  async function handleRestoreProduct(productId) {
    if (!window.confirm("Bỏ ẩn sản phẩm này?")) return;

    try {
      await restoreProduct(productId);
      showNotification("success", "Đã bỏ ẩn sản phẩm.");
      await loadProducts(0);
    } catch (error) {
      showNotification("error", error.message || "Không bỏ ẩn được sản phẩm.");
    }
  }

  async function handlePermanentDeleteProduct(productId) {
    if (
      !window.confirm(
        "Xóa vĩnh viễn sản phẩm này khỏi hệ thống? Hành động này không thể hoàn tác và chỉ áp dụng cho sản phẩm đang bị ẩn.",
      )
    )
      return;

    try {
      await permanentlyDeleteProduct(productId);
      showNotification("success", "Đã xóa vĩnh viễn sản phẩm.");
      const nextPage =
        products.length <= 1 && pagination.page > 0
          ? pagination.page - 1
          : pagination.page;
      await loadProducts(nextPage);
    } catch (error) {
      showNotification(
        "error",
        error.message || "Không xóa vĩnh viễn được sản phẩm.",
      );
    }
  }

  async function openProductDetail(product) {
    setSelectedDetailProduct(product);
    setDetailProductLoading(true);
    setDetailProductError("");
    setDetailProductData(null);

    try {
      const [productResult, detailWithCommentsResult, ordersExistResult] =
        await Promise.allSettled([
          getProduct(product.id),
          orderApi.getProductDetailWithComments(product.id),
          orderApi.checkProductOrderHistory(product.id),
        ]);

      const productData =
        productResult.status === "fulfilled" ? productResult.value : product;
      const detailWithComments =
        detailWithCommentsResult.status === "fulfilled"
          ? detailWithCommentsResult.value
          : null;
      const hasOrders =
        ordersExistResult.status === "fulfilled"
          ? ordersExistResult.value
          : null;

      const detailPayload = {
        product: productData,
        comments: detailWithComments?.comments || [],
        ratingStats: detailWithComments
          ? {
              totalComments: detailWithComments.totalComments,
              averageRating: detailWithComments.averageRating,
              ratingCount1Star: detailWithComments.ratingCount1Star,
              ratingCount2Star: detailWithComments.ratingCount2Star,
              ratingCount3Star: detailWithComments.ratingCount3Star,
              ratingCount4Star: detailWithComments.ratingCount4Star,
              ratingCount5Star: detailWithComments.ratingCount5Star,
            }
          : null,
        hasOrders,
      };

      setDetailProductData(detailPayload);
      if (
        productResult.status === "rejected" &&
        detailWithCommentsResult.status === "rejected"
      ) {
        setDetailProductError(
          productResult.reason?.message ||
            detailWithCommentsResult.reason?.message ||
            "Không tải được chi tiết sản phẩm.",
        );
      }
    } catch (error) {
      setDetailProductError(
        error.message || "Không tải được chi tiết sản phẩm.",
      );
    } finally {
      setDetailProductLoading(false);
    }
  }

  function closeProductDetail() {
    setSelectedDetailProduct(null);
    setDetailProductData(null);
    setDetailProductError("");
    setDetailProductLoading(false);
  }

  async function handleSubmitCategory(event) {
    event.preventDefault();

    if (!categoryForm.name.trim()) {
      showNotification("error", "Vui lòng nhập tên danh mục.");
      return;
    }

    const payload = {
      name: categoryForm.name.trim(),
      slug: (
        categoryForm.slug || slugifyCategoryName(categoryForm.name)
      ).trim(),
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
    if (
      !window.confirm(
        "Xóa danh mục này? Backend có thể từ chối nếu đang được dùng.",
      )
    ) {
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
      <AdminSidebarToggle
        activeSection={activeAdminSection}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
        onSectionChange={(section) => {
          setActiveAdminSection(section);
          onNavigate?.(section);
          closeProductForm();
          closeCategoryForm();
          closeProductDetail();
          closeAdminOrderDetail();
        }}
        onNavigate={onNavigate}
      />

      <main
        key={activeAdminSection}
        className={`min-h-screen transition-[margin] duration-200 ${
          sidebarCollapsed ? "ml-20" : "ml-64"
        }`}
      >
        <AdminTopbar
          user={user}
          onLogout={onLogout}
          onNavigate={onNavigate}
          filterDraft={filterDraft}
          setFilterDraft={setFilterDraft}
          applyFilters={applyFilters}
        />

        {activeAdminSection === "dashboard" ? (
          <AdminDashboardPage onSectionChange={setActiveAdminSection} />
        ) : activeAdminSection === "products" ? (
          <AdminProductCrudPage
            products={products}
            categories={categories}
            pagination={pagination}
            filterDraft={filterDraft}
            setFilterDraft={setFilterDraft}
            stats={stats}
            isLoading={isLoading}
            isLoadingMore={isLoadingMoreProducts}
            hasMoreProducts={hasMoreProducts}
            statusOptions={statusOptions}
            onApplyFilters={applyFilters}
            onResetFilters={resetFilters}
            onLoadProducts={loadProducts}
            onLoadMoreProducts={loadMoreProducts}
            onCreateCategory={openCreateCategoryForm}
            onCreateProduct={openCreateProductForm}
            onViewProduct={openProductDetail}
            onEditProduct={openEditProductForm}
            onDeleteProduct={handleDeleteProduct}
            onRestoreProduct={handleRestoreProduct}
            onPermanentDeleteProduct={handlePermanentDeleteProduct}
            onEditCategory={openEditCategoryForm}
            onDeleteCategory={handleDeleteCategory}
          />
        ) : false ? (
          <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-10">
            <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="mb-2 text-4xl font-extrabold tracking-tight text-[#191b23] [font-family:Manrope,system-ui,sans-serif]">
                  Quản lý Sản phẩm
                </h2>
                <p className="text-[#434655]">
                  Theo dõi kho hàng, giá cả và hiển thị sản phẩm trên toàn hệ
                  thống.
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
                  className="flex items-center gap-2 rounded-xl bg-[#ff4500] px-6 py-3 font-semibold text-white shadow-xl shadow-orange-500/10 transition hover:scale-105 hover:bg-[#e63e00] active:scale-95"
                >
                  <span className="material-symbols-outlined">add</span>
                  <span>Thêm sản phẩm mới</span>
                </button>
              </div>
            </div>

            <div className="mb-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Tổng sản phẩm"
                value={stats.totalProducts}
                helper="+ đang quản lý"
              />
              <StatCard
                label="Sắp hết hàng"
                value={stats.outOfStock}
                helper="Cần nhập thêm"
                helperClass="text-[#9d4300]"
              />
              <StatCard
                label="Đang ẩn"
                value={stats.hidden}
                helper="Không hiển thị công khai"
              />
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
                    <span className="material-symbols-outlined">
                      trending_up
                    </span>
                  </div>
                </div>
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
                    setFilterDraft((prev) => ({
                      ...prev,
                      search: event.target.value,
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      applyFilters();
                    }
                  }}
                  placeholder="Tìm kiếm theo tên sản phẩm..."
                  className="w-full rounded-lg border border-[#c3c6d7]/30 bg-white py-2 pl-10 pr-4 text-sm font-medium text-[#191b23] outline-none transition focus:border-[#004ac6] focus:ring-2 focus:ring-[#004ac6]/20"
                />
              </label>
              <CategoryFilterButton
                active={!filterDraft.categoryId}
                label="Tất cả sản phẩm"
                onClick={() =>
                  setFilterDraft((prev) => ({ ...prev, categoryId: "" }))
                }
              />
              {categories.slice(0, 4).map((category) => (
                <CategoryFilterButton
                  key={category.id}
                  active={
                    String(filterDraft.categoryId) === String(category.id)
                  }
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
                    setFilterDraft((prev) => ({
                      ...prev,
                      status: event.target.value,
                    }))
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
                <button
                  type="button"
                  onClick={applyFilters}
                  className="azure-button"
                >
                  Áp dụng
                </button>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="azure-button-muted"
                >
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
                      <TableHead>Giá bán</TableHead>
                      <TableHead>Giá nhập</TableHead>
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
                          onView={() => openProductDetail(product)}
                          onEdit={() => openEditProductForm(product)}
                          onDelete={() => handleDeleteProduct(product.id)}
                          onRestore={() => handleRestoreProduct(product.id)}
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
                    {products.length
                      ? pagination.page * pagination.size + 1
                      : 0}{" "}
                    - {pagination.page * pagination.size + products.length}
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
        ) : activeAdminSection === "orders" ? (
          <AdminOrdersPage
            orders={adminOrders}
            filteredOrders={filteredAdminOrders}
            pagination={adminOrderMeta}
            loading={adminOrdersLoading}
            error={adminOrdersError}
            sortDirection={orderSortDirection}
            filterDate={orderFilterDate}
            filterStatus={orderStatusFilter}
            selectedOrder={selectedAdminOrderId ? selectedAdminOrder : null}
            selectedCustomer={selectedAdminOrderCustomer}
            selectedAddress={selectedAdminOrderAddress}
            comments={selectedAdminOrderComments}
            detailLoading={selectedAdminOrderLoading}
            detailError={selectedAdminOrderError}
            updating={orderStatusUpdating}
            onToggleSort={toggleOrderSortDirection}
            onFilterDateChange={handleAdminOrderDateChange}
            onFilterStatusChange={handleAdminOrderStatusFilterChange}
            onClearFilterDate={clearOrderFilterDate}
            onPageChange={setAdminOrderPage}
            onOpenOrder={openAdminOrderDetail}
            onCloseDetail={closeAdminOrderDetail}
            onStatusChange={handleAdminOrderStatusUpdate}
          />
        ) : false ? (
          <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-10">
            <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="mb-2 text-4xl font-extrabold tracking-tight text-[#191b23] [font-family:Manrope,system-ui,sans-serif]">
                  Quản lý Đơn hàng
                </h2>
                <p className="text-[#434655]">
                  Xem danh sách đơn mới nhất, theo dõi trạng thái và cập nhật
                  tiến trình giao hàng.
                </p>
              </div>
              <div className="rounded-3xl border border-[#c3c6d7]/10 bg-white p-5">
                <p className="text-xs uppercase tracking-widest text-[#434655]">
                  Tổng đơn hàng
                </p>
                <p className="mt-2 text-3xl font-extrabold text-[#004ac6]">
                  {adminOrders.length}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[#434655]">
                  <span>Sắp xếp theo ngày:</span>
                  <button
                    type="button"
                    onClick={toggleOrderSortDirection}
                    className="rounded-full border border-[#c3c6d7]/50 bg-[#f3f3fe] px-3 py-1 text-sm font-semibold text-[#004ac6] transition hover:bg-[#e7e7f3]"
                  >
                    {orderSortDirection === "desc"
                      ? "Mới nhất trước"
                      : "Cũ nhất trước"}
                  </button>
                  <label className="inline-flex items-center gap-2 rounded-full border border-[#c3c6d7]/50 bg-white px-3 py-1 text-sm text-[#434655] shadow-sm">
                    <span className="material-symbols-outlined text-base text-[#004ac6]">
                      calendar_month
                    </span>
                    <span>Chọn ngày:</span>
                    <input
                      type="date"
                      value={orderFilterDate}
                      onChange={(event) =>
                        setOrderFilterDate(event.target.value)
                      }
                      onKeyDown={(event) => event.preventDefault()}
                      className="w-36 cursor-pointer rounded-lg border border-[#c3c6d7]/60 bg-white px-2 py-1 text-sm text-[#191b23] outline-none transition focus:border-[#004ac6] focus:ring-2 focus:ring-[#004ac6]/20"
                    />
                  </label>
                  {orderFilterDate && (
                    <button
                      type="button"
                      onClick={clearOrderFilterDate}
                      className="rounded-full border border-[#c3c6d7]/50 bg-[#f3f3fe] px-3 py-1 text-sm font-semibold text-[#004ac6] transition hover:bg-[#e7e7f3]"
                    >
                      Xóa filter
                    </button>
                  )}
                </div>
              </div>
            </div>

            <section className="overflow-hidden rounded-2xl border border-[#c3c6d7]/10 bg-[#f3f3fe] shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
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
                    {adminOrdersLoading ? (
                      <EmptyRow colSpan={6} text="Đang tải đơn hàng..." />
                    ) : adminOrdersError ? (
                      <EmptyRow colSpan={6} text={adminOrdersError} />
                    ) : filteredAdminOrders.length === 0 ? (
                      <EmptyRow colSpan={6} text="Không có đơn hàng phù hợp." />
                    ) : (
                      filteredAdminOrders.map((order) => (
                        <AdminOrderRow
                          key={order.orderId || order.id}
                          order={order}
                          onOpen={() => openAdminOrderDetail(order)}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {selectedAdminOrderId && (
              <AdminOrderDetailModal
                order={selectedAdminOrder}
                comments={selectedAdminOrderComments}
                loading={selectedAdminOrderLoading}
                error={selectedAdminOrderError}
                onClose={closeAdminOrderDetail}
                onStatusChange={handleAdminOrderStatusUpdate}
                updating={orderStatusUpdating}
              />
            )}
          </div>
        ) : activeAdminSection === "support" ? (
          <AdminSupportPage user={user} />
        ) : activeAdminSection === "customers" ? (
          <AdminCustomersPage currentUser={user} />
        ) : activeAdminSection === "settings" ? (
          <AdminSettingsPage user={user} onUserUpdate={onUserUpdate} />
        ) : (
          <AdminDevelopmentPage section={ADMIN_SECTIONS[activeAdminSection]} />
        )}
      </main>

      <button
        type="button"
        onClick={() => setActiveAdminSection("support")}
        className="fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/80 text-[#004ac6] shadow-2xl backdrop-blur-xl transition hover:scale-110 active:scale-95"
        aria-label="Mở hỗ trợ"
        title="Mở hỗ trợ"
      >
        <span className="material-symbols-outlined text-2xl transition group-hover:rotate-12">
          chat_bubble
        </span>
      </button>

      <AdminAiChatWidget user={user} />

      {notification && (
        <Toast
          notification={notification}
          onClose={() => setNotification(null)}
        />
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
      {selectedDetailProduct && (
        <ProductDetailModal
          productId={selectedDetailProduct.id}
          onClose={closeProductDetail}
        />
      )}
    </div>
  );
}

function AdminNotificationBell() {
  const { notifications, unreadCount, markAllRead } =
    useOrderNotifications() || {
      notifications: [],
      unreadCount: 0,
      markAllRead: () => {},
    };
  const [open, setOpen] = useState(false);

  function toggle() {
    setOpen((v) => !v);
    if (!open) markAllRead();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        className="relative rounded-full p-2 text-[#434655] hover:bg-[#ededf9]"
        title="Thông báo"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <strong>Thông báo đơn hàng</strong>
            <button
              onClick={() => setOpen(false)}
              className="text-sm text-slate-500"
            >
              Đóng
            </button>
          </div>
          <div className="max-h-64 overflow-auto">
            {notifications.length === 0 ? (
              <div className="py-4 text-sm text-slate-500">
                Không có thông báo
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="mb-2 rounded-md border p-2 text-sm">
                  <div className="font-semibold">Đơn #{n.orderId}</div>
                  <div className="text-xs text-slate-500">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                  <div className="mt-1">
                    {new Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    }).format(n.total)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminSidebarToggle({
  activeSection,
  collapsed,
  onToggleCollapsed,
  onSectionChange,
}) {
  const primaryItems = [
    { id: "dashboard", icon: "dashboard", label: "Bảng điều khiển" },
    { id: "products", icon: "inventory_2", label: "Sản phẩm" },
    { id: "orders", icon: "shopping_cart", label: "Đơn hàng" },
    { id: "customers", icon: "group", label: "Khách hàng" },
    { id: "analytics", icon: "analytics", label: "Phân tích" },
  ];
  const secondaryItems = [
    { id: "support", icon: "help", label: "Hỗ trợ" },
    { id: "settings", icon: "settings", label: "Cài đặt" },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-screen flex-col bg-[#f3f3fe] py-6 transition-[width,padding] duration-200 ${
        collapsed ? "w-20 px-3" : "w-64 px-4"
      }`}
    >
      <div
        className={`mb-10 flex items-start gap-3 ${
          collapsed ? "justify-center px-0" : "justify-between px-4"
        }`}
      >
        {!collapsed ? (
          <div className="min-w-0">
            <h1 className="truncate text-lg font-extrabold text-blue-700 [font-family:Manrope,system-ui,sans-serif]">
              DTPShop Admin
            </h1>
            <p className="text-xs font-medium text-[#191b23]/60">
              Quản lý cửa hàng của bạn
            </p>
          </div>
        ) : null}
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#004ac6] shadow-sm transition hover:bg-[#ededf9]"
          aria-label={collapsed ? "Mở menu" : "Thu gọn menu"}
          title={collapsed ? "Mở menu" : "Thu gọn menu"}
        >
          <span className="material-symbols-outlined">
            {collapsed ? "menu_open" : "menu"}
          </span>
        </button>
      </div>

      <nav className="flex-1 space-y-2">
        {primaryItems.map((item) => (
          <CollapsedSideNavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            collapsed={collapsed}
            active={activeSection === item.id}
            filled={activeSection === item.id && item.id === "products"}
            onClick={() => onSectionChange(item.id)}
          />
        ))}
      </nav>

      <div className="mt-auto space-y-2 pt-6">
        {secondaryItems.map((item) => (
          <CollapsedSideNavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            collapsed={collapsed}
            active={activeSection === item.id}
            onClick={() => onSectionChange(item.id)}
          />
        ))}
      </div>
    </aside>
  );
}

function CollapsedSideNavItem({
  icon,
  label,
  active = false,
  filled = false,
  collapsed = false,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`flex w-full items-center rounded-lg py-3 text-left text-sm transition-all duration-150 ${
        collapsed ? "justify-center px-2" : "gap-3 px-4"
      } ${
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
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </button>
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

function ProductRow({ product, onView, onEdit, onDelete, onRestore }) {
  const stock = Number(product.stockQuantity || 0);
  const isHidden = product.status === "HIDDEN";
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
      <td className="px-6 py-5 font-semibold text-[#191b23] [font-family:Manrope,system-ui,sans-serif]">
        {currencyFormatter.format(product.purchasePrice || 0)}
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
                outOfStock
                  ? "bg-[#ba1a1a]"
                  : lowStock
                    ? "bg-[#fd761a]"
                    : "bg-[#007d55]"
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
            onClick={onView}
            className="rounded-lg p-2 text-[#004ac6] transition-colors hover:bg-[#004ac6]/5"
            title="Xem chi tiết"
          >
            <span className="material-symbols-outlined">visibility</span>
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg p-2 text-[#004ac6] transition-colors hover:bg-[#004ac6]/5"
          >
            <span className="material-symbols-outlined">edit</span>
          </button>
          {isHidden ? (
            <button
              type="button"
              onClick={onRestore}
              className="rounded-lg p-2 text-[#006242] transition-colors hover:bg-[#006242]/10"
              title="Bỏ ẩn"
            >
              <span className="material-symbols-outlined">undo</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg p-2 text-[#ba1a1a] transition-colors hover:bg-[#ba1a1a]/5"
              title="Ẩn sản phẩm"
            >
              <span className="material-symbols-outlined">delete</span>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function EmptyRow({ text, colSpan = 5 }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-6 py-12 text-center text-sm text-[#434655]"
      >
        {text}
      </td>
    </tr>
  );
}

function getOrderStatusLabel(status) {
  const labels = {
    PENDING: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    PROCESSING: "Đang xử lý",
    SHIPPED: "Đã giao",
    DELIVERED: "Đã hoàn tất",
  };
  return labels[status] || status || "Chưa rõ";
}

function getOrderStatusColor(status) {
  const colors = {
    PENDING: "bg-[#fff4e5] text-[#b45309] border-[#fcd34d]/40",
    CONFIRMED: "bg-[#e0f2fe] text-[#0c4a6e] border-[#38bdf8]/40",
    PROCESSING: "bg-[#ede9fe] text-[#5b21b6] border-[#a78bfa]/40",
    SHIPPED: "bg-[#ecfdf5] text-[#166534] border-[#4ade80]/40",
    DELIVERED: "bg-[#f0fdf4] text-[#14532d] border-[#86efac]/40",
  };
  return colors[status] || "bg-[#f3f4f6] text-[#374151] border-[#d1d5db]/40";
}

function getNextOrderStatus(status) {
  const transitions = {
    PENDING: "CONFIRMED",
    CONFIRMED: "PROCESSING",
    PROCESSING: "SHIPPED",
    SHIPPED: "DELIVERED",
  };
  return transitions[status] || null;
}

function AdminOrderRow({ order, onOpen }) {
  const orderId = order.orderId || order.id || "N/A";
  const customerLabel =
    order.customerName || order.customerEmail || `User #${order.userId || "?"}`;
  const totalAmount = order.totalAmount ?? order.total ?? 0;
  return (
    <tr className="transition-colors duration-150 hover:bg-white">
      <td className="px-6 py-5 font-semibold text-[#191b23]">#{orderId}</td>
      <td className="px-6 py-5 text-sm text-[#434655]">{customerLabel}</td>
      <td className="px-6 py-5">
        <span
          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getOrderStatusColor(order.status)}`}
        >
          {getOrderStatusLabel(order.status)}
        </span>
      </td>
      <td className="px-6 py-5 text-sm text-[#434655]">
        {formatDateTime(order.createdAt)}
      </td>
      <td className="px-6 py-5 font-semibold text-right text-[#191b23]">
        {currencyFormatter.format(totalAmount)}
      </td>
      <td className="px-6 py-5 text-right">
        <button
          type="button"
          onClick={onOpen}
          className="rounded-lg bg-[#004ac6] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#003a8c]"
        >
          Chi tiết
        </button>
      </td>
    </tr>
  );
}

function AdminOrderDetailModal({
  order,
  comments,
  loading,
  error,
  onClose,
  onStatusChange,
  updating,
}) {
  const nextStatus = order ? getNextOrderStatus(order.status) : null;
  const shippingAddress = order?.shippingAddress;
  const addressText = shippingAddress
    ? typeof shippingAddress === "string"
      ? shippingAddress
      : JSON.stringify(shippingAddress, null, 2)
    : "Chưa có thông tin địa chỉ";
  const items = Array.isArray(order?.items) ? order.items : [];
  const totalAmount = order?.totalAmount ?? order?.total ?? 0;

  return (
    <Modal onClose={onClose} maxWidth="max-w-5xl">
      <div className="border-b border-[#c3c6d7]/20 bg-[#f3f3fe] px-6 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#004ac6]">
              Chi tiết đơn hàng
            </p>
            <h3 className="mt-2 text-2xl font-extrabold text-[#191b23]">
              Đơn #{order?.orderId || order?.id || "-"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#191b23] transition hover:bg-[#ededf9]"
          >
            Đóng
          </button>
        </div>
      </div>
      <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          {loading ? (
            <div>Đang tải chi tiết đơn hàng...</div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-[#fef2f2] p-5 text-sm text-[#b91c1c]">
              {error}
            </div>
          ) : order ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoCard
                  label="Mã đơn hàng"
                  value={`#${order.orderId || order.id}`}
                />
                <InfoCard
                  label="Trạng thái"
                  value={getOrderStatusLabel(order.status)}
                  badgeClass={getOrderStatusColor(order.status)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoCard
                  label="Ngày tạo"
                  value={
                    formatDateTime(order.createdAt)
                  }
                />
                <InfoCard
                  label="Khách hàng"
                  value={
                    order.customerName ||
                    order.customerEmail ||
                    `User #${order.userId || "?"}`
                  }
                />
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-950">
                  Địa chỉ giao hàng
                </p>
                <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {addressText}
                </pre>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-950">Sản phẩm</p>
                <div className="mt-4 space-y-3">
                  {items.length === 0 ? (
                    <div className="text-sm text-slate-500">
                      Không có sản phẩm trong đơn.
                    </div>
                  ) : (
                    items.map((item) => (
                      <div
                        key={`${order.orderId || order.id}-${item.productId}-${item.productName}`}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-[#f8fafc] p-4"
                      >
                        <div>
                          <p className="font-semibold text-slate-950">
                            {item.productName || `Sản phẩm #${item.productId}`}
                          </p>
                          <p className="text-sm text-slate-500">
                            Số lượng: {item.quantity}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-slate-950">
                          {currencyFormatter.format(item.price ?? 0)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-950">
                  Bình luận đơn hàng
                </p>
                <div className="mt-4 space-y-4">
                  {comments.length === 0 ? (
                    <div className="text-sm text-slate-500">
                      Chưa có bình luận nào cho đơn hàng này.
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-950">
                              Khách hàng #{comment.userId}
                              {comment.productId
                                ? ` — Sản phẩm #${comment.productId}`
                                : ""}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatDateTime(comment.createdAt)}
                            </p>
                          </div>
                          {comment.rating != null && (
                            <span className="rounded-full bg-[#e2e8f0] px-3 py-1 text-xs font-semibold text-slate-700">
                              {comment.rating}/5
                            </span>
                          )}
                        </div>
                        <p className="mt-3 text-sm text-slate-700">
                          {comment.comment || "Không có nội dung."}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-500">
              Chọn đơn hàng để xem chi tiết.
            </div>
          )}
        </div>
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-semibold text-slate-950">
              Tổng quan đơn hàng
            </p>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex justify-between gap-4">
                <span>Tổng tiền</span>
                <span className="font-semibold text-slate-950">
                  {currencyFormatter.format(totalAmount)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Phương thức thanh toán</span>
                <span className="font-semibold text-slate-950">
                  {order?.paymentMethod || "Chưa rõ"}
                </span>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-semibold text-slate-950">Hành động</p>
            <div className="mt-4 space-y-4">
              {nextStatus ? (
                <button
                  type="button"
                  onClick={() => onStatusChange(nextStatus)}
                  disabled={updating}
                  className="w-full rounded-2xl bg-[#004ac6] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#003a8c] disabled:cursor-not-allowed disabled:bg-[#9fb9d8]"
                >
                  {updating
                    ? "Đang cập nhật..."
                    : `Chuyển sang ${getOrderStatusLabel(nextStatus)}`}
                </button>
              ) : (
                <div className="rounded-2xl bg-[#f3f4f6] px-4 py-3 text-sm text-slate-600">
                  Đơn hàng đã hoàn tất, không thể thay đổi trạng thái nữa.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function AdminInfoCard({ label, value, badgeClass }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-[#f8fafc] p-4">
      <div className="text-xs uppercase tracking-widest text-[#6b7280]">
        {label}
      </div>
      <div
        className={`mt-3 text-sm font-semibold text-slate-950 ${badgeClass ? "inline-flex rounded-full px-3 py-1" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function InfoCard({ label, value, badgeClass }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4">
      <div className="text-xs uppercase tracking-widest text-[#6b7280]">
        {label}
      </div>
      <div
        className={`mt-3 text-sm font-semibold text-slate-950 ${badgeClass ? "inline-flex rounded-full px-3 py-1" : ""}`}
      >
        {value}
      </div>
    </div>
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
              <p className="truncate font-bold text-[#191b23]">
                {category.name}
              </p>
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
                <span className="material-symbols-outlined text-lg">
                  delete
                </span>
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
                  setForm((prev) => ({
                    ...prev,
                    categoryId: event.target.value,
                  }))
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
          <div className="grid gap-4 sm:grid-cols-4">
            <AdminField label="Giá bán">
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
            <AdminField label="Giá nhập">
              <input
                type="number"
                min="0"
                value={form.purchasePrice}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    purchasePrice: event.target.value,
                  }))
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
                  setForm((prev) => ({
                    ...prev,
                    stockQuantity: event.target.value,
                  }))
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
                setForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
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
            onImageUpload={(imageUrl) =>
              setForm((prev) => ({ ...prev, imageUrl }))
            }
          />
          {form.imageUrl && (
            <p className="break-all rounded-xl border border-[#007d55]/20 bg-[#007d55]/5 px-4 py-3 text-xs text-[#006242]">
              {form.imageUrl}
            </p>
          )}
          <AdminField label="Ảnh mô tả">
            <textarea
              rows="5"
              value={form.descriptionImageUrlsText}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  descriptionImageUrlsText: event.target.value,
                }))
              }
              className="azure-input min-h-32 resize-y"
              placeholder="Mỗi URL ảnh trên một dòng"
            />
          </AdminField>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="azure-button-muted"
            >
              Hủy
            </button>
            <button type="submit" disabled={isSaving} className="azure-button">
              {isSaving
                ? "Đang lưu..."
                : selectedProduct
                  ? "Cập nhật"
                  : "Tạo sản phẩm"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function ProductDetailAdminModal({
  product,
  detailData,
  loading,
  error,
  onClose,
}) {
  const productData = detailData?.product || product || {};
  const comments = Array.isArray(detailData?.comments)
    ? detailData.comments
    : [];
  const ratingStats = detailData?.ratingStats;
  const hasOrders = detailData?.hasOrders;
  const orderHistoryLabel =
    hasOrders === true ? "Có" : hasOrders === false ? "Chưa" : "Không rõ";
  const orderHistoryTextClass =
    hasOrders === true
      ? "text-emerald-700"
      : hasOrders === false
        ? "text-slate-950"
        : "text-slate-500";
  const images = [
    productData.imageUrl,
    ...(Array.isArray(productData.descriptionImageUrls)
      ? productData.descriptionImageUrls
      : []),
  ].filter(Boolean);
  const [selectedImage, setSelectedImage] = useState(images[0] || "");

  useEffect(() => {
    setSelectedImage(images[0] || "");
  }, [detailData, product?.id]);

  const averageRating =
    ratingStats?.averageRating ??
    (comments.length
      ? comments.reduce(
          (sum, comment) => sum + (Number(comment.rating) || 0),
          0,
        ) / comments.length
      : 0);

  const totalComments = ratingStats?.totalComments ?? comments.length;

  return (
    <Modal onClose={onClose} maxWidth="max-w-6xl">
      <div className="border-b border-[#c3c6d7]/20 bg-[#f3f3fe] px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#004ac6]">
              Chi tiết sản phẩm (Admin)
            </p>
            <h3 className="mt-2 text-2xl font-extrabold text-[#191b23] [font-family:Manrope,system-ui,sans-serif]">
              {productData.name || "Sản phẩm"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#191b23] transition hover:bg-[#ededf9]"
          >
            Đóng
          </button>
        </div>
      </div>
      <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="aspect-[4/3] overflow-hidden rounded-3xl bg-[#f3f3fe] p-3">
            {images[0] ? (
              <img
                src={selectedImage || images[0]}
                alt={productData.name}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Chưa có ảnh sản phẩm
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {images.map((imageUrl, index) => (
                <button
                  type="button"
                  onClick={() => setSelectedImage(imageUrl)}
                  key={`${imageUrl}-${index}`}
                  className={`aspect-square overflow-hidden rounded-2xl border bg-slate-50 p-2 transition hover:border-[#004ac6] ${
                    (selectedImage || images[0]) === imageUrl
                      ? "border-[#004ac6] ring-2 ring-[#004ac6]/15"
                      : "border-slate-200"
                  }`}
                >
                  <img
                    src={imageUrl}
                    alt={`${productData.name || "Sản phẩm"} ${index + 1}`}
                    className="h-full w-full object-contain"
                  />
                </button>
              ))}
            </div>
          )}
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-semibold text-slate-950">Mô tả</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {productData.description || "Không có mô tả."}
            </p>
          </div>
        </div>
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-[#434655]">
                  Giá bán
                </p>
                <p className="mt-3 text-3xl font-bold text-[#004ac6]">
                  {currencyFormatter.format(productData.price || 0)}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-600">
                  Giá nhập: {currencyFormatter.format(productData.purchasePrice || 0)}
                </p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-xs uppercase tracking-widest text-[#434655]">
                  Trạng thái
                </p>
                <p className="font-semibold text-[#191b23]">
                  {productData.status === "HIDDEN" ? "Đang ẩn" : "Đang bán"}
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <RatingStars rating={averageRating} size="text-xl" />
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  {averageRating ? averageRating.toFixed(1) : "Chưa có"} / 5
                </p>
                <p className="text-xs text-slate-500">
                  {comments.length} đánh giá
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-semibold text-slate-950">
              Thông tin nhanh
            </p>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex justify-between gap-4">
                <span>Danh mục</span>
                <span className="font-semibold text-slate-950">
                  {productData.category?.name || "Chưa phân loại"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Tồn kho</span>
                <span className="font-semibold text-slate-950">
                  {productData.stockQuantity ?? 0}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Đã phát sinh đơn</span>
                <span className={`font-semibold ${orderHistoryTextClass}`}>
                  {orderHistoryLabel}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>ID sản phẩm</span>
                <span className="font-semibold text-slate-950">
                  PRD-{productData.id}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#434655]">
              Bình luận khách hàng
            </p>
            <h3 className="mt-2 text-xl font-extrabold text-[#191b23]">
              {totalComments > 0 ? "Phản hồi gần đây" : "Chưa có phản hồi"}
            </h3>
          </div>
          <span className="text-sm text-slate-500">
            {loading ? "Đang tải..." : `${totalComments} bình luận`}
          </span>
        </div>

        {/* Rating Distribution */}
        {ratingStats && totalComments > 0 && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start gap-6">
              <div className="flex flex-col items-center">
                <p className="text-4xl font-bold text-[#004ac6]">
                  {averageRating.toFixed(1)}
                </p>
                <div className="mt-2 flex gap-1">
                  <RatingStars rating={averageRating} size="text-lg" />
                </div>
                <p className="mt-2 text-xs font-medium text-slate-600">
                  {totalComments} đánh giá
                </p>
              </div>
              <div className="flex-1 space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = ratingStats[`ratingCount${star}Star`] || 0;
                  const percentage =
                    totalComments > 0 ? (count / totalComments) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="w-10 text-right text-sm font-medium text-slate-600">
                        {star} ★
                      </span>
                      <div className="h-2 flex-1 rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-yellow-400"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="w-12 text-right text-xs text-slate-500">
                        {count} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            Đang tải chi tiết sản phẩm...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            {error}
          </div>
        ) : comments.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            Chưa có bình luận nào cho sản phẩm này.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      Khách hàng #{comment.userId}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDateTime(comment.createdAt)}
                    </p>
                  </div>
                  <RatingStars rating={comment.rating} size="text-lg" />
                </div>
                <p className="text-sm leading-6 text-slate-600">
                  {comment.comment}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
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
          <button
            type="button"
            onClick={onClose}
            className="azure-button-muted"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isCategorySaving}
            className="azure-button"
          >
            {isCategorySaving ? "Đang lưu..." : "Lưu danh mục"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function RatingStars({ rating = 0, size = "text-lg" }) {
  const rounded = Math.round(Number(rating) || 0);
  return (
    <div className="flex items-center text-[#fd761a]">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`material-symbols-outlined ${size}`}
          style={{ fontVariationSettings: `'FILL' ${star <= rounded ? 1 : 0}` }}
        >
          star
        </span>
      ))}
    </div>
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
            <p className="font-extrabold">
              {isError ? "Có lỗi xảy ra" : "Thành công"}
            </p>
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
