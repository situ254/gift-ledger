FROM node:20-alpine

LABEL maintainer=gift-ledger
LABEL description=人情记账系统

WORKDIR /app

COPY package.json ./
COPY node_modules/ ./node_modules/
COPY src/ ./src/
COPY public/ ./public/

# 创建数据目录（SQLite 数据库 + 备份文件，通过 volume 持久化）
RUN mkdir -p /tmp/uploads /app/data /app/data/backups && \
    chown -R node:node /app/data /tmp/uploads

ENV PORT=9205
ENV DB_PATH=/app/data/gift_ledger.db
ENV CLOUD_DATA_DIR=/app/data/backups
ENV JWT_SECRET=gift_ledger_secret_key_2024
ENV NODE_ENV=production
ENV ADMIN_USERNAME=admin
ENV ADMIN_PASSWORD=admin123

VOLUME ["/app/data"]

EXPOSE 9205

USER node

CMD ["node", "src/index.js"]
