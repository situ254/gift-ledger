const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

// 获取所有亲友类型
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM contact_types WHERE user_id = ? ORDER BY id', [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取亲友类型列表失败' });
  }
});

// 新增亲友类型
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: '亲友类型名称不能为空' });
    const [existing] = await pool.query('SELECT id FROM contact_types WHERE name = ? AND user_id = ?', [name, req.user.id]);
    if (existing.length > 0) return res.status(400).json({ error: '亲友类型名称已存在，请更换' });
    const [result] = await pool.query('INSERT INTO contact_types (user_id, name) VALUES (?, ?)', [req.user.id, name]);
    res.json({ id: result.insertId, name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '新增亲友类型失败' });
  }
});

// 更新亲友类型
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: '亲友类型名称不能为空' });
    const [existing] = await pool.query('SELECT id FROM contact_types WHERE name = ? AND user_id = ? AND id != ?', [name, req.user.id, req.params.id]);
    if (existing.length > 0) return res.status(400).json({ error: '亲友类型名称已存在，请更换' });
    await pool.query('UPDATE contact_types SET name = ? WHERE id = ? AND user_id = ?', [name, req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '更新亲友类型失败' });
  }
});

// 删除亲友类型
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [giftsReceived] = await pool.query('SELECT id FROM gifts_received WHERE contact_type_id = ? AND user_id = ?', [req.params.id, req.user.id]);
    const [giftsGiven] = await pool.query('SELECT id FROM gifts_given WHERE contact_type_id = ? AND user_id = ?', [req.params.id, req.user.id]);
    const [contacts] = await pool.query('SELECT id FROM contacts WHERE type_id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (giftsReceived.length > 0 || giftsGiven.length > 0 || contacts.length > 0) {
      return res.status(400).json({ error: '该亲友类型已被使用，无法删除' });
    }
    await pool.query('DELETE FROM contact_types WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除亲友类型失败' });
  }
});

module.exports = router;
