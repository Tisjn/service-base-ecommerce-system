import { useEffect, useMemo, useState } from "react";
import orderApi from "../../../../api/orderApi";
import { getProduct } from "../../../../api/productApi";
import { currencyFormatter, formatDateTime } from "../orderUtils";

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

export default function ProductDetailSection({
  product: initialProduct,
  userId,
  updatingProductId,
  onBack,
  onAddToCart,
}) {
  const [product, setProduct] = useState(initialProduct);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!initialProduct?.id) {
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.allSettled([
      getProduct(initialProduct.id),
      orderApi.getOrderProductDetail(userId, initialProduct.id),
    ])
      .then(([productResult, detailResult]) => {
        if (cancelled) {
          return;
        }

        if (productResult.status === "fulfilled") {
          setProduct(productResult.value);
        }
        if (detailResult.status === "fulfilled") {
          if (detailResult.value?.product) {
            setProduct(detailResult.value.product);
          }
          setComments(
            Array.isArray(detailResult.value?.comments)
              ? detailResult.value.comments
              : [],
          );
        }
        if (
          productResult.status === "rejected" &&
          detailResult.status === "rejected"
        ) {
          setError(
            productResult.reason?.message ||
              "Không tải được chi tiết sản phẩm.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [initialProduct, userId]);

  const images = useMemo(() => {
    const gallery = Array.isArray(product?.descriptionImageUrls)
      ? product.descriptionImageUrls
      : [];
    return [product?.imageUrl, ...gallery].filter(Boolean);
  }, [product]);

  const averageRating = useMemo(() => {
    if (!comments.length) {
      return 0;
    }
    return (
      comments.reduce(
        (sum, comment) => sum + (Number(comment.rating) || 0),
        0,
      ) / comments.length
    );
  }, [comments]);

  const stockQuantity = Number(product?.stockQuantity || 0);
  const stockPercent = Math.max(8, Math.min(100, stockQuantity * 7));

  if (!product) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
        Không có dữ liệu sản phẩm.
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
      >
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Quay lại danh mục
      </button>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="space-y-6 lg:col-span-7">
          <div className="group relative aspect-[4/5] overflow-hidden rounded-[10px] bg-[#f3f3fe]">
            {images[0] ? (
              <img
                src={images[0]}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                Chưa có ảnh sản phẩm
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          </div>

          {images.length > 1 && (
            <div className="grid grid-cols-3 gap-4">
              {images.slice(1, 4).map((imageUrl, index) => (
                <div
                  key={`${imageUrl}-${index}`}
                  className={`aspect-square overflow-hidden rounded-xl bg-[#e7e7f3] ${
                    index === 2 ? "border-2 border-[#004ac6]" : ""
                  }`}
                >
                  <img
                    src={imageUrl}
                    alt={`${product.name} ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col lg:col-span-5">
          <div className="mb-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#9d4300]">
            <span
              className="material-symbols-outlined text-sm"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified
            </span>
            Bộ sưu tập tuyển chọn
          </div>

          <h1 className="mb-4 font-headline text-5xl font-extrabold leading-[1.1] tracking-tight text-[#191b23]">
            {product.name}
          </h1>

          <div className="mb-8 flex items-center gap-4">
            <RatingStars rating={averageRating || 5} />
            <span className="text-sm font-semibold text-[#434655]">
              {averageRating ? averageRating.toFixed(1) : "Mới"} (
              {comments.length} đánh giá)
            </span>
          </div>

          <div className="mb-8 text-4xl font-bold text-[#004ac6]">
            {currencyFormatter.format(product.price || 0)}
          </div>

          <p className="mb-10 text-lg leading-relaxed text-[#434655]">
            {product.description || "Chưa có mô tả chi tiết cho sản phẩm này."}
          </p>

          <div className="mb-10 space-y-4 rounded-xl bg-[#f3f3fe] p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#434655]">
                Trạng thái
              </span>
              <span className="text-sm font-bold text-[#007d55]">
                {stockQuantity > 0 ? `Còn ${stockQuantity} chiếc` : "Hết hàng"}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#d9d9e5]">
              <div
                className="h-full rounded-full bg-[#007d55]"
                style={{ width: `${stockPercent}%` }}
              />
            </div>
            <p className="text-[10px] italic text-[#434655]">
              Sản phẩm được cập nhật theo tồn kho hiện tại của hệ thống.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <button
              type="button"
              disabled={updatingProductId === product.id || stockQuantity <= 0}
              onClick={() => onAddToCart(product)}
              className="flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#004ac6] to-[#2563eb] py-5 text-lg font-bold text-white shadow-lg transition hover:shadow-xl active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="material-symbols-outlined">
                add_shopping_cart
              </span>
              {updatingProductId === product.id
                ? "Đang thêm..."
                : "Thêm vào giỏ hàng"}
            </button>
            <button
              type="button"
              className="w-full rounded-full bg-[#ededf9] py-5 text-lg font-bold text-[#191b23] transition hover:bg-[#e1e2ed] active:scale-95"
            >
              Yêu cầu tư vấn
            </button>
          </div>
        </div>
      </div>

      <section className="pt-12">
        <div className="mb-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h2 className="mb-4 font-headline text-4xl font-bold text-[#191b23]">
              Trải nghiệm khách hàng
            </h2>
            <p className="max-w-xl text-[#434655]">
              Bình luận từ những khách hàng đã mua sản phẩm này trong hệ thống.
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 font-bold text-[#004ac6] transition-transform hover:translate-x-1"
          >
            Mua thêm sản phẩm
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>

        {loading ? (
          <div className="rounded-xl border border-[#c3c6d7] bg-white p-8 text-sm text-[#434655]">
            Đang tải đánh giá...
          </div>
        ) : comments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#c3c6d7] bg-white p-8 text-sm text-[#434655]">
            Chưa có bình luận nào cho sản phẩm này.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {comments.map((comment, index) => (
              <article
                key={comment.id}
                className={`rounded-full border border-[#c3c6d7]/20 p-8 shadow-sm ${
                  index % 4 === 0
                    ? "bg-white md:col-span-2"
                    : index % 4 === 2
                      ? "bg-[#004ac6] text-white"
                      : "bg-[#ededf9] text-[#191b23]"
                }`}
              >
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-bold">Khách hàng #{comment.userId}</h4>
                    <p
                      className={
                        index % 4 === 2
                          ? "text-xs text-white/75"
                          : "text-xs text-[#434655]"
                      }
                    >
                      {formatDateTime(comment.createdAt)}
                    </p>
                  </div>
                  <RatingStars rating={comment.rating} size="text-sm" />
                </div>
                <p className="text-sm leading-relaxed md:text-base">
                  "{comment.comment}"
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
