FROM node:20-alpine

LABEL maintainer=gift-ledger
LABEL description=人情记账系统

WORKDIR /app

COPY package.json ./
COPY node_modules/ ./node_modules/
COPY src/ ./src/
COPY public/ ./public/

RUN mkdir -p /tmp/uploads /data

ENV PORT=9205
ENV DB_HOST=mysql
ENV DB_PORT=3306
ENV DB_USER=root
ENV DB_PASSWORD=root
ENV DB_NAME=gift_ledger
ENV JWT_SECRET=gift_ledger_secret_key_2024
ENV NODE_ENV=production
ENV ADMIN_USERNAME=admin
ENV ADMIN_PASSWORD=admin123

EXPOSE 9205

CMD ["node", "src/index.js"]
