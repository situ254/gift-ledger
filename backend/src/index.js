const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 9205;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/gift-books', require('./routes/giftBooks'));
app.use('/api/reasons', require('./routes/reasons'));
app.use('/api/contact-types', require('./routes/contactTypes'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/gifts-received', require('./routes/giftsReceived'));
app.use('/api/gifts-given', require('./routes/giftsGiven'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/data', require('./routes/importExport'));
app.use('/api/backup', require('./routes/backup'));
app.use('/api/admin', require('./routes/admin'));

// 健康检查端点（供 Docker HEALTHCHECK 使用）
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 静态文件服务（前端构建产物）
app.use(express.static(path.join(__dirname, '../public')));

// SPA路由回退
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  }
});

// 数据库初始化（SQLite）
async function initDatabase() {
  try {
    // 用户表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 事由表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reasons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INT NOT NULL,
        name VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, name),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 亲友类型表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contact_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INT NOT NULL,
        name VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, name),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 礼簿表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gift_books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        reason_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, name),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reason_id) REFERENCES reasons(id) ON DELETE SET NULL
      )
    `);

    // 亲友表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INT NOT NULL,
        name VARCHAR(50) NOT NULL,
        type_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, name),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (type_id) REFERENCES contact_types(id) ON DELETE SET NULL
      )
    `);

    // 收礼记录表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gifts_received (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INT NOT NULL,
        contact_name VARCHAR(50) NOT NULL,
        contact_type_id INT,
        amount DECIMAL(12,2) NOT NULL,
        gift_book_id INT NOT NULL,
        gift_book_date DATE NOT NULL,
        guests INT DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (contact_type_id) REFERENCES contact_types(id) ON DELETE SET NULL,
        FOREIGN KEY (gift_book_id) REFERENCES gift_books(id) ON DELETE RESTRICT
      )
    `);

    // 兼容旧表：如无 guests 列则添加
    try {
      await pool.query('ALTER TABLE gifts_received ADD COLUMN guests INT DEFAULT 0');
    } catch (e) { /* 列已存在则忽略 */ }

    // 随礼记录表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gifts_given (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INT NOT NULL,
        contact_name VARCHAR(50) NOT NULL,
        contact_type_id INT,
        amount DECIMAL(12,2) NOT NULL,
        reason_id INT,
        gift_date DATE NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (contact_type_id) REFERENCES contact_types(id) ON DELETE SET NULL,
        FOREIGN KEY (reason_id) REFERENCES reasons(id) ON DELETE SET NULL
      )
    `);

    // WebDAV 配置表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS webdav_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INT NOT NULL UNIQUE,
        server_url VARCHAR(500),
        username VARCHAR(100),
        password VARCHAR(255),
        backup_path VARCHAR(500) DEFAULT '/',
        last_backup_time TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 创建默认管理员账号（用户名和密码可通过环境变量配置）
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const [adminRows] = await pool.query("SELECT id FROM users WHERE username = ?", [adminUsername]);
    if (adminRows.length === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await pool.query("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')", [adminUsername, hashedPassword]);
      // 初始化管理员默认数据
      const [adminUser] = await pool.query("SELECT id FROM users WHERE username = ?", [adminUsername]);
      const adminId = adminUser[0].id;
      const defaultReasons = ['丧事', '孝敬', '其它', '压岁', '生日', '生子', '婚礼'];
      const defaultContactTypes = ['领导', '其它', '同学', '朋友', '亲戚', '同事'];
      for (const name of defaultReasons) {
        await pool.query('INSERT INTO reasons (user_id, name) VALUES (?, ?)', [adminId, name]);
      }
      for (const name of defaultContactTypes) {
        await pool.query('INSERT INTO contact_types (user_id, name) VALUES (?, ?)', [adminId, name]);
      }
      console.log(`Default admin account created: ${adminUsername} / ${adminPassword}`);
    }

    console.log('Database initialized successfully');
    console.log(`SQLite database: ${pool.DB_PATH}`);
  } catch (err) {
    console.error('Database initialization failed:', err.message);
    throw err;
  }
}

const { startAutoBackup } = require('./scheduler/autoBackup');

async function start() {
  // 先初始化数据库（SQLite 为本地文件，初始化极快）
  await initDatabase();

  // 启动定时自动备份
  startAutoBackup();

  // 启动 HTTP 服务
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Gift Ledger Server running on port ${PORT}`);
  });
}

start();
