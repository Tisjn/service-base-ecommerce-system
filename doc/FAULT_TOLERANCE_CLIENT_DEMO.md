# Fault Tolerance And Client Rate Limit Demo

This document maps the implemented frontend behavior to the grading rubric.

## Retry 3-5s For One Service API

Implemented in `frontend/src/api/orderApi.js`.

- Target service API: order-service through API Gateway
- Covered calls: order `GET`/`HEAD` requests such as:
  - `GET /api/orders`
  - `GET /api/orders/{orderId}`
  - `GET /api/orders/user/{userId}`
- Attempts: `3`
- Delay between attempts: `3000ms`
- Retry condition: network failure or HTTP `5xx`

Code constants:

```js
const ORDER_GET_RETRY_ATTEMPTS = 3;
const ORDER_GET_RETRY_DELAY_MS = 3000;
```

## Client Rate Limiter For One Service API

Implemented in `frontend/src/api/orderApi.js`.

- Target action: `POST /api/orders`
- User-facing workflow: checkout / create order / create payment
- Limit: one create-order attempt every `5000ms` in the browser tab
- Purpose: prevent repeated double-click checkout and accidental payment/order spam

Code constant:

```js
const ORDER_MUTATION_RATE_LIMIT_MS = 5000;
```

When the user submits again too quickly, the client throws a clear message:

```text
Vui long doi Ns truoc khi tao don/thanh toan tiep.
```

## Rubric Mapping

- Fault Tolerance: retry 3-5s for one service API
- Fault Tolerance: client-side rate limiter for one service API
