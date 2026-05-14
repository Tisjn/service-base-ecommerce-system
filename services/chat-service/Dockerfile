FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

RUN mkdir -p uploads/chat/images uploads/chat/files && \
    addgroup -S app && \
    adduser -S app -G app && \
    chown -R app:app /app

USER app

EXPOSE 3008

CMD ["node", "src/index.js"]
