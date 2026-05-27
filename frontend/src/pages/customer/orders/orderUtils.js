export const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export const orderStatusOptions = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

export const orderStatusSteps = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
];

export function getOrderBadgeClass(status) {
  switch (status) {
    case "CONFIRMED":
      return "bg-emerald-100 text-emerald-700";
    case "PROCESSING":
      return "bg-orange-100 text-orange-700";
    case "SHIPPED":
      return "bg-indigo-100 text-indigo-700";
    case "DELIVERED":
      return "bg-violet-100 text-violet-700";
    case "CANCELLED":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-amber-100 text-amber-700";
  }
}

export function getStatusLabel(status) {
  switch (status) {
    case "PENDING":
      return "Chờ xác nhận";
    case "CONFIRMED":
      return "Đã xác nhận";
    case "PROCESSING":
      return "Đang xử lý";
    case "SHIPPED":
      return "Đang giao";
    case "DELIVERED":
      return "Đã giao";
    case "CANCELLED":
      return "Đã hủy";
    default:
      return status || "Không rõ";
  }
}

export function formatDateTime(value) {
  if (!value) {
    return "Chưa có dữ liệu";
  }

  const normalizedValue =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value)
      ? `${value}Z`
      : value;
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) {
    return "Chưa có dữ liệu";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function canCustomerCancel(order) {
  return order?.status === "PENDING";
}

export function sortOrdersNewestFirst(orders) {
  return [...orders].sort((left, right) => {
    const leftTime = new Date(left.createdAt || 0).getTime() || 0;
    const rightTime = new Date(right.createdAt || 0).getTime() || 0;
    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }
    return (right.orderId || 0) - (left.orderId || 0);
  });
}
