# 人情记账系统 (Gift Ledger)

人情记账系统 - 记录和管理随礼、收礼的人情往来。

## 项目结构

```
gift-ledger/
├── backend/          # 后端 - Node.js + Express + SQLite
│   ├── src/          # 服务端源码
│   ├── public/       # 前端构建产物（部署用）
│   ├── Dockerfile    # Docker 部署配置
│   └── package.json
├── frontend/         # 前端 - React + Vite + Tailwind CSS
│   ├── src/          # 前端源码
│   ├── public/       # 静态资源
│   └── package.json
├── docker-compose.yml # 单容器 + 数据卷部署
├── scripts/           # 运维脚本（历史数据迁移等）
└── README.md
```

## 技术栈

### 后端
- Node.js + Express
- SQLite (better-sqlite3)
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

## 日期与农历

所有日期展示入口（记录列表、礼簿列表、详情页、导出 Excel / 文本）统一为：

```
2026-10-22（农历2026丙午马年九月十三）
```

- 公历：`YYYY-MM-DD`
- 农历：`农历 + 农历年份 + 干支 + 生肖 + 年 + 规范中文月 + 规范中文日`
- 月份固定写作 `正月/二月/…/十月/冬月/腊月/闰X月`，日期固定写作 `初一…三十`，
  不会出现 `十月15`、`腊月7` 这类数字混排
- 前端实现：`frontend/src/utils/helpers.js`（`lunarDate` / `formatDateWithLunar`）
- 后端实现：`backend/src/utils/lunar.js`（内置 `backend/src/vendor/lunar.js`，无需额外 npm 依赖）

## 数据导出

- **导出 Excel**：收礼 / 随礼两个工作表，含「日期」与「农历日期」两列
- **导出文本（.txt）**：每条记录一行，日期同样为「公历（农历…）」，
  文件带 UTF-8 BOM，Windows 记事本直接打开不乱码

## 登录与密码

- 默认管理员：`admin` / `admin123`（首次启动自动创建，可用环境变量覆盖）
- 忘记密码：容器启动时带上 `-e ADMIN_RESET_PASSWORD=true`，重启后密码即恢复为 `ADMIN_PASSWORD`
- 历史库里若存在明文密码（非 bcrypt），登录时会自动比对并升级为 bcrypt 哈希
- 只有服务端返回 401 才会清除登录态，网络抖动 / 5xx 不会把用户踢回登录页
- 未登录访问任意页面会跳转登录并记住来路（`/login?redirect=...`），登录成功后原路返回

## 快速开始

### 后端

```bash
cd backend
npm install
npm start
```

> 数据库文件默认生成在 `backend/data/gift_ledger.db`，可通过环境变量 `DB_PATH` 自定义。

### 前端

```bash
cd frontend
npm install
npm run dev    # 开发模式
npm run build  # 生产构建
```

### Docker 部署

**方式一：docker compose（推荐）**

```bash
docker compose up -d
```

数据通过命名卷 `gift-ledger-data` 持久化，容器重启或重建后数据不丢失。

**方式二：docker run**

```bash
docker build -t gift-ledger -f backend/Dockerfile.optimized backend/
docker run -d -p 9205:9205 -v gift-ledger-data:/app/data --name gift-ledger gift-ledger
```

访问应用：http://localhost:9205

## 数据持久化

所有数据保存在 `/app/data/` 目录下，通过 volume 挂载持久化：

| 路径 | 说明 |
|------|------|
| `/app/data/gift_ledger.db` | SQLite 数据库文件 |
| `/app/data/gift_ledger.db-wal` | WAL 日志文件（提升并发性能） |
| `/app/data/backups/` | 自动/手动备份的 Excel 文件 |

挂载 `-v gift-ledger-data:/app/data` 即可保证上述全部数据在容器重启后不丢失。

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| PORT | 9205 | 服务端口 |
| DB_PATH | /app/data/gift_ledger.db | SQLite 数据库文件路径 |
| CLOUD_DATA_DIR | /app/data/backups | 备份文件目录 |
| JWT_SECRET | - | JWT 签名密钥 |
| NODE_ENV | production | 运行环境 |
| ADMIN_USERNAME | admin | 默认管理员用户名（首次启动创建） |
| ADMIN_PASSWORD | admin123 | 默认管理员密码 |
| ADMIN_RESET_PASSWORD | - | 设为 true 时，启动会把管理员密码重置为 ADMIN_PASSWORD（忘记密码自救），重置后请移除该变量 |
| AUTO_BACKUP | true | 自动备份总开关，设为 false 可关闭 |
| AUTO_BACKUP_KEEP | 2 | 每个用户保留的最新备份文件个数 |
| AUTO_BACKUP_SCHEDULE | 0 22 1,16 * * | 自动备份定时(cron: 分 时 日 月 星期)，默认每月1号、16号 22:00(晚上10点)，时区 Asia/Shanghai |

## 历史数据迁移（Excel → SQLite）

`scripts/migrate_excel_to_sqlite.py` 用于把「人情笔记_*.xlsx」历史 Excel 直接写入 SQLite 数据库，适合一次性迁移大批量历史数据。相比 Web 端导入，本脚本会**自动补建缺失的亲友类型 / 事由**，并保证**幂等可重复执行**（重复行自动跳过）。

### 用法

```bash
pip install openpyxl
python scripts/migrate_excel_to_sqlite.py \
    --db /vol1/1000/docker/gift-ledger/data/gift_ledger.db \
    --excel 人情笔记_示例_20260716_2200.xlsx \
    --user your_username
```

参数说明：

| 参数 | 说明 |
|------|------|
| `--db` | SQLite 数据库文件路径（即容器内的 `/app/data/gift_ledger.db`） |
| `--excel` | 要导入的 Excel 文件，需含「收礼」「随礼」两个 sheet |
| `--user` | 目标用户名，**须先在应用内注册**（脚本按用户名解析 user_id，不处理密码） |

### 步骤（以 NAS 部署为例）

1. `docker compose up -d` 部署并启动应用；
2. 在应用 Web 界面注册目标用户（每个要导入数据的账号）；
3. 停掉容器避免写入冲突：`docker compose stop`；
4. 运行脚本，每个 Excel 对应一个 `--user` 执行一次；
5. 重新启动：`docker compose start`。

> 若 NAS 本身没有 Python / openpyxl，可临时起一个 Python 容器挂载同一数据卷执行，或把脚本与 Excel 拷到能运行 Python 的机器上对挂载出来的 db 文件执行。
