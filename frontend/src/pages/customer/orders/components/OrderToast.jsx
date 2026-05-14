export default function OrderToast({ notification, onClose }) {
  if (!notification) {
    return null;
  }

  return (
    <div className="fixed right-4 top-4 z-50 w-[calc(100vw-2rem)] max-w-md rounded-3xl border border-white/70 bg-white/95 p-4 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.5)] backdrop-blur sm:right-6 sm:top-6">
      <div
        className={`flex items-start justify-between gap-4 rounded-2xl px-4 py-3 text-sm ${notification.type === "error" ? "border border-red-200 bg-red-50 text-red-700" : "border border-emerald-200 bg-emerald-50 text-emerald-700"}`}
      >
        <div className="min-w-0">
          <p className="font-semibold">
            {notification.type === "error" ? "Có lỗi xảy ra" : "Thành công"}
          </p>
          <p className="mt-1 wrap-break-word">{notification.text}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-500 transition hover:text-slate-900"
        >
          ×
        </button>
      </div>
    </div>
  );
}
