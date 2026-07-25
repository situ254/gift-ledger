const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// SQLite 数据库文件路径
// 容器内：/app/data/gift_ledger.db（由 Dockerfile 环境变量 DB_PATH 指定）
// 本地开发：./data/gift_ledger.db（相对当前工作目录）
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'gift_ledger.db');

// 确保数据目录存在
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 创建数据库连接（better-sqlite3 为同步接口）
const db = new Database(DB_PATH);
// 启用 WAL 模式：提升并发读写性能（自动备份读取时不会阻塞写入）
db.pragma('journal_mode = WAL');
// 启用外键约束：与 MySQL 的 FOREIGN KEY 行为一致（CASCADE / SET NULL / RESTRICT）
db.pragma('foreign_keys = ON');

/**
 * 兼容 mysql2/promise 的 pool.query 接口封装层
 *
 * 原有路由代码统一使用：const [rows] = await pool.query(sql, params)
 * - SELECT 语句：返回 [行数组, []]
 * - INSERT/UPDATE/DELETE：返回 [{ insertId, affectedRows }, []]
 *
 * 这样所有业务逻辑、API 接口、前端交互均无需改动，仅底层数据库从 MySQL 切换为 SQLite。
 */
const pool = {
  query(sql, params) {
    const stmt = db.prepare(sql);
    // 规范化绑定参数：undefined 视为 null（与 mysql2 行为一致，better-sqlite3 不接受 undefined）
    const safeParams = (params == null
      ? []
      : (Array.isArray(params) ? params : [params])
    ).map(p => (p === undefined ? null : p));

    // 取 SQL 首个关键字判断语句类型（去除注释与空白）
    const cleaned = sql.trim().replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '').trim();
    const firstWord = cleaned.split(/\s+/)[0].toUpperCase();

    if (firstWord === 'SELECT' || firstWord === 'WITH' || firstWord === 'PRAGMA' || firstWord === 'VALUES') {
      const rows = stmt.all(...safeParams);
      return Promise.resolve([rows, []]);
    }
    // INSERT / UPDATE / DELETE / CREATE / ALTER / DROP 等
    const info = stmt.run(...safeParams);
    return Promise.resolve([{
      fieldCount: 0,
      affectedRows: info.changes,
      changedRows: info.changes,
      insertId: info.lastInsertRowid != null ? Number(info.lastInsertRowid) : 0
    }, []]);
  }
};

// 暴露底层 db 实例（供数据库初始化、备份等场景使用）
pool.db = db;
pool.DB_PATH = DB_PATH;

module.exports = pool;
