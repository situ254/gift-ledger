const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

// 获取所有事由
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM reasons WHERE user_id = ? ORDER BY id', [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取事由列表失败' });
  }
});

// 新增事由
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: '事由名称不能为空' });
    const [existing] = await pool.query('SELECT id FROM reasons WHERE name = ? AND user_id = ?', [name, req.user.id]);
    if (existing.length > 0) return res.status(400).json({ error: '事由名称已存在，请更换' });
    const [result] = await pool.query('INSERT INTO reasons (user_id, name) VALUES (?, ?)', [req.user.id, name]);
    res.json({ id: result.insertId, name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '新增事由失败' });
  }
});

// 更新事由
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: '事由名称不能为空' });
    const [existing] = await pool.query('SELECT id FROM reasons WHERE name = ? AND user_id = ? AND id != ?', [name, req.user.id, req.params.id]);
    if (existing.length > 0) return res.status(400).json({ error: '事由名称已存在，请更换' });
    await pool.query('UPDATE reasons SET name = ? WHERE id = ? AND user_id = ?', [name, req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '更新事由失败' });
  }
});

// 删除事由
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [giftsGiven] = await pool.query('SELECT id FROM gifts_given WHERE reason_id = ? AND user_id = ?', [req.params.id, req.user.id]);
    const [giftBooks] = await pool.query('SELECT id FROM gift_books WHERE reason_id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (giftsGiven.length > 0 || giftBooks.length > 0) {
      return res.status(400).json({ error: '该事由已被使用，无法删除' });
    }
    await pool.query('DELETE FROM reasons WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除事由失败' });
  }
});

module.exports = router;
