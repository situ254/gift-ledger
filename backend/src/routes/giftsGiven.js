const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

// 获取随礼列表
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { contact_name, date_from, date_to, reason_id, year } = req.query;
    let sql = `SELECT gg.*, ct.name as contact_type_name, r.name as reason_name
      FROM gifts_given gg
      LEFT JOIN contact_types ct ON gg.contact_type_id = ct.id
      LEFT JOIN reasons r ON gg.reason_id = r.id
      WHERE gg.user_id = ?`;
    const params = [req.user.id];
    if (contact_name) { sql += ' AND gg.contact_name LIKE ?'; params.push(`%${contact_name}%`); }
    if (date_from) { sql += ' AND gg.gift_date >= ?'; params.push(date_from); }
    if (date_to) { sql += ' AND gg.gift_date <= ?'; params.push(date_to); }
    if (reason_id) { sql += ' AND gg.reason_id = ?'; params.push(reason_id); }
    if (year) { sql += ' AND YEAR(gg.gift_date) = ?'; params.push(year); }
    sql += ' ORDER BY gg.gift_date DESC, gg.id DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取随礼列表失败' });
  }
});

// 新增随礼
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { contact_name, contact_type_id, amount, reason_id, gift_date, notes } = req.body;
    if (!contact_name) return res.status(400).json({ error: '亲友姓名不能为空' });
    if (!amount || amount <= 0) return res.status(400).json({ error: '金额必须大于0' });
    if (!gift_date) return res.status(400).json({ error: '请选择随礼日期' });
    const [result] = await pool.query(
      'INSERT INTO gifts_given (user_id, contact_name, contact_type_id, amount, reason_id, gift_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, contact_name, contact_type_id || null, amount, reason_id || null, gift_date, notes || '']
    );
    res.json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '新增随礼失败' });
  }
});

// 更新随礼
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { contact_name, contact_type_id, amount, reason_id, gift_date, notes } = req.body;
    if (!contact_name) return res.status(400).json({ error: '亲友姓名不能为空' });
    if (!amount || amount <= 0) return res.status(400).json({ error: '金额必须大于0' });
    if (!gift_date) return res.status(400).json({ error: '请选择随礼日期' });
    await pool.query(
      'UPDATE gifts_given SET contact_name = ?, contact_type_id = ?, amount = ?, reason_id = ?, gift_date = ?, notes = ? WHERE id = ? AND user_id = ?',
      [contact_name, contact_type_id || null, amount, reason_id || null, gift_date, notes || '', req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '更新随礼失败' });
  }
});

// 全体删除随礼
router.delete('/', authMiddleware, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM gifts_given WHERE user_id = ?', [req.user.id]);
    res.json({ success: true, deleted: result.affectedRows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除随礼失败' });
  }
});

// 删除随礼
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM gifts_given WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除随礼失败' });
  }
});

module.exports = router;
