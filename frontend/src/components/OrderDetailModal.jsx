import React, { useCallback, useEffect, useMemo, useState } from "react";
import orderApi from "../api/orderApi";
import useOrderSocket from "../hooks/useOrderSocket";

export default function OrderDetailModal({ orderId, onClose }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const orderTopics = useMemo(
    () => (orderId ? [`/topic/orders/${orderId}`] : []),
    [orderId],
  );

  const handleOrderStatusUpdate = useCallback(
    (statusUpdate) => {
      const updateOrderId = statusUpdate?.orderId || statusUpdate?.id;
      if (String(updateOrderId) !== String(orderId)) return;

      setOrder((current) =>
        current
          ? {
              ...current,
              status: statusUpdate.status ?? current.status,
              paymentStatus: statusUpdate.paymentStatus ?? current.paymentStatus,
              updatedAt: statusUpdate.updatedAt ?? current.updatedAt,
              completedAt: statusUpdate.completedAt ?? current.completedAt,
              cancelledAt: statusUpdate.cancelledAt ?? current.cancelledAt,
            }
          : current,
      );
    },
    [orderId],
  );

  useOrderSocket(orderId ? handleOrderStatusUpdate : null, {
    topics: orderTopics,
  });

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    orderApi
      .getOrder(orderId)
      .then((data) => {
        if (!cancelled) setOrder(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Không tải được đơn");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (!orderId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#00000066] px-4 py-6">
      <div className="w-full max-w-3xl rounded-xl bg-white p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Chi tiết đơn #{orderId}</h3>
          <button onClick={onClose} className="text-sm text-slate-500">
            Đóng
          </button>
        </div>
        <div className="mt-4">
          {loading ? (
            <div>Đang tải...</div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : order ? (
            <div className="space-y-4">
              <div className="text-sm text-slate-700">
                Khách hàng: User #{order.userId}
              </div>
              <div className="text-sm text-slate-700">
                Ngày tạo: {new Date(order.createdAt).toLocaleString()}
              </div>
              <div className="text-sm text-slate-700">
                Tổng:{" "}
                {new Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                }).format(order.finalAmount || order.totalAmount || 0)}
              </div>
              <div className="mt-3 rounded-md border bg-slate-50 p-3">
                <div className="font-semibold">Địa chỉ giao</div>
                <div className="text-sm text-slate-700">
                  {order.addressId ? `Address #${order.addressId}` : order.shippingAddress || "-"}
                </div>
              </div>
              <div>
                <h4 className="font-semibold">Sản phẩm</h4>
                <div className="mt-2 grid gap-2">
                  {(order.items || []).map((it) => (
                    <div
                      key={`${order.orderId}-${it.productId}`}
                      className="flex items-center justify-between rounded-md border p-2"
                    >
                      <div>
                        <div className="font-semibold">{it.productName}</div>
                        <div className="text-xs text-slate-600">
                          SL {it.quantity}
                        </div>
                      </div>
                      <div className="text-sm">
                        {new Intl.NumberFormat("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        }).format(it.price || 0)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div>Không có dữ liệu</div>
          )}
        </div>
      </div>
    </div>
  );
}
