const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

// 获取所有亲友（含统计信息）
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT c.*, ct.name as type_name FROM contacts c LEFT JOIN contact_types ct ON c.type_id = ct.id WHERE c.user_id = ? ORDER BY c.id DESC',
      [req.user.id]
    );

    // 为每个亲友附加收礼/随礼统计
    const contacts = await Promise.all(rows.map(async (c) => {
      const [received] = await pool.query(
        'SELECT COALESCE(SUM(amount), 0) as total FROM gifts_received WHERE user_id = ? AND contact_name = ?',
        [req.user.id, c.name]
      );
      const [given] = await pool.query(
        'SELECT COALESCE(SUM(amount), 0) as total FROM gifts_given WHERE user_id = ? AND contact_name = ?',
        [req.user.id, c.name]
      );
      const totalReceived = Number(received[0].total);
      const totalGiven = Number(given[0].total);
      return {
        ...c,
        total_received: totalReceived,
        total_given: totalGiven,
        net: totalReceived - totalGiven
      };
    }));

    res.json(contacts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取亲友列表失败' });
  }
});

// 获取亲友详情（收礼/随礼记录+统计）
router.get('/:name/detail', authMiddleware, async (req, res) => {
  try {
    const contactName = decodeURIComponent(req.params.name);

    // 收礼记录
    const [received] = await pool.query(
      `SELECT gr.*, ct.name as contact_type_name, gb.name as gift_book_name, gb.date as gift_book_date, r.name as reason_name
      FROM gifts_received gr
      LEFT JOIN contact_types ct ON gr.contact_type_id = ct.id
      LEFT JOIN gift_books gb ON gr.gift_book_id = gb.id
      LEFT JOIN reasons r ON gb.reason_id = r.id
      WHERE gr.user_id = ? AND gr.contact_name = ?
      ORDER BY gr.gift_book_date DESC`,
      [req.user.id, contactName]
    );

    // 随礼记录
    const [given] = await pool.query(
      `SELECT gg.*, ct.name as contact_type_name, r.name as reason_name
      FROM gifts_given gg
      LEFT JOIN contact_types ct ON gg.contact_type_id = ct.id
      LEFT JOIN reasons r ON gg.reason_id = r.id
      WHERE gg.user_id = ? AND gg.contact_name = ?
      ORDER BY gg.gift_date DESC`,
      [req.user.id, contactName]
    );

    const totalReceived = received.reduce((s, r) => s + Number(r.amount), 0);
    const totalGiven = given.reduce((s, r) => s + Number(r.amount), 0);

    res.json({
      contact_name: contactName,
      received_records: received,
      given_records: given,
      total_received: totalReceived,
      total_given: totalGiven,
      net: totalReceived - totalGiven
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取亲友详情失败' });
  }
});

// 新增亲友
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, type_id } = req.body;
    if (!name) return res.status(400).json({ error: '亲友姓名不能为空' });
    const [existing] = await pool.query('SELECT id FROM contacts WHERE name = ? AND user_id = ?', [name, req.user.id]);
    if (existing.length > 0) return res.status(400).json({ error: '亲友姓名已存在' });
    const [result] = await pool.query('INSERT INTO contacts (user_id, name, type_id) VALUES (?, ?, ?)', [req.user.id, name, type_id || null]);
    res.json({ id: result.insertId, name, type_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '新增亲友失败' });
  }
});

// 更新亲友
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, type_id } = req.body;
    if (!name) return res.status(400).json({ error: '亲友姓名不能为空' });
    const [existing] = await pool.query('SELECT id FROM contacts WHERE name = ? AND user_id = ? AND id != ?', [name, req.user.id, req.params.id]);
    if (existing.length > 0) return res.status(400).json({ error: '亲友姓名已存在' });
    await pool.query('UPDATE contacts SET name = ?, type_id = ? WHERE id = ? AND user_id = ?', [name, type_id || null, req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '更新亲友失败' });
  }
});

// 删除亲友
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM contacts WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除亲友失败' });
  }
});

module.exports = router;
