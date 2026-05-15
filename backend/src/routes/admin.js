const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// 获取用户列表（管理员）
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, username, role, created_at FROM users ORDER BY id');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// 新增用户（管理员）
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) return res.status(400).json({ error: '用户名已被使用' });
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [username, hashedPassword, role || 'user']);
    // 初始化默认数据
    const defaultReasons = ['丧事', '孝敬', '其它', '压岁', '生日', '生子', '婚礼'];
    const defaultContactTypes = ['领导', '其它', '同学', '朋友', '亲戚', '同事'];
    for (const name of defaultReasons) {
      await pool.query('INSERT INTO reasons (user_id, name) VALUES (?, ?)', [result.insertId, name]);
    }
    for (const name of defaultContactTypes) {
      await pool.query('INSERT INTO contact_types (user_id, name) VALUES (?, ?)', [result.insertId, name]);
    }
    res.json({ id: result.insertId, username, role: role || 'user' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '新增用户失败' });
  }
});

// 更新用户角色（管理员）
router.put('/:id/role', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'user'].includes(role)) return res.status(400).json({ error: '无效的角色' });
    if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: '无法修改当前登录的管理员角色' });
    await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '更新用户角色失败' });
  }
});

// 删除用户（管理员）
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: '无法删除当前登录的管理员账号' });
    // 删除关联数据
    await pool.query('DELETE FROM gifts_received WHERE user_id = ?', [req.params.id]);
    await pool.query('DELETE FROM gifts_given WHERE user_id = ?', [req.params.id]);
    await pool.query('DELETE FROM gift_books WHERE user_id = ?', [req.params.id]);
    await pool.query('DELETE FROM reasons WHERE user_id = ?', [req.params.id]);
    await pool.query('DELETE FROM contact_types WHERE user_id = ?', [req.params.id]);
    await pool.query('DELETE FROM contacts WHERE user_id = ?', [req.params.id]);
    await pool.query('DELETE FROM webdav_configs WHERE user_id = ?', [req.params.id]);
    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除用户失败' });
  }
});

// 系统设置
router.get('/system', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [result] = await pool.query('SELECT 1 as connected');
    const [userCount] = await pool.query('SELECT COUNT(*) as count FROM users');
    res.json({
      version: '1.0.0',
      dbConnected: result.length > 0,
      userCount: userCount[0].count
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取系统信息失败' });
  }
});

module.exports = router;
