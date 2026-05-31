const { createProxyMiddleware } = require("http-proxy-middleware");
const {
  config,
  productApiPrefixes,
  orderApiPrefixes,
  aiApiPrefixes,
} = require("../config/routes.config");
const { verifyJWT, optionalVerifyJWT } = require("../middlewares/jwtVerify");
const logger = require("../utils/logger");

function isWriteRequest(req) {
  return !["GET", "HEAD", "OPTIONS"].includes(req.method);
}

function requireAuthForWrites(req, res, next) {
  const path = getRequestUrl(req).split("?")[0];
  const isGuestCompatibleProductPath =
    path.startsWith("/api/inventory") ||
    path.startsWith("/inventory");

  if (!isWriteRequest(req) || isGuestCompatibleProductPath) {
    optionalVerifyJWT(req, res, next);
    return;
  }

  verifyJWT(req, res, next);
}

function requireOrderAuth(req, res, next) {
  const path = getRequestUrl(req).split("?")[0];
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
    onProxyReq(proxyReq) {
      proxyReq.removeHeader("origin");
    },
    onProxyReqWs(proxyReq) {
      proxyReq.removeHeader("origin");
    },
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

function getRequestUrl(req) {
  return req.originalUrl || req.url || "";
}

function rewriteAuth(_path, req) {
  return getRequestUrl(req).replace(/^\/api\/auth(?=\/|$)/, "/auth");
}

function rewriteProduct(_path, req) {
  const originalUrl = getRequestUrl(req);

  if (originalUrl.startsWith("/api/")) {
    return originalUrl;
  }

  return originalUrl
    .replace(/^\/products(?=\/|$)/, "/api/products")
    .replace(/^\/categories(?=\/|$)/, "/api/categories")
    .replace(/^\/product-images(?=\/|$)/, "/api/product-images")
    .replace(/^\/inventory(?=\/|$)/, "/api/inventory");
}

function rewriteOrder(_path, req) {
  const originalUrl = getRequestUrl(req);

  if (originalUrl.startsWith("/api/")) {
    return originalUrl;
  }

  return originalUrl
    .replace(/^\/cart(?=\/|$)/, "/api/cart")
    .replace(/^\/orders(?=\/|$)/, "/api/orders")
    .replace(/^\/admin\/products(?=\/|$)/, "/api/admin/products");
}

function rewriteChat(_path, req) {
  return getRequestUrl(req).replace(/^\/api\/chat(?=\/|$)/, "/chat");
}

function rewriteAi(_path, req) {
  const originalUrl = getRequestUrl(req);

  if (originalUrl.startsWith("/api/")) {
    return originalUrl;
  }

  return originalUrl.replace(/^\/ai(?=\/|$)/, "/api/ai");
}

function keepOriginalUrl(_path, req) {
  return getRequestUrl(req);
}

function rewriteUser(_path, req) {
  return getRequestUrl(req).replace(/^\/users(?=\/|$)/, "/api/users");
}

function rewritePayment(_path, req) {
  return getRequestUrl(req).replace(/^\/api\/payments(?=\/|$)/, "/payments");
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

  const aiProxy = createProxy(config.aiServiceUrl, {
    pathRewrite: rewriteAi,
  });

  app.use(["/auth", "/api/auth"], authProxy);
  app.use(["/users", "/api/users"], verifyJWT, userProxy);
  app.use(["/cart", "/api/cart"], optionalVerifyJWT, orderProxy);
  app.use(productApiPrefixes, requireAuthForWrites, productProxy);
  app.use(
    ["/products", "/categories", "/product-images", "/inventory"],
    requireAuthForWrites,
    productProxy,
  );
  app.use(orderApiPrefixes, requireOrderAuth, orderProxy);
  app.use(["/orders", "/admin/products"], requireOrderAuth, orderProxy);
  app.use(
    [
      "/payments/return/momo",
      "/api/payments/return/momo",
      "/payments/webhook/momo",
      "/api/payments/webhook/momo",
    ],
    paymentProxy,
  );
  app.use(["/payments", "/api/payments"], verifyJWT, paymentProxy);
  app.use(aiApiPrefixes, verifyJWT, aiProxy);
  app.use(["/ai"], verifyJWT, aiProxy);
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
  const orderSocketProxy = createProxyMiddleware({
    target: config.orderServiceUrl,
    changeOrigin: true,
    ws: true,
    onProxyReqWs(proxyReq) {
      proxyReq.removeHeader("origin");
    },
  });

  const chatSocketProxy = createProxyMiddleware({
    target: config.chatServiceUrl,
    changeOrigin: true,
    ws: true,
    onProxyReqWs(proxyReq) {
      proxyReq.removeHeader("origin");
    },
  });

  return {
    upgrade(req, socket, head) {
      if (req.url.startsWith("/ws")) {
        orderSocketProxy.upgrade(req, socket, head);
        return;
      }

      chatSocketProxy.upgrade(req, socket, head);
    },
  };
}

module.exports = {
  setupProxyRoutes,
  createSocketProxy,
};
