import { useState, useEffect } from "react";
import orderApi from "../../../api/orderApi";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function formatDateTime(date) {
  if (!date) return "";
  try {
    const d = new Date(date);
    return d.toLocaleDateString("vi-VN") + " " + d.toLocaleTimeString("vi-VN");
  } catch (e) {
    return String(date);
  }
}

function RatingBar({ count, total, percentage }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 text-right text-sm font-medium text-slate-600">
        {count}
      </span>
      <div className="h-2 flex-1 rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-orange-500"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <span className="w-8 text-right text-xs text-slate-500">
        {percentage.toFixed(0)}%
      </span>
    </div>
  );
}

export default function ProductDetailModal({ productId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!productId) return;

    const loadDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await orderApi.getProductDetailWithComments(productId);
        setDetail(data);
      } catch (err) {
        setError(err.message || "Không thể tải chi tiết sản phẩm");
        console.error("Error loading product detail:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDetail();
  }, [productId]);

  if (!productId) return null;

  // Get images
  const mainImage = detail?.imageUrl || "";
  const descriptionImages = Array.isArray(detail?.descriptionImageUrls)
    ? detail.descriptionImageUrls.filter(Boolean)
    : [];
  const images = [mainImage, ...descriptionImages].filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-600">
              Chi tiết sản phẩm
            </p>
            <h3 className="mt-1 text-xl font-bold text-slate-950">
              {detail?.productName || "Đang tải..."}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 px-6 py-4">
          {loading && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
              Đang tải chi tiết sản phẩm...
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          )}

          {!loading && !error && detail && (
            <>
              {/* Images */}
              {images.length > 0 && (
                <div className="space-y-4">
                  <div className="aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                    <img
                      src={images[0]}
                      alt={detail.productName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  {images.length > 1 && (
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                      {images.map((imageUrl, index) => (
                        <div
                          key={`${imageUrl}-${index}`}
                          className="aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                        >
                          <img
                            src={imageUrl}
                            alt={`${detail.productName} ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Product Info */}
              <div>
                <p className="text-2xl font-bold text-slate-950">
                  {currencyFormatter.format(detail.price || 0)}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {detail.description || "Chưa có mô tả chi tiết."}
                </p>
              </div>

              {/* Product Metadata */}
              <div className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Trạng thái
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">
                    {detail.status === "ACTIVE" ? "Đang bán" : "Đang ẩn"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Tồn kho
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">
                    {detail.stockQuantity || 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Danh mục
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">
                    {detail.categoryName || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    ID Sản phẩm
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">
                    #{detail.productId}
                  </p>
                </div>
              </div>

              {/* Rating Summary */}
              {detail.totalComments > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h4 className="font-bold text-slate-950">
                    Đánh giá và nhận xét
                  </h4>

                  {/* Average Rating */}
                  <div className="mt-4 flex items-center gap-4 pb-5 border-b border-slate-200">
                    <div className="text-center">
                      <p className="text-4xl font-bold text-slate-950">
                        {detail.averageRating.toFixed(1)}
                      </p>
                      <div className="mt-1 flex items-center justify-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className="material-symbols-outlined text-lg text-[#fd761a]"
                            style={{
                              fontVariationSettings: `'FILL' ${+(
                                detail.averageRating >= star
                              )}`,
                            }}
                          >
                            star
                          </span>
                        ))}
                      </div>
                      <p className="mt-2 text-xs font-medium text-slate-600">
                        {detail.totalComments} bình luận
                      </p>
                    </div>

                    {/* Rating Distribution */}
                    <div className="flex-1 space-y-2">
                      <RatingBar
                        count={detail.ratingCount5Star}
                        total={detail.totalComments}
                        percentage={
                          detail.totalComments > 0
                            ? (detail.ratingCount5Star / detail.totalComments) *
                              100
                            : 0
                        }
                      />
                      <RatingBar
                        count={detail.ratingCount4Star}
                        total={detail.totalComments}
                        percentage={
                          detail.totalComments > 0
                            ? (detail.ratingCount4Star / detail.totalComments) *
                              100
                            : 0
                        }
                      />
                      <RatingBar
                        count={detail.ratingCount3Star}
                        total={detail.totalComments}
                        percentage={
                          detail.totalComments > 0
                            ? (detail.ratingCount3Star / detail.totalComments) *
                              100
                            : 0
                        }
                      />
                      <RatingBar
                        count={detail.ratingCount2Star}
                        total={detail.totalComments}
                        percentage={
                          detail.totalComments > 0
                            ? (detail.ratingCount2Star / detail.totalComments) *
                              100
                            : 0
                        }
                      />
                      <RatingBar
                        count={detail.ratingCount1Star}
                        total={detail.totalComments}
                        percentage={
                          detail.totalComments > 0
                            ? (detail.ratingCount1Star / detail.totalComments) *
                              100
                            : 0
                        }
                      />
                    </div>
                  </div>

                  {/* Comments List */}
                  <div className="mt-5">
                    <p className="font-semibold text-slate-950">
                      Bình luận của khách hàng
                    </p>
                    <div className="mt-3 space-y-3 max-h-[400px] overflow-y-auto">
                      {detail.comments && detail.comments.length > 0 ? (
                        detail.comments.map((comment) => (
                          <div
                            key={comment.id}
                            className="rounded-2xl border border-slate-200 bg-white p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-950">
                                Khách hàng #{comment.userId}
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                                  {comment.rating}/5 sao
                                </span>
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <span
                                      key={star}
                                      className="material-symbols-outlined text-sm text-[#fd761a]"
                                      style={{
                                        fontVariationSettings: `'FILL' ${+(
                                          comment.rating >= star
                                        )}`,
                                      }}
                                    >
                                      star
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {comment.comment}
                            </p>
                            <p className="mt-2 text-xs text-slate-400">
                              {formatDateTime(comment.createdAt)}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                          Chưa có bình luận nào cho sản phẩm này.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* No Comments */}
              {detail.totalComments === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <span className="material-symbols-outlined block text-4xl text-slate-300">
                    chat
                  </span>
                  <p className="mt-2 text-sm font-medium text-slate-600">
                    Chưa có bình luận hoặc đánh giá cho sản phẩm này
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
