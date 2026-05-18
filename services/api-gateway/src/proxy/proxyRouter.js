const { createProxyMiddleware } = require("http-proxy-middleware");
const {
  config,
  productApiPrefixes,
  orderApiPrefixes,
} = require("../config/routes.config");
const { verifyJWT, optionalVerifyJWT } = require("../middlewares/jwtVerify");
const logger = require("../utils/logger");

function isWriteRequest(req) {
  return !["GET", "HEAD", "OPTIONS"].includes(req.method);
}

function requireAuthForWrites(req, res, next) {
  const path = req.originalUrl.split("?")[0];
  const isGuestCompatibleProductPath =
    path.startsWith("/api/cart") ||
    path.startsWith("/cart") ||
    path.startsWith("/api/inventory") ||
    path.startsWith("/inventory");

  if (!isWriteRequest(req) || isGuestCompatibleProductPath) {
    optionalVerifyJWT(req, res, next);
    return;
  }

  verifyJWT(req, res, next);
}

function requireOrderAuth(req, res, next) {
  const path = req.originalUrl.split("?")[0];
  const isPublicCommentRead =
    req.method === "GET" &&
    (/^\/api\/orders\/products\/[^/]+\/details$/.test(path) ||
      /^\/orders\/products\/[^/]+\/details$/.test(path) ||
      /^\/api\/admin\/products\/[^/]+\/details-with-comments$/.test(path) ||
      /^\/admin\/products\/[^/]+\/details-with-comments$/.test(path));

  if (isPublicCommentRead) {
    return next();
  }

  verifyJWT(req, res, next);
}

function createProxy(target, options = {}) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    ws: Boolean(options.ws),
    logLevel: "warn",
    pathRewrite: options.pathRewrite,
    onError(error, req, res) {
      logger.error(
        `Proxy error ${req.method} ${req.originalUrl} -> ${target}: ${error.message}`,
      );

      if (!res.headersSent) {
        res.status(502).json({
          error: "Bad gateway",
          target,
          message: error.message,
        });
      }
    },
  });
}

function rewriteAuth(_path, req) {
  return req.originalUrl.replace(/^\/api\/auth(?=\/|$)/, "/auth");
}

function rewriteProduct(_path, req) {
  const originalUrl = req.originalUrl;

  if (originalUrl.startsWith("/api/")) {
    return originalUrl;
  }

  return originalUrl
    .replace(/^\/products(?=\/|$)/, "/api/products")
    .replace(/^\/categories(?=\/|$)/, "/api/categories")
    .replace(/^\/cart(?=\/|$)/, "/api/cart")
    .replace(/^\/product-images(?=\/|$)/, "/api/product-images")
    .replace(/^\/inventory(?=\/|$)/, "/api/inventory");
}

function rewriteOrder(_path, req) {
  const originalUrl = req.originalUrl;

  if (originalUrl.startsWith("/api/")) {
    return originalUrl;
  }

  return originalUrl
    .replace(/^\/orders(?=\/|$)/, "/api/orders")
    .replace(/^\/admin\/products(?=\/|$)/, "/api/admin/products");
}

function rewriteChat(_path, req) {
  return req.originalUrl.replace(/^\/api\/chat(?=\/|$)/, "/chat");
}

function keepOriginalUrl(_path, req) {
  return req.originalUrl;
}

function rewriteUser(_path, req) {
  return req.originalUrl.replace(/^\/users(?=\/|$)/, "/api/users");
}

function rewritePayment(_path, req) {
  return req.originalUrl.replace(/^\/payments(?=\/|$)/, "/api/payments");
}

function setupProxyRoutes(app) {
  const authProxy = createProxy(config.authServiceUrl, {
    pathRewrite: rewriteAuth,
  });

  const productProxy = createProxy(config.productServiceUrl, {
    pathRewrite: rewriteProduct,
  });

  const orderProxy = createProxy(config.orderServiceUrl, {
    pathRewrite: rewriteOrder,
  });

  const chatProxy = createProxy(config.chatServiceUrl, {
    ws: true,
    pathRewrite: rewriteChat,
  });

  const userProxy = createProxy(config.userServiceUrl, {
    pathRewrite: rewriteUser,
  });

  const paymentProxy = createProxy(config.paymentServiceUrl, {
    pathRewrite: rewritePayment,
  });

  app.use(["/auth", "/api/auth"], authProxy);
  app.use(["/users", "/api/users"], verifyJWT, userProxy);
  app.use(productApiPrefixes, requireAuthForWrites, productProxy);
  app.use(
    ["/products", "/categories", "/cart", "/product-images", "/inventory"],
    requireAuthForWrites,
    productProxy,
  );
  app.use(orderApiPrefixes, requireOrderAuth, orderProxy);
  app.use(["/orders", "/admin/products"], requireOrderAuth, orderProxy);
  app.use(["/payments", "/api/payments"], verifyJWT, paymentProxy);
  app.use(["/chat", "/api/chat"], verifyJWT, chatProxy);
  app.use(["/uploads"], chatProxy);
  app.use(
    ["/ws"],
    createProxy(config.orderServiceUrl, {
      ws: true,
      pathRewrite: keepOriginalUrl,
    }),
  );
  app.use(
    ["/socket.io"],
    createProxy(config.chatServiceUrl, {
      ws: true,
      pathRewrite: keepOriginalUrl,
    }),
  );
}

function createSocketProxy() {
  return createProxyMiddleware({
    target: config.chatServiceUrl,
    changeOrigin: true,
    ws: true,
    router(req) {
      if (req.url.startsWith("/ws")) {
        return config.orderServiceUrl;
      }

      return config.chatServiceUrl;
    },
  });
}

module.exports = {
  setupProxyRoutes,
  createSocketProxy,
};
