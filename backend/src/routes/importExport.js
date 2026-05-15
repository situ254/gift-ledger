const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { importFromWorkbook, formatDate } = require('../importHelper');

const upload = multer({ dest: '/tmp/uploads/' });

// 导入Excel
router.post('/import', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请上传Excel文件' });

    const workbook = XLSX.readFile(req.file.path);
    const result = await importFromWorkbook(workbook, req.user.id, XLSX, { dedup: true, showErrors: true });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '导入失败，请检查文件格式' });
  }
});

// 导出Excel
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const { type, date_from, date_to } = req.query;
    const wb = XLSX.utils.book_new();

    // 获取用户名用于文件名
    const [users] = await pool.query('SELECT username FROM users WHERE id = ?', [req.user.id]);
    const username = users.length > 0 ? users[0].username : 'unknown';

    if (type === 'received' || type === 'all') {
      let sql = `SELECT gr.contact_name as '亲友姓名', ct.name as '亲友类型', gr.amount as '金额', gb.name as '所属礼簿', gr.gift_book_date as '礼簿日期', gr.notes as '备注', DATE_FORMAT(gr.created_at, '%Y-%m-%d %H:%i:%s') as '创建时间'
        FROM gifts_received gr LEFT JOIN contact_types ct ON gr.contact_type_id = ct.id LEFT JOIN gift_books gb ON gr.gift_book_id = gb.id WHERE gr.user_id = ?`;
      const params = [req.user.id];
      if (date_from) { sql += ' AND gr.gift_book_date >= ?'; params.push(date_from); }
      if (date_to) { sql += ' AND gr.gift_book_date <= ?'; params.push(date_to); }
      const [rows] = await pool.query(sql, params);
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, '收礼');
    }

    if (type === 'given' || type === 'all') {
      let sql = `SELECT gg.contact_name as '亲友姓名', ct.name as '亲友类型', gg.amount as '金额', r.name as '事由', gg.gift_date as '随礼日期', gg.notes as '备注', DATE_FORMAT(gg.created_at, '%Y-%m-%d %H:%i:%s') as '创建时间'
        FROM gifts_given gg LEFT JOIN contact_types ct ON gg.contact_type_id = ct.id LEFT JOIN reasons r ON gg.reason_id = r.id WHERE gg.user_id = ?`;
      const params = [req.user.id];
      if (date_from) { sql += ' AND gg.gift_date >= ?'; params.push(date_from); }
      if (date_to) { sql += ' AND gg.gift_date <= ?'; params.push(date_to); }
      const [rows] = await pool.query(sql, params);
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, '随礼');
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `人情笔记_${username}_${dateStr}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '导出失败' });
  }
});

// 下载导入模板
router.get('/template', authMiddleware, async (req, res) => {
  try {
    const wb = XLSX.utils.book_new();
    const receivedData = [
      { '亲友姓名': '张安桃', '亲友类型': '同事', '金额': 300, '所属礼簿': '丧事', '礼簿日期': '2026-04-27', '备注': '丈母去世，返100', '创建时间': '2026-04-27 10:45:58' },
      { '亲友姓名': '刘效然', '亲友类型': '同事', '金额': 300, '所属礼簿': '婚礼', '礼簿日期': '2025-10-02', '备注': '', '创建时间': '2025-10-02 09:15:34' },
    ];
    const givenData = [
      { '亲友姓名': '张安桃', '亲友类型': '同事', '金额': 300, '事由': '丧事', '随礼日期': '2026-04-27', '备注': '丈母去世，返100', '创建时间': '2026-04-27 10:45:58' },
      { '亲友姓名': '刘效然', '亲友类型': '同事', '金额': 300, '事由': '婚礼', '随礼日期': '2025-10-02', '备注': '', '创建时间': '2025-10-02 09:15:34' },
    ];
    const ws1 = XLSX.utils.json_to_sheet(receivedData);
    const ws2 = XLSX.utils.json_to_sheet(givenData);
    XLSX.utils.book_append_sheet(wb, ws1, '收礼');
    XLSX.utils.book_append_sheet(wb, ws2, '随礼');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="import_template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '下载模板失败' });
  }
});

module.exports = router;
