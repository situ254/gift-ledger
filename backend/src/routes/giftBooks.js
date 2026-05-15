const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

// 获取所有礼簿
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT gb.*, r.name as reason_name FROM gift_books gb LEFT JOIN reasons r ON gb.reason_id = r.id WHERE gb.user_id = ? ORDER BY gb.date DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取礼簿列表失败' });
  }
});

// 获取单个礼簿
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT gb.*, r.name as reason_name FROM gift_books gb LEFT JOIN reasons r ON gb.reason_id = r.id WHERE gb.id = ? AND gb.user_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: '礼簿不存在' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取礼簿失败' });
  }
});

// 新增礼簿
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, date, reason_id } = req.body;
    if (!name || !date) {
      return res.status(400).json({ error: '礼簿名称和日期不能为空' });
    }
    const [existing] = await pool.query('SELECT id FROM gift_books WHERE name = ? AND user_id = ?', [name, req.user.id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: '礼簿名称已存在，请更换' });
    }
    const [result] = await pool.query(
      'INSERT INTO gift_books (user_id, name, date, reason_id) VALUES (?, ?, ?, ?)',
      [req.user.id, name, date, reason_id || null]
    );
    res.json({ id: result.insertId, name, date, reason_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '新增礼簿失败' });
  }
});

// 更新礼簿
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, date, reason_id } = req.body;
    if (!name || !date) {
      return res.status(400).json({ error: '礼簿名称和日期不能为空' });
    }
    const [existing] = await pool.query('SELECT id FROM gift_books WHERE name = ? AND user_id = ? AND id != ?', [name, req.user.id, req.params.id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: '礼簿名称已存在，请更换' });
    }
    await pool.query(
      'UPDATE gift_books SET name = ?, date = ?, reason_id = ? WHERE id = ? AND user_id = ?',
      [name, date, reason_id || null, req.params.id, req.user.id]
    );
    // 同步更新关联收礼记录的礼簿日期
    await pool.query(
      'UPDATE gifts_received SET gift_book_date = ? WHERE gift_book_id = ? AND user_id = ?',
      [date, req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '更新礼簿失败' });
  }
});

// 删除礼簿
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { deleteRecords } = req.query;
    const [records] = await pool.query('SELECT id FROM gifts_received WHERE gift_book_id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (records.length > 0 && deleteRecords !== 'true') {
      return res.status(400).json({ error: '该礼簿下存在关联收礼记录，请确认是否同时删除关联收礼记录', hasRecords: true, recordCount: records.length });
    }
    if (records.length > 0 && deleteRecords === 'true') {
      await pool.query('DELETE FROM gifts_received WHERE gift_book_id = ? AND user_id = ?', [req.params.id, req.user.id]);
    }
    await pool.query('DELETE FROM gift_books WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除礼簿失败' });
  }
});

module.exports = router;
