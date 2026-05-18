export default function OrderInsightPanel({
  cartSubtotal,
  cartTotal,
  categories,
  onSelectCategory,
}) {
  return (
    <aside className="space-y-6">
      <div className="rounded-3xl border border-white/70 bg-white/95 p-6 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.3)]">
        <h3 className="text-lg font-bold text-slate-950">Tóm tắt giỏ hàng</h3>
        <div className="mt-5 space-y-3 text-sm">
          <SummaryRow label="Tạm tính" value={cartSubtotal} />
          <SummaryRow label="Phương thức" value="COD" accent />
          <SummaryRow label="Tổng thanh toán" value={cartTotal} strong />
        </div>
      </div>

      <div className="rounded-3xl border border-white/70 bg-white/95 p-6 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.3)]">
        <h3 className="text-lg font-bold text-slate-950">Danh mục</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              type="button"
              key={category.id}
              onClick={() => onSelectCategory(category.id)}
              className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_24px_80px_-36px_rgba(15,23,42,0.4)]">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">
          Trạng thái đơn
        </p>
        <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
          <li>1. Chờ xác nhận: đơn vừa được tạo từ giỏ hàng.</li>
          <li>2. Đã xác nhận: admin duyệt đơn COD.</li>
          <li>3. Đang xử lý, đang giao, đã giao: tiến độ vận hành.</li>
          <li>4. Khách chỉ hủy được khi đơn còn chờ xác nhận.</li>
        </ol>
      </div>
    </aside>
  );
}

function SummaryRow({ label, value, accent = false, strong = false }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-slate-500">{label}</span>
      <span
        className={`font-semibold ${
          accent ? "text-emerald-700" : "text-slate-950"
        } ${strong ? "text-lg font-black" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
