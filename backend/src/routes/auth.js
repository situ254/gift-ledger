const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

// 注册
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    if (username.length < 2 || username.length > 20) {
      return res.status(400).json({ error: '用户名长度应在2-20个字符之间' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: '密码长度不能少于4位' });
    }
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ error: '用户名已被使用，请更换' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [username, hashedPassword, 'user']);
    const token = jwt.sign({ id: result.insertId, username, role: 'user' }, JWT_SECRET, { expiresIn: '30d' });
    // 初始化默认数据
    await initUserData(result.insertId);
    res.json({ token, user: { id: result.insertId, username, role: 'user' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '注册失败' });
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(400).json({ error: '用户名或密码错误' });
    }
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(400).json({ error: '用户名或密码错误' });
    }
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '登录失败' });
  }
});

// 获取当前用户信息
router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '未登录' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const [rows] = await pool.query('SELECT id, username, role, created_at FROM users WHERE id = ?', [decoded.id]);
    if (rows.length === 0) return res.status(401).json({ error: '用户不存在' });
    res.json(rows[0]);
  } catch (err) {
    res.status(401).json({ error: '登录已过期' });
  }
});

// 初始化用户默认数据
async function initUserData(userId) {
  const defaultReasons = ['丧事', '孝敬', '其它', '压岁', '生日', '生子', '婚礼'];
  const defaultContactTypes = ['领导', '其它', '同学', '朋友', '亲戚', '同事'];
  for (const name of defaultReasons) {
    await pool.query('INSERT INTO reasons (user_id, name) VALUES (?, ?)', [userId, name]);
  }
  for (const name of defaultContactTypes) {
    await pool.query('INSERT INTO contact_types (user_id, name) VALUES (?, ?)', [userId, name]);
  }
}

module.exports = router;
