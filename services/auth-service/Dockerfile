# Dùng image NodeJS phiên bản 20 chạy trên Alpine Linux
# Alpine rất nhẹ => image nhỏ hơn
FROM node:20-alpine


# Thiết lập thư mục làm việc bên trong container là /app
# Mọi lệnh phía sau sẽ chạy trong thư mục này
WORKDIR /app


# Tạo biến môi trường NODE_ENV=production
# Thường dùng để tối ưu hiệu năng và bỏ package devDependencies
ENV NODE_ENV=production


# Copy package.json và package-lock.json vào container
# package*.json nghĩa là:
# - package.json
# - package-lock.json
COPY package*.json ./


# Cài dependencies cho production
# npm ci:
# - cài đúng version trong package-lock.json
# - nhanh và ổn định hơn npm install
#
# --only=production:
# chỉ cài dependencies cần cho production
# không cài devDependencies
RUN npm ci --only=production


# Copy toàn bộ source code vào container
COPY . .


# Tạo group tên app
RUN addgroup -S app && \
    # Tạo user tên app thuộc group app
    adduser -S app -G app && \
    # Tạo thư mục uploads trước khi chuyển user, và chuyển quyền sở hữu
    mkdir -p /app/uploads/avatars && \
    chown -R app:app /app


# Chuyển sang user app
# Không chạy bằng root để tăng bảo mật
USER app


# Khai báo container sẽ dùng port 3001
# Chỉ mang tính documentation
EXPOSE 3001


# Lệnh chạy khi container start
# Chạy file src/index.js bằng NodeJS
CMD ["node", "src/index.js"]