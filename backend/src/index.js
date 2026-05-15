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

// 静态文件服务（前端构建产物）
app.use(express.static(path.join(__dirname, '../public')));

// SPA路由回退
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  }
});

// 数据库初始化
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'user') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS reasons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_reason (user_id, name),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS contact_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_type (user_id, name),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS gift_books (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        reason_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_book (user_id, name),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reason_id) REFERENCES reasons(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(50) NOT NULL,
        type_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_contact (user_id, name),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (type_id) REFERENCES contact_types(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS gifts_received (
        id INT AUTO_INCREMENT PRIMARY KEY,
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 兼容旧表：如无 guests 列则添加
    try {
      await pool.query('ALTER TABLE gifts_received ADD COLUMN guests INT DEFAULT 0');
    } catch (e) { /* 列已存在则忽略 */ }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS gifts_given (
        id INT AUTO_INCREMENT PRIMARY KEY,
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS webdav_configs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        server_url VARCHAR(500),
        username VARCHAR(100),
        password VARCHAR(255),
        backup_path VARCHAR(500) DEFAULT '/',
        last_backup_time TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
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
    retryCount = 0;
  } catch (err) {
    retryCount++;
    if (retryCount <= MAX_RETRIES) {
      console.log(`Waiting for database... (attempt ${retryCount}/${MAX_RETRIES})`);
      setTimeout(initDatabase, 3000);
    } else {
      console.error('Database initialization failed after max retries:', err.message);
    }
  }
}

// 等待 MySQL 端口可达
const net = require('net');

function waitForMySQL(host, port) {
  return new Promise((resolve) => {
    const check = () => {
      const socket = new net.Socket();
      socket.setTimeout(2000);
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.on('error', () => {
        socket.destroy();
        setTimeout(check, 2000);
      });
      socket.on('timeout', () => {
        socket.destroy();
        setTimeout(check, 2000);
      });
      socket.connect(port, host);
    };
    check();
  });
}

let retryCount = 0;
const MAX_RETRIES = 30;

async function start() {
  // 先启动 HTTP 服务
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Gift Ledger Server running on port ${PORT}`);
  });

  // 等待 MySQL 端口可达
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || '3306');
  console.log(`Waiting for MySQL at ${dbHost}:${dbPort}...`);
  await waitForMySQL(dbHost, dbPort);
  console.log('MySQL port is reachable, initializing database...');

  initDatabase();
}

start();
