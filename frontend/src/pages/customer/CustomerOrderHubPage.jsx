import { useCallback, useEffect, useMemo, useState } from "react";
import { getProfile, updateProfile } from "../../api/authApi";
import { getCategories, getProducts } from "../../api/productApi";
import orderApi from "../../api/orderApi";
import OrderToast from "./orders/components/OrderToast";
import OrderDetailModal from "../../components/OrderDetailModal";
import { useOrderNotifications } from "../../context/OrderNotificationContext";
import OrderCartPage from "./orders/pages/OrderCartPage";
import OrderCatalogPage from "./orders/pages/OrderCatalogPage";
import OrderHistoryPage from "./orders/pages/OrderHistoryPage";
import ProductDetailSection from "./orders/components/ProductDetailSection";
import { getStatusLabel, sortOrdersNewestFirst } from "./orders/orderUtils";

const GUEST_TOKEN_KEY = "guestToken";

function getGuestToken() {
  let token = localStorage.getItem(GUEST_TOKEN_KEY);
  if (!token) {
    token = orderApi.generateGuestToken();
    localStorage.setItem(GUEST_TOKEN_KEY, token);
  }
  return token;
}

function clearGuestToken() {
  localStorage.removeItem(GUEST_TOKEN_KEY);
}

function syncGuestTokenFromStorage() {
  return localStorage.getItem(GUEST_TOKEN_KEY) || null;
}

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
  shippingAddress: "",
};

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

