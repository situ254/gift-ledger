const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { createClient } = require('webdav');
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { importFromWorkbook } = require('../importHelper');

const upload = multer({ dest: '/tmp/uploads/' });

// 云端数据目录
const CLOUD_DATA_DIR = process.env.CLOUD_DATA_DIR || '/data';

/**
 * 生成备份数据的 Excel Buffer
 */
async function generateBackupBuffer(userId) {
  const wb = XLSX.utils.book_new();

  const [received] = await pool.query(
    `SELECT gr.contact_name as '亲友姓名', ct.name as '亲友类型', gr.amount as '金额', gb.name as '所属礼簿', gr.gift_book_date as '礼簿日期', gr.notes as '备注', DATE_FORMAT(gr.created_at, '%Y-%m-%d %H:%i:%s') as '创建时间'
    FROM gifts_received gr LEFT JOIN contact_types ct ON gr.contact_type_id = ct.id LEFT JOIN gift_books gb ON gr.gift_book_id = gb.id WHERE gr.user_id = ?`,
    [userId]
  );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(received), '收礼');

  const [given] = await pool.query(
    `SELECT gg.contact_name as '亲友姓名', ct.name as '亲友类型', gg.amount as '金额', r.name as '事由', gg.gift_date as '随礼日期', gg.notes as '备注', DATE_FORMAT(gg.created_at, '%Y-%m-%d %H:%i:%s') as '创建时间'
    FROM gifts_given gg LEFT JOIN contact_types ct ON gg.contact_type_id = ct.id LEFT JOIN reasons r ON gg.reason_id = r.id WHERE gg.user_id = ?`,
    [userId]
  );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(given), '随礼');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// ========== 云端备份与恢复 ==========

// 云端备份状态
router.get('/cloud/status', authMiddleware, async (req, res) => {
  try {
    // 获取用户名
    const [users] = await pool.query('SELECT username FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(400).json({ error: '用户不存在' });
    const username = users[0].username;

    const userDir = path.join(CLOUD_DATA_DIR, username);
    let backupList = [];
    let lastBackupTime = null;

    if (fs.existsSync(userDir)) {
      const files = fs.readdirSync(userDir)
        .filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'))
        .map(f => {
          const filePath = path.join(userDir, f);
          const stat = fs.statSync(filePath);
          return { name: f, time: stat.mtime, size: stat.size };
        })
        .sort((a, b) => new Date(b.time) - new Date(a.time));

      backupList = files.map(f => ({
        name: f.name,
        time: f.time.toISOString(),
        size: f.size
      }));

      if (files.length > 0) {
        lastBackupTime = files[0].time.toISOString();
      }
    }

    res.json({ username, backupList, lastBackupTime, dir: userDir });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取云端备份状态失败' });
  }
});

// 云端备份
router.post('/cloud/backup', authMiddleware, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT username FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(400).json({ error: '用户不存在' });
    const username = users[0].username;

    const userDir = path.join(CLOUD_DATA_DIR, username);
    // 确保目录存在
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    const buf = await generateBackupBuffer(req.user.id);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `人情笔记_${username}_${dateStr}.xlsx`;
    const filePath = path.join(userDir, filename);
    fs.writeFileSync(filePath, buf);

    res.json({ success: true, message: '云端备份成功', filename, size: buf.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '云端备份失败' });
  }
});

// 云端恢复
router.post('/cloud/restore', authMiddleware, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT username FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(400).json({ error: '用户不存在' });
    const username = users[0].username;

    const userDir = path.join(CLOUD_DATA_DIR, username);
    if (!fs.existsSync(userDir)) {
      return res.status(400).json({ error: '云端暂无备份数据' });
    }

    // 找到最新的备份文件
    const files = fs.readdirSync(userDir)
      .filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'))
      .map(f => {
        const filePath = path.join(userDir, f);
        const stat = fs.statSync(filePath);
        return { name: f, path: filePath, time: stat.mtime };
      })
      .sort((a, b) => new Date(b.time) - new Date(a.time));

    if (files.length === 0) {
      return res.status(400).json({ error: '云端暂无备份数据' });
    }

    const latestFile = files[0];
    const workbook = XLSX.readFile(latestFile.path);
    const result = await importFromWorkbook(workbook, req.user.id, XLSX, { dedup: true });
    result.restoredFrom = latestFile.name;

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '云端恢复失败' });
  }
});

// 删除云端备份
router.delete('/cloud/:filename', authMiddleware, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT username FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(400).json({ error: '用户不存在' });
    const username = users[0].username;

    const filename = req.params.filename;
    // 安全校验：防止路径遍历
    if (filename.includes('/') || filename.includes('..')) {
      return res.status(400).json({ error: '无效文件名' });
    }

    const filePath = path.join(CLOUD_DATA_DIR, username, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }

    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除失败' });
  }
});

