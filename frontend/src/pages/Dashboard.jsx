function Dashboard({ onLogout, user }) {
  return (
    <main className="min-h-screen flex items-center justify-center py-10 px-4 bg-linear-to-br from-blue-50 to-gray-100">
      <section className="max-w-7xl w-full bg-white rounded-3xl shadow-2xl p-10 grid gap-8">
        <header className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 rounded-3xl overflow-hidden border-4 border-sky-100 bg-slate-100">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName || user.email}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-200 text-xl font-semibold text-slate-700">
                  {user.fullName
                    ? user.fullName
                        .split(" ")
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    : user.email?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="text-blue-600 uppercase tracking-widest text-xs mb-3">
                Chào mừng, {user.fullName || "người dùng"}
              </p>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight max-w-lg">
                Dashboard quản lý DTPShop
              </h1>
              <p className="text-gray-600 leading-relaxed mt-4 max-w-lg">
                Bạn đang đăng nhập với email{" "}
                <span className="font-semibold text-slate-900">
                  {user.email}
                </span>
                .
              </p>
            </div>
          </div>
          <button
            className="self-start bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
            onClick={onLogout}
          >
            Đăng xuất
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 rounded-2xl p-7 min-h-[180px]">
            <h2 className="text-xl font-bold mb-3">Hồ sơ</h2>
            <p className="text-gray-600 leading-relaxed">
              Xem thông tin cá nhân và avatar của bạn.
            </p>
          </div>
          <div className="bg-blue-50 rounded-2xl p-7 min-h-[180px]">
            <h2 className="text-xl font-bold mb-3">Đơn hàng</h2>
            <p className="text-gray-600 leading-relaxed">
              Quản lý trạng thái đơn hàng và lịch sử mua sắm.
            </p>
          </div>
          <div className="bg-blue-50 rounded-2xl p-7 min-h-[180px]">
            <h2 className="text-xl font-bold mb-3">Sản phẩm</h2>
            <p className="text-gray-600 leading-relaxed">
              Quản lý danh sách sản phẩm và kho hàng.
            </p>
          </div>
          <div className="bg-blue-50 rounded-2xl p-7 min-h-[180px]">
            <h2 className="text-xl font-bold mb-3">Bảo mật</h2>
            <p className="text-gray-600 leading-relaxed">
              Quản lý đổi mật khẩu, OTP và phương thức xác thực.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Dashboard;
