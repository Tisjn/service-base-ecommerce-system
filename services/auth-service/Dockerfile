FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Use a non-root user for safety
RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 3001

CMD ["node", "src/index.js"]