// ========== 本地备份与恢复 ==========
router.get('/local', authMiddleware, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT username FROM users WHERE id = ?', [req.user.id]);
    const username = users.length > 0 ? users[0].username : 'unknown';
    const buf = await generateBackupBuffer(req.user.id);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `人情笔记_${username}_${dateStr}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '备份失败' });
  }
});

// 本地恢复（导入）
router.post('/local', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请上传Excel备份文件' });
    const workbook = XLSX.readFile(req.file.path);
    const result = await importFromWorkbook(workbook, req.user.id, XLSX, { dedup: true });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '恢复失败，请检查文件格式' });
  }
});

// 获取WebDAV配置
router.get('/webdav/config', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM webdav_configs WHERE user_id = ?', [req.user.id]);
    if (rows.length > 0) {
      const config = rows[0];
      res.json({
        server_url: config.server_url,
        username: config.username,
        password: config.password,
        backup_path: config.backup_path,
        last_backup_time: config.last_backup_time
      });
    } else {
      res.json({ server_url: '', username: '', password: '', backup_path: '', last_backup_time: null });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取WebDAV配置失败' });
  }
});

// 保存WebDAV配置
router.post('/webdav/config', authMiddleware, async (req, res) => {
  try {
    const { server_url, username, password, backup_path } = req.body;
    const [existing] = await pool.query('SELECT id FROM webdav_configs WHERE user_id = ?', [req.user.id]);
    if (existing.length > 0) {
      await pool.query('UPDATE webdav_configs SET server_url = ?, username = ?, password = ?, backup_path = ? WHERE user_id = ?',
        [server_url, username, password, backup_path, req.user.id]);
    } else {
      await pool.query('INSERT INTO webdav_configs (user_id, server_url, username, password, backup_path) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, server_url, username, password, backup_path]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '保存WebDAV配置失败' });
  }
});

// 测试WebDAV连接
router.post('/webdav/test', authMiddleware, async (req, res) => {
  try {
    const { server_url, username, password } = req.body;
    const client = createClient(server_url, { username, password });
    await client.exists('/');
    res.json({ success: true, message: '连接成功' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: '连接失败，请检查服务器地址、用户名、密码' });
  }
});

// 备份到WebDAV
router.post('/webdav/backup', authMiddleware, async (req, res) => {
  try {
    const [configs] = await pool.query('SELECT * FROM webdav_configs WHERE user_id = ?', [req.user.id]);
    if (configs.length === 0) return res.status(400).json({ error: '请先配置WebDAV' });
    const config = configs[0];

    const buf = await generateBackupBuffer(req.user.id);
    const [users] = await pool.query('SELECT username FROM users WHERE id = ?', [req.user.id]);
    const username = users.length > 0 ? users[0].username : 'unknown';
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `人情笔记_${username}_${dateStr}.xlsx`;
    const remotePath = (config.backup_path || '/').replace(/\/$/, '') + '/' + filename;

    const client = createClient(config.server_url, { username: config.username, password: config.password });

    // 确保目录存在
    const dirPath = (config.backup_path || '/').replace(/\/$/, '');
    try { await client.exists(dirPath); } catch (e) {
      try { await client.createDir(dirPath); } catch (e2) { /* ignore */ }
    }

    await client.putFileContents(remotePath, buf);
    await pool.query('UPDATE webdav_configs SET last_backup_time = NOW() WHERE user_id = ?', [req.user.id]);
    res.json({ success: true, message: '备份成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '备份失败，请检查WebDAV配置或网络连接' });
  }
});

// 从WebDAV恢复
router.post('/webdav/restore', authMiddleware, async (req, res) => {
  try {
    const [configs] = await pool.query('SELECT * FROM webdav_configs WHERE user_id = ?', [req.user.id]);
    if (configs.length === 0) return res.status(400).json({ error: '请先配置WebDAV' });
    const config = configs[0];

    const client = createClient(config.server_url, { username: config.username, password: config.password });
    const dirPath = (config.backup_path || '/').replace(/\/$/, '');

    // 列出备份文件
    const files = await client.getDirectoryContents(dirPath);
    const backupFiles = files.filter(f => f.type === 'file' && (f.basename.endsWith('.xlsx') || f.basename.endsWith('.xls'))).sort((a, b) => new Date(b.lastmod) - new Date(a.lastmod));

    if (backupFiles.length === 0) return res.status(400).json({ error: 'WebDAV上没有找到备份文件' });

    // 下载最新的备份文件
    const latestFile = backupFiles[0];
    const buf = await client.getFileContents(latestFile.filename);

    // 解析并导入
    const workbook = XLSX.read(buf, { type: 'buffer' });
    const result = await importFromWorkbook(workbook, req.user.id, XLSX, { dedup: true });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '恢复失败，请检查WebDAV配置或网络连接' });
  }
});

module.exports = router;
