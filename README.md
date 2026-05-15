# 人情记账系统 (Gift Ledger)

人情记账系统 - 记录和管理随礼、收礼的人情往来。

## 项目结构

```
gift-ledger/
├── backend/          # 后端 - Node.js + Express + MySQL
│   ├── src/          # 服务端源码
│   ├── public/       # 前端构建产物（部署用）
│   ├── Dockerfile    # Docker 部署配置
│   └── package.json
├── frontend/         # 前端 - React + Vite + Tailwind CSS
│   ├── src/          # 前端源码
│   ├── public/       # 静态资源
│   └── package.json
└── README.md
```

## 技术栈

### 后端
- Node.js + Express
- MySQL (mysql2)
- JWT 认证
- multer 文件上传
- xlsx 数据导入导出

### 前端
- React 19 + React Router 7
- Vite 8 构建
- Tailwind CSS 4
- Axios HTTP 客户端
- lunar-javascript 农历转换
- react-hot-toast 通知

## 快速开始

### 后端

```bash
cd backend
npm install
npm start
```

### 前端

```bash
cd frontend
npm install
npm run dev    # 开发模式
npm run build  # 生产构建
```

### Docker 部署

```bash
cd backend
docker build -t gift-ledger .
docker run -p 9205:9205 gift-ledger
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| PORT | 9205 | 服务端口 |
| DB_HOST | mysql | 数据库主机 |
| DB_PORT | 3306 | 数据库端口 |
| DB_USER | root | 数据库用户 |
| DB_PASSWORD | root | 数据库密码 |
| DB_NAME | gift_ledger | 数据库名称 |
| JWT_SECRET | - | JWT 签名密钥 |
| NODE_ENV | production | 运行环境 |
