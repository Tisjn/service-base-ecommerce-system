import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProfile, updateProfile } from "../../api/authApi";
import { getUserAddresses } from "../../api/userApi";
import { getCategories, getProducts } from "../../api/productApi";
import orderApi from "../../api/orderApi";
import OrderToast from "./orders/components/OrderToast";
import OrderDetailModal from "../../components/OrderDetailModal";
import { useOrderNotifications } from "../../context/OrderNotificationContext";
import useOrderSocket from "../../hooks/useOrderSocket";
import OrderCartPage from "./orders/pages/OrderCartPage";
import OrderCatalogPage from "./orders/pages/OrderCatalogPage";
import OrderHistoryPage from "./orders/pages/OrderHistoryPage";
import ProductDetailSection from "./orders/components/ProductDetailSection";
import { getStatusLabel, sortOrdersNewestFirst } from "./orders/orderUtils";

function consolidateCartItems(items) {
  const map = new Map();
  (Array.isArray(items) ? items : []).forEach((item) => {
    const productId = item?.productId;
    const quantity = Number(item?.quantity) || 0;
    if (productId == null || quantity <= 0) {
      return;
    }

    const existing = map.get(productId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      map.set(productId, {
        productId,
        productName: item.productName || "",
        imageUrl: item.imageUrl || item.imageURL || null,
        price: Number(item.price) || 0,
        quantity,
      });
    }
  });
  return Array.from(map.values());
}

const emptyCheckout = {
  addressId: "",
  note: "",
};

const CUSTOMER_CATALOG_PAGE_SIZE = 9;
const CUSTOMER_ORDER_PAGE_SIZE = 9;

function resolveAccountCandidate(user) {
  if (!user) {
    return null;
  }

  return {
    ...user,
    id: user.id ?? user.userId ?? user.accountId ?? null,
  };
}

function resolveRole(user) {
  const rawRole =
    user?.role || user?.roles?.[0] || user?.authorities?.[0] || "";
  return String(rawRole).toUpperCase();
}

function getPathForTab(tab) {
  switch (tab) {
    case "cart":
      return "/customer/cart";
    case "history":
      return "/customer/orders";
    default:
      return "/customer/products";
  }
}

