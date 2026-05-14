export default function AdminDevelopmentPage({ section }) {
  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-10">
      <section className="overflow-hidden rounded-2xl border border-[#c3c6d7]/20 bg-white shadow-sm">
        <div className="grid gap-8 p-8 lg:grid-cols-[1fr_320px] lg:p-10">
          <div>
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-[#004ac6]/10 text-[#004ac6]">
              <span className="material-symbols-outlined text-3xl">
                {section.icon}
              </span>
            </div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#737686]">
              DTPShop Admin Module
            </p>
            <h2 className="mb-3 text-4xl font-extrabold tracking-tight text-[#191b23] [font-family:Manrope,system-ui,sans-serif]">
              {section.title}
            </h2>
            <p className="max-w-2xl text-[#434655]">{section.subtitle}</p>

            <div className="mt-8 rounded-xl border border-[#fd761a]/20 bg-[#ffdbca]/40 p-5">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[#9d4300]">
                  construction
                </span>
                <div>
                  <h3 className="font-extrabold text-[#191b23]">
                    Giao diện đang phát triển
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-[#5c2400]">
                    Module này đã được chuẩn bị khung giao diện và vị trí thư mục
                    để mở rộng sau. Khi triển khai nghiệp vụ, chỉ cần phát triển
                    tiếp trong thư mục tương ứng.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-[#c3c6d7]/20 bg-[#f3f3fe] p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-[#737686]">
              Thư mục phát triển
            </p>
            <code className="mt-4 block rounded-xl bg-white px-4 py-3 text-sm text-[#004ac6]">
              {section.folder}
            </code>
            <div className="mt-6 space-y-3 text-sm text-[#434655]">
              <p className="font-bold text-[#191b23]">Trạng thái</p>
              <p>Đã có menu, layout, topbar và màn hình placeholder.</p>
              <p>Chưa nối API nghiệp vụ riêng cho module này.</p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