export default function CustomerOrderHubPage({ user }) {
  const [account, setAccount] = useState(resolveAccountCandidate(user));
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [adminOrders, setAdminOrders] = useState([]);
  const [guestToken, setGuestToken] = useState(() => {
    const token = getGuestToken();
    localStorage.setItem(GUEST_TOKEN_KEY, token);
    return token;
  });
  const [activeTab, setActiveTab] = useState("catalog");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [maxPrice, setMaxPrice] = useState(50000);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [catalogPage, setCatalogPage] = useState(0);
  const [catalogMeta, setCatalogMeta] = useState({
    page: 0,
    size: 8,
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

  useEffect(() => {
    setAccount(resolveAccountCandidate(user));
  }, [user]);

  const showNotification = useCallback((type, text) => {
    setNotification({ type, text });
  }, []);

  useEffect(() => {
    if (account?.shippingAddress && !checkout.shippingAddress) {
      setCheckout({ shippingAddress: account.shippingAddress });
    }
  }, [account, checkout.shippingAddress]);

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
      if (!userId) {
        // Guest: use guestToken to load cart from server
        const token = guestToken || getGuestToken();
        if (!guestToken) {
          setGuestToken(token);
        }
        const data = await orderApi.getCart("guest", token);
        setCart(Array.isArray(data) ? data : []);
        return;
      }

      // Authenticated user: load cart from server
      const data = await orderApi.getCart(userId);
      setCart(Array.isArray(data) ? data : []);
    } catch (error) {
      showNotification("error", error.message || "Không tải được giỏ hàng");
    } finally {
      setCartLoading(false);
    }
  }, [userId, guestToken, showNotification]);

  const loadOrders = useCallback(async () => {
    if (!userId) {
      return;
    }

    setOrdersLoading(true);
    try {
      const data = await orderApi.getOrdersByUser(userId);
      setOrders(Array.isArray(data) ? sortOrdersNewestFirst(data) : []);
    } catch (error) {
      showNotification("error", error.message || "Không tải được đơn hàng");
    } finally {
      setOrdersLoading(false);
    }
  }, [userId, showNotification]);

  const loadAdminOrders = useCallback(async () => {
    if (!isAdmin) {
      return;
    }

    setAdminLoading(true);
    try {
      const data = await orderApi.getAllOrders();
      setAdminOrders(Array.isArray(data) ? sortOrdersNewestFirst(data) : []);
    } catch (error) {
      showNotification(
        "error",
        error.message || "Không tải được danh sách đơn hàng quản trị",
      );
    } finally {
      setAdminLoading(false);
    }
  }, [isAdmin, showNotification]);

  const mergeGuestCartToServer = useCallback(async () => {
    if (!guestToken) {
      return true; // No guest token, nothing to merge
    }

    try {
      await orderApi.mergeGuestCart(guestToken);
      console.log("Guest cart merged successfully");
      return true; // Success
    } catch (error) {
      console.error("Failed to merge guest cart:", error);
      return false; // Failed but don't throw
    }
  }, [guestToken]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    let cancelled = false;

    const syncGuestCartAndLoad = async () => {
      if (!userId) {
        // Guest: load cart will handle guestToken
        await loadCart();
        setOrders([]);
        return;
      }

      // User logged in: merge guest cart if token exists
      if (guestToken) {
        const mergeSuccess = await mergeGuestCartToServer();
        if (mergeSuccess) {
          clearGuestToken();
          setGuestToken(null);
          showNotification(
            "success",
            "Giỏ hàng khách đã được đồng bộ vào tài khoản của bạn.",
          );
        } else {
          if (!cancelled) {
            console.error("Failed to merge guest cart");
            showNotification("error", "Không đồng bộ được giỏ hàng khách.");
          }
        }
      }

      if (cancelled) {
        return;
      }

      // Always load cart/orders after merge or just on login
      await Promise.all([
        loadCart(),
        loadOrders(),
        isAdmin ? loadAdminOrders() : Promise.resolve(),
      ]);
    };

    syncGuestCartAndLoad();

    return () => {
      cancelled = true;
    };
  }, [
    isAdmin,
    guestToken,
    loadAdminOrders,
    loadCart,
    loadOrders,
    mergeGuestCartToServer,
    showNotification,
    userId,
  ]);

  const cartSummary = useMemo(() => {
    const itemCount = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const subtotal = cart.reduce(
      (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
      0,
    );

    return {
      itemCount,
      subtotal,
      shipping: subtotal > 0 ? 0 : 0,
      total: subtotal,
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
      if (!userId) {
        // Guest: add to server cart with guestToken
        const token = guestToken || getGuestToken();
        if (!guestToken) {
          setGuestToken(token);
        }
        await orderApi.addCartItem(
          "guest",
          {
            productId: product.id,
            productName: product.name,
            quantity: 1,
            price: product.price,
            imageUrl: product.imageUrl || product.imageURL || null,
          },
          token,
        );
        await loadCart(); // Reload cart from server
        showNotification("success", `Đã thêm ${product.name} vào giỏ hàng.`);
        setActiveTab("cart");
        return;
      }

      await orderApi.addCartItem(userId, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        price: product.price,
        imageUrl: product.imageUrl || product.imageURL || null,
      });
      showNotification("success", `Đã thêm ${product.name} vào giỏ hàng.`);
      setActiveTab("cart");
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
    if (!userId) {
      // Guest: update on server
      const token = guestToken || getGuestToken();
      if (!guestToken) {
        setGuestToken(token);
      }
      setUpdatingProductId(productId);
      try {
        await orderApi.updateCartItem("guest", productId, quantity, token);
        await loadCart();
      } catch (error) {
        showNotification("error", error.message || "Không cập nhật được giỏ");
      } finally {
        setUpdatingProductId(null);
      }
      return;
    }

    setUpdatingProductId(productId);
    try {
      await orderApi.updateCartItem(userId, productId, quantity);
      await loadCart();
    } catch (error) {
      showNotification("error", error.message || "Không cập nhật được giỏ");
    } finally {
      setUpdatingProductId(null);
    }
  }

  async function handleRemoveFromCart(productId) {
    if (!userId) {
      // Guest: remove from server
      const token = guestToken || getGuestToken();
      if (!guestToken) {
        setGuestToken(token);
      }
      setUpdatingProductId(productId);
      try {
        await orderApi.removeCartItem("guest", productId, token);
        await loadCart();
        showNotification("success", "Đã xóa sản phẩm khỏi giỏ hàng.");
      } catch (error) {
        showNotification("error", error.message || "Không xóa được sản phẩm");
      } finally {
        setUpdatingProductId(null);
      }
      return;
    }

    setUpdatingProductId(productId);
    try {
      await orderApi.removeCartItem(userId, productId);
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

    const paymentMethod = options.paymentMethod || "cod";
    const saveAddress = Boolean(options.saveAddress);

    if (!userId) {
      showNotification("error", "Không tìm thấy thông tin người dùng.");
      return;
    }

    if (!checkout.shippingAddress.trim()) {
      showNotification("error", "Vui lòng nhập địa chỉ giao hàng.");
      return;
    }

    if (cart.length === 0) {
      showNotification("error", "Giỏ hàng đang trống.");
      return;
    }

    setSubmitting(true);
    try {
      if (saveAddress && checkout.shippingAddress.trim()) {
        await handleSaveShippingAddress(checkout.shippingAddress.trim());
      }

      const order = await orderApi.createOrder(userId, {
        shippingAddress: checkout.shippingAddress.trim(),
        paymentMethod,
      });

      showNotification(
        "success",
        `Đã tạo đơn hàng #${order?.orderId || "mới"}. Thanh toán ${
          paymentMethod === "cod" ? "khi nhận hàng" : paymentMethod
        }, trạng thái hiện tại: ${getStatusLabel(order?.status || "PENDING")}.`,
      );
      setActiveTab("history");
      await Promise.all([loadOrders(), loadCart(), loadCatalog()]);
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
      await Promise.all([loadOrders(), loadCatalog()]);
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
            guestToken={guestToken}
            products={products}
            cartLoading={cartLoading}
            cart={cart}
            checkout={checkout}
            setCheckout={setCheckout}
            onQuantityChange={handleQuantityChange}
            onRemoveFromCart={handleRemoveFromCart}
            onCheckout={handleCheckout}
            onSaveShippingAddress={handleSaveShippingAddress}
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
            onBack={() => setActiveTab("catalog")}
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
                onClick={() => setActiveTab(tab.id)}
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
