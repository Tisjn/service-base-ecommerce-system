function trimTrailingSlash(url) {
  return String(url || "").replace(/\/+$/, "");
}

const config = {
  port: Number(process.env.PORT || process.env.API_GATEWAY_PORT || 8080),
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  authServiceUrl: trimTrailingSlash(
    process.env.AUTH_SERVICE_URL || "http://localhost:3001",
  ),
  userServiceUrl: trimTrailingSlash(
    process.env.USER_SERVICE_URL || "http://localhost:3002",
  ),
  productServiceUrl: trimTrailingSlash(
    process.env.PRODUCT_SERVICE_URL || "http://localhost:3003",
  ),
  orderServiceUrl: trimTrailingSlash(
    process.env.ORDER_SERVICE_URL || "http://localhost:3004",
  ),
  paymentServiceUrl: trimTrailingSlash(
    process.env.PAYMENT_SERVICE_URL || "http://localhost:3005",
  ),
  aiServiceUrl: trimTrailingSlash(
    process.env.AI_SERVICE_URL || "http://localhost:3009",
  ),
  chatServiceUrl: trimTrailingSlash(
    process.env.CHAT_SERVICE_URL || "http://localhost:3008",
  ),
};

const productApiPrefixes = [
  "/api/products",
  "/api/categories",
  "/api/product-images",
  "/api/inventory",
];

const orderApiPrefixes = ["/api/orders", "/api/admin/products"];
const aiApiPrefixes = ["/api/ai", "/api/admin/ai"];

module.exports = {
  config,
  productApiPrefixes,
  orderApiPrefixes,
  aiApiPrefixes,
};
