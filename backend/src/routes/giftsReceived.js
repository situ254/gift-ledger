const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

// 获取收礼列表
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { gift_book_id, contact_name, date_from, date_to, year } = req.query;
    let sql = `SELECT gr.*, ct.name as contact_type_name, gb.name as gift_book_name, gb.date as gift_book_date, r.name as reason_name
      FROM gifts_received gr
      LEFT JOIN contact_types ct ON gr.contact_type_id = ct.id
      LEFT JOIN gift_books gb ON gr.gift_book_id = gb.id
      LEFT JOIN reasons r ON gb.reason_id = r.id
      WHERE gr.user_id = ?`;
    const params = [req.user.id];
    if (gift_book_id) { sql += ' AND gr.gift_book_id = ?'; params.push(gift_book_id); }
    if (contact_name) { sql += ' AND gr.contact_name LIKE ?'; params.push(`%${contact_name}%`); }
    if (date_from) { sql += ' AND gr.gift_book_date >= ?'; params.push(date_from); }
    if (date_to) { sql += ' AND gr.gift_book_date <= ?'; params.push(date_to); }
    if (year) { sql += ' AND YEAR(gr.gift_book_date) = ?'; params.push(year); }
    sql += ' ORDER BY gr.gift_book_date DESC, gr.id DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取收礼列表失败' });
  }
});

// 新增收礼
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { contact_name, contact_type_id, amount, gift_book_id, gift_book_date, notes } = req.body;
    if (!contact_name) return res.status(400).json({ error: '亲友姓名不能为空' });
    if (!amount || amount <= 0) return res.status(400).json({ error: '金额必须大于0' });
    if (!gift_book_id) return res.status(400).json({ error: '请选择所属礼簿' });
    // 获取礼簿日期
    const [bookRows] = await pool.query('SELECT date FROM gift_books WHERE id = ? AND user_id = ?', [gift_book_id, req.user.id]);
    if (bookRows.length === 0) return res.status(400).json({ error: '礼簿不存在' });
    const bookDate = bookRows[0].date;
    const [result] = await pool.query(
      'INSERT INTO gifts_received (user_id, contact_name, contact_type_id, amount, gift_book_id, gift_book_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, contact_name, contact_type_id || null, amount, gift_book_id, bookDate, notes || '']
    );
    res.json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '新增收礼失败' });
  }
});

// 更新收礼
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { contact_name, contact_type_id, amount, gift_book_id, gift_book_date, notes } = req.body;
    if (!contact_name) return res.status(400).json({ error: '亲友姓名不能为空' });
    if (!amount || amount <= 0) return res.status(400).json({ error: '金额必须大于0' });
    if (!gift_book_id) return res.status(400).json({ error: '请选择所属礼簿' });
    const [bookRows] = await pool.query('SELECT date FROM gift_books WHERE id = ? AND user_id = ?', [gift_book_id, req.user.id]);
    if (bookRows.length === 0) return res.status(400).json({ error: '礼簿不存在' });
    const bookDate = bookRows[0].date;
    await pool.query(
      'UPDATE gifts_received SET contact_name = ?, contact_type_id = ?, amount = ?, gift_book_id = ?, gift_book_date = ?, notes = ? WHERE id = ? AND user_id = ?',
      [contact_name, contact_type_id || null, amount, gift_book_id, bookDate, notes || '', req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '更新收礼失败' });
  }
});

// 全体删除收礼
router.delete('/', authMiddleware, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM gifts_received WHERE user_id = ?', [req.user.id]);
    res.json({ success: true, deleted: result.affectedRows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除收礼失败' });
  }
});

// 删除收礼
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM gifts_received WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除收礼失败' });
  }
});

module.exports = router;