export default function CustomerOrderHubPage({ user, initialTab = "catalog" }) {
  const navigate = useNavigate();
  const [account, setAccount] = useState(resolveAccountCandidate(user));
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [adminOrders, setAdminOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const notifiedLoginUserRef = useRef(null);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [maxPrice, setMaxPrice] = useState(50000);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [catalogPage, setCatalogPage] = useState(0);
  const [catalogMeta, setCatalogMeta] = useState({
    page: 0,
    size: CUSTOMER_CATALOG_PAGE_SIZE,
    totalPages: 1,
    totalElements: 0,
  });
  const [orderPage, setOrderPage] = useState(0);
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");
  const [orderMeta, setOrderMeta] = useState({
    page: 0,
    size: CUSTOMER_ORDER_PAGE_SIZE,
    totalPages: 1,
    totalElements: 0,
  });
  const [checkout, setCheckout] = useState(emptyCheckout);
  const [notification, setNotification] = useState(null);
  const { openedOrderId, closeOrder } = useOrderNotifications() || {
    openedOrderId: null,
    closeOrder: () => {},
  };
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingProductId, setUpdatingProductId] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const isAdmin = resolveRole(account).includes("ADMIN");
  const userId = Number(account?.id || account?.userId || 0) || null;
  const customerOrderTopics = useMemo(
    () => (userId && !isAdmin ? [`/topic/users/${userId}/orders`] : []),
    [isAdmin, userId],
  );

  useEffect(() => {
    setAccount(resolveAccountCandidate(user));
  }, [user]);

  useEffect(() => {
    setActiveTab(initialTab || "catalog");
  }, [initialTab]);

  function navigateToTab(tab) {
    setActiveTab(tab);
    navigate(getPathForTab(tab));
  }

  const showNotification = useCallback((type, text) => {
    setNotification({ type, text });
  }, []);

  useEffect(() => {
    if (!notification) {
      return undefined;
    }

    const timer = window.setTimeout(() => setNotification(null), 3400);
    return () => window.clearTimeout(timer);
  }, [notification]);

  // admin-initiated open order handled by OrderNotificationContext.openOrder

  useEffect(() => {
    if (!userId) {
      const accessToken = localStorage.getItem("authToken");
      if (!accessToken) {
        return undefined;
      }

      let cancelled = false;

      getProfile(accessToken)
        .then((profile) => {
          if (cancelled) {
            return;
          }
          setAccount(resolveAccountCandidate(profile));
        })
        .catch(() => {
          // Keep browsing available even if profile lookup fails.
        });

      return () => {
        cancelled = true;
      };
    }

    return undefined;
  }, [userId]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await getCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      showNotification("error", error.message || "Không tải được danh mục");
    }
  }, [showNotification]);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const response = await getProducts({
        page: catalogPage,
        size: catalogMeta.size,
        search,
        categoryId: categoryId || undefined,
        maxPrice: maxPrice || undefined,
        status: "ACTIVE",
        sortBy,
        direction: sortDirection,
      });

      setProducts(response.content || []);
      setCatalogMeta((prev) => ({
        ...prev,
        page: response.number || 0,
        totalPages: response.totalPages || 1,
        totalElements: response.totalElements || 0,
      }));
    } catch (error) {
      showNotification("error", error.message || "Không tải được sản phẩm");
    } finally {
      setCatalogLoading(false);
    }
  }, [
    catalogMeta.size,
    catalogPage,
    categoryId,
    maxPrice,
    search,
    showNotification,
    sortBy,
    sortDirection,
  ]);

  const loadCart = useCallback(async () => {
    setCartLoading(true);
    try {
      const data = await orderApi.getCart();
      setCart(Array.isArray(data) ? data : []);
    } catch (error) {
      showNotification("error", error.message || "Không tải được giỏ hàng");
    } finally {
      setCartLoading(false);
    }
  }, [showNotification]);

  const loadOrders = useCallback(
    async (page = orderPage) => {
      if (!userId) {
        setOrders([]);
        return;
      }

      setOrdersLoading(true);
      try {
        const data = await orderApi.getOrdersByUser(userId, {
          page,
          size: CUSTOMER_ORDER_PAGE_SIZE,
          status: orderStatusFilter,
          direction: "desc",
        });
        const nextOrders = Array.isArray(data?.content)
          ? data.content
          : Array.isArray(data)
            ? sortOrdersNewestFirst(data)
            : [];
        setOrders(nextOrders);
        setOrderMeta({
          page: Number(data?.number ?? page) || 0,
          size:
            Number(data?.size ?? CUSTOMER_ORDER_PAGE_SIZE) ||
            CUSTOMER_ORDER_PAGE_SIZE,
          totalPages: Number(data?.totalPages ?? 1) || 1,
          totalElements: Number(data?.totalElements ?? nextOrders.length) || 0,
        });
      } catch (error) {
        showNotification("error", error.message || "Không tải được đơn hàng");
      } finally {
        setOrdersLoading(false);
      }
    },
    [orderPage, orderStatusFilter, userId, showNotification],
  );

  const applyOrderStatusUpdate = useCallback(
    (statusUpdate) => {
      const orderId = statusUpdate?.orderId || statusUpdate?.id;
      const nextStatus = statusUpdate?.status;
      if (!orderId || !nextStatus) {
        return;
      }

      let touchedVisibleOrder = false;
      setOrders((currentOrders) => {
        const nextOrders = currentOrders
          .map((order) => {
            if (String(order.orderId || order.id) !== String(orderId)) {
              return order;
            }

            touchedVisibleOrder = true;
            return {
              ...order,
              status: nextStatus,
              paymentStatus: statusUpdate.paymentStatus ?? order.paymentStatus,
              updatedAt: statusUpdate.updatedAt ?? order.updatedAt,
              completedAt: statusUpdate.completedAt ?? order.completedAt,
              cancelledAt: statusUpdate.cancelledAt ?? order.cancelledAt,
            };
          })
          .filter(
            (order) =>
              orderStatusFilter === "ALL" || order.status === orderStatusFilter,
          );

        return nextOrders;
      });

      if (touchedVisibleOrder) {
        showNotification(
          "success",
          `Đơn #${orderId} đã chuyển sang ${getStatusLabel(nextStatus)}.`,
        );
      }

      orderApi
        .getOrder(orderId)
        .then((freshOrder) => {
          setOrders((currentOrders) => {
            const exists = currentOrders.some(
              (order) =>
                String(order.orderId || order.id) ===
                String(freshOrder.orderId || freshOrder.id),
            );

            if (!exists) {
              return currentOrders;
            }

            return currentOrders.map((order) =>
              String(order.orderId || order.id) ===
              String(freshOrder.orderId || freshOrder.id)
                ? freshOrder
                : order,
            );
          });
        })
        .catch(() => {
          // The WebSocket payload already contains the changed status.
        });
    },
    [orderStatusFilter, showNotification],
  );

  useOrderSocket(userId && !isAdmin ? applyOrderStatusUpdate : null, {
    topics: customerOrderTopics,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("paymentStatus");
    const orderId = params.get("orderId");
    if (!paymentStatus || !orderId) {
      return;
    }

    setActiveTab("history");
    setOrderPage(0);
    loadOrders(0);
    showNotification(
      paymentStatus.toUpperCase() === "PAID" ? "success" : "error",
      paymentStatus.toUpperCase() === "PAID"
        ? `Thanh toán MoMo cho đơn #${orderId} thành công.`
        : `Thanh toán MoMo cho đơn #${orderId} chưa thành công.`,
    );

    const cleanUrl = `${window.location.pathname}${window.location.hash || ""}`;
    window.history.replaceState({}, "", cleanUrl);
  }, [loadOrders, showNotification]);

  const loadAddresses = useCallback(async () => {
    if (!userId) {
      setAddresses([]);
      return;
    }

    const accessToken = localStorage.getItem("authToken");
    if (!accessToken) {
      setAddresses([]);
      return;
    }

    try {
      const data = await getUserAddresses(accessToken);
      const nextAddresses = Array.isArray(data) ? data : [];
      setAddresses(nextAddresses);
      setCheckout((prev) => {
        if (prev.addressId || nextAddresses.length === 0) {
          return prev;
        }
        const defaultAddress =
          nextAddresses.find((address) => address.defaultAddress) ||
          nextAddresses[0];
        return { ...prev, addressId: String(defaultAddress.id) };
      });
    } catch (error) {
      showNotification(
        "error",
        error.message || "Không tải được địa chỉ giao hàng",
      );
    }
  }, [showNotification, userId]);

  const loadAdminOrders = useCallback(async () => {
    if (!isAdmin) {
      return;
    }

    setAdminLoading(true);
    try {
      const data = await orderApi.getAllOrders({
        page: 0,
        size: 10,
        direction: "desc",
      });
      const nextOrders = Array.isArray(data?.content)
        ? data.content
        : Array.isArray(data)
          ? sortOrdersNewestFirst(data)
          : [];
      setAdminOrders(nextOrders);
    } catch (error) {
      showNotification(
        "error",
        error.message || "Không tải được danh sách đơn hàng quản trị",
      );
    } finally {
      setAdminLoading(false);
    }
  }, [isAdmin, showNotification]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    let cancelled = false;

    const syncSessionCartAndLoad = async () => {
      if (!userId) {
        notifiedLoginUserRef.current = null;
        await loadCart();
        setOrders([]);
        return;
      }
      if (notifiedLoginUserRef.current !== userId) {
        try {
          const mergedCart = await orderApi.notifyCartOnLogin(userId);
          notifiedLoginUserRef.current = userId;
          if (!cancelled && Array.isArray(mergedCart)) {
            setCart(mergedCart);
          }
        } catch (error) {
          showNotification(
            "error",
            error.message || "Không đồng bộ được giỏ hàng.",
          );
        }
      }

      if (cancelled) {
        return;
      }

      // Always load cart/orders after merge or just on login
      await Promise.all([
        loadCart(),
        loadAddresses(),
        isAdmin ? loadAdminOrders() : Promise.resolve(),
      ]);
    };

    syncSessionCartAndLoad();

    return () => {
      cancelled = true;
    };
  }, [
    isAdmin,
    loadAdminOrders,
    loadAddresses,
    loadCart,
    showNotification,
    userId,
  ]);

  useEffect(() => {
    setOrderPage(0);
  }, [orderStatusFilter, userId]);

  useEffect(() => {
    loadOrders(orderPage);
  }, [loadOrders, orderPage]);

  const cartSummary = useMemo(() => {
    const itemCount = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const subtotal = cart.reduce(
      (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
      0,
    );
    const shipping = subtotal >= 500000 || subtotal <= 0 ? 0 : 10000;

    return {
      itemCount,
      subtotal,
      shipping,
      total: subtotal + shipping,
    };
  }, [cart]);

  const orderStats = useMemo(
    () => ({
      pending: orders.filter((order) => order.status === "PENDING").length,
      confirmed: orders.filter((order) => order.status === "CONFIRMED").length,
      shipped: orders.filter((order) => order.status === "SHIPPED").length,
      cancelled: orders.filter((order) => order.status === "CANCELLED").length,
    }),
    [orders],
  );

  const adminStats = useMemo(
    () => ({
      total: adminOrders.length,
      pending: adminOrders.filter((order) => order.status === "PENDING").length,
      confirmed: adminOrders.filter((order) => order.status === "CONFIRMED")
        .length,
      shipped: adminOrders.filter((order) => order.status === "SHIPPED").length,
      delivered: adminOrders.filter((order) => order.status === "DELIVERED")
        .length,
    }),
    [adminOrders],
  );

  async function handleAddToCart(product) {
    setUpdatingProductId(product.id);
    try {
      await orderApi.addCartItem({
        productId: product.id,
        productName: product.name,
        quantity: 1,
        price: product.price,
        imageUrl: product.imageUrl || product.imageURL || null,
      });
      showNotification("success", `Đã thêm ${product.name} vào giỏ hàng.`);
      navigateToTab("cart");
      loadCart().catch((error) => {
        showNotification(
          "error",
          error.message || "Đã thêm sản phẩm nhưng chưa tải lại được giỏ hàng",
        );
      });
    } catch (error) {
      showNotification("error", error.message || "Không thêm được sản phẩm");
    } finally {
      setUpdatingProductId(null);
    }
  }

  function handleViewProduct(product) {
    setSelectedProduct(product);
    setActiveTab("product-detail");
  }

  async function handleQuantityChange(productId, quantity) {
    setUpdatingProductId(productId);
    try {
      await orderApi.updateCartItem(productId, quantity);
      await loadCart();
    } catch (error) {
      showNotification("error", error.message || "Không cập nhật được giỏ");
    } finally {
      setUpdatingProductId(null);
    }
  }

  async function handleRemoveFromCart(productId) {
    setUpdatingProductId(productId);
    try {
      await orderApi.removeCartItem(productId);
      await loadCart();
      showNotification("success", "Đã xóa sản phẩm khỏi giỏ hàng.");
    } catch (error) {
      showNotification("error", error.message || "Không xóa được sản phẩm");
    } finally {
      setUpdatingProductId(null);
    }
  }

  async function handleCheckout(event, options = {}) {
    event.preventDefault();

    const paymentMethod = options.paymentMethod || "COD";

    if (!userId) {
      showNotification("error", "Không tìm thấy thông tin người dùng.");
      return;
    }

    if (!checkout.addressId) {
      showNotification("error", "Vui lòng chọn địa chỉ giao hàng.");
      return;
    }

    if (cart.length === 0) {
      showNotification("error", "Giỏ hàng đang trống.");
      return;
    }

    setSubmitting(true);
    try {
      const order = await orderApi.createOrder({
        addressId: Number(checkout.addressId),
        paymentMethod: paymentMethod.toUpperCase(),
        note: checkout.note?.trim() || null,
        customerEmail: account?.email || user?.email || null,
      });

      if (order?.paymentUrl) {
        window.location.href = order.paymentUrl;
        return;
      }

      showNotification(
        "success",
        `Đã tạo đơn hàng #${order?.orderCode || order?.orderId || "mới"}. Thanh toán ${
          paymentMethod.toUpperCase() === "COD"
            ? "khi nhận hàng"
            : paymentMethod
        }, trạng thái hiện tại: ${getStatusLabel(order?.status || "PENDING")}.`,
      );
      navigateToTab("history");
      setOrderPage(0);
      await Promise.all([loadOrders(0), loadCart(), loadCatalog()]);
    } catch (error) {
      showNotification("error", error.message || "Không tạo được đơn hàng");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelOrder(orderId) {
    if (!window.confirm("Bạn có muốn hủy đơn hàng này không?")) {
      return;
    }

    setUpdatingOrderId(orderId);
    try {
      await orderApi.cancelOrder(orderId, "Customer cancelled");
      await Promise.all([loadOrders(orderPage), loadCatalog()]);
      if (isAdmin) {
        await loadAdminOrders();
      }
      showNotification("success", "Đã gửi yêu cầu hủy đơn hàng.");
    } catch (error) {
      showNotification("error", error.message || "Không hủy được đơn hàng");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function handleUpdateOrderStatus(orderId, status) {
    setUpdatingOrderId(orderId);
    try {
      await orderApi.updateOrderStatus(orderId, status);
      await loadAdminOrders();
      showNotification("success", `Đã cập nhật trạng thái đơn #${orderId}.`);
    } catch (error) {
      showNotification(
        "error",
        error.message || "Không cập nhật được trạng thái",
      );
    } finally {
      setUpdatingOrderId(null);
    }
  }

  const pageTabs = [
    { id: "catalog", label: "Danh mục" },
    { id: "cart", label: "Giỏ hàng" },
    { id: "history", label: "Lịch sử" },
  ];

  const handleSaveShippingAddress = useCallback(
    async (shippingAddress) => {
      if (!shippingAddress?.trim()) {
        return;
      }

      const accessToken = localStorage.getItem("authToken");
      if (!accessToken) {
        showNotification("error", "Không tìm thấy token xác thực.");
        return;
      }

      try {
        const updated = await updateProfile(accessToken, {
          shippingAddress: shippingAddress.trim(),
        });
        setAccount(resolveAccountCandidate(updated));
        showNotification("success", "Đã lưu địa chỉ giao hàng.");
      } catch (error) {
        showNotification(
          "error",
          error.message || "Không lưu được địa chỉ giao hàng.",
        );
      }
    },
    [showNotification],
  );

  const activePage = (() => {
    switch (activeTab) {
      case "cart":
        return (
          <OrderCartPage
            account={account}
            userId={userId}
            products={products}
            cartLoading={cartLoading}
            cart={cart}
            checkout={checkout}
            setCheckout={setCheckout}
            addresses={addresses}
            onReloadAddresses={loadAddresses}
            onQuantityChange={handleQuantityChange}
            onRemoveFromCart={handleRemoveFromCart}
            onCheckout={handleCheckout}
            submitting={submitting}
            cartSummary={cartSummary}
          />
        );
      case "history":
        return (
          <OrderHistoryPage
            userId={userId}
            products={products}
            ordersLoading={ordersLoading}
            orders={orders}
            orderMeta={orderMeta}
            statusFilter={orderStatusFilter}
            onStatusFilterChange={setOrderStatusFilter}
            onPageChange={setOrderPage}
            orderStats={orderStats}
            onCancelOrder={handleCancelOrder}
            updatingOrderId={updatingOrderId}
          />
        );
      case "product-detail":
        return (
          <ProductDetailSection
            product={selectedProduct}
            userId={userId}
            updatingProductId={updatingProductId}
            onBack={() => navigateToTab("catalog")}
            onAddToCart={handleAddToCart}
          />
        );
      case "catalog":
      default:
        return (
          <OrderCatalogPage
            products={products}
            categories={categories}
            catalogLoading={catalogLoading}
            search={search}
            setSearch={setSearch}
            categoryId={categoryId}
            setCategoryId={setCategoryId}
            catalogMeta={catalogMeta}
            setCatalogPage={setCatalogPage}
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onToggleSort={() => {
              setCatalogPage(0);
              if (sortBy === "createdAt") {
                setSortBy("price");
                setSortDirection("asc");
                return;
              }
              if (sortBy === "price" && sortDirection === "asc") {
                setSortDirection("desc");
                return;
              }
              setSortBy("createdAt");
              setSortDirection("desc");
            }}
            updatingProductId={updatingProductId}
            onAddToCart={handleAddToCart}
            onViewProduct={handleViewProduct}
          />
        );
    }
  })();

  return (
    <div className="space-y-8 w-full px-4 py-6 sm:px-6 lg:px-8">
      <section className="w-full max-w-7xl mx-auto">
        <div className="space-y-6 rounded-4xl border border-white/70 bg-white/95 p-6 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.3)]">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-4">
            {pageTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => navigateToTab(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-orange-600 text-white shadow-lg shadow-orange-500/20"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {activePage}
        </div>
      </section>

      <OrderToast
        notification={notification}
        onClose={() => setNotification(null)}
      />
      {openedOrderId && (
        <OrderDetailModal
          orderId={openedOrderId}
          onClose={() => {
            closeOrder();
            try {
              window.history.pushState({}, "", "/");
              window.dispatchEvent(new PopStateEvent("popstate"));
            } catch {
              // ignore
            }
          }}
        />
      )}
    </div>
  );
}
