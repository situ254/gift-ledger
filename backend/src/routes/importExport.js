const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { importFromWorkbook } = require('../importHelper');
const { formatDateWithLunar, lunarDate } = require('../utils/lunar');

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

/**
 * 查询收礼 / 随礼明细
 * Excel 导出与文本导出共用同一份查询，保证两个出口的日期、金额完全一致
 */
async function fetchRows(userId, type, dateFrom, dateTo) {
  const result = { received: [], given: [] };

  if (type === 'received' || type === 'all' || !type) {
    let sql = `SELECT gr.contact_name, ct.name as contact_type_name, gr.amount, gb.name as gift_book_name,
                      COALESCE(gb.date, gr.gift_book_date) as gift_book_date, r.name as reason_name, gr.notes,
                      strftime('%Y-%m-%d', gr.created_at) as created_date
        FROM gifts_received gr
        LEFT JOIN contact_types ct ON gr.contact_type_id = ct.id
        LEFT JOIN gift_books gb ON gr.gift_book_id = gb.id
        LEFT JOIN reasons r ON gb.reason_id = r.id
        WHERE gr.user_id = ?`;
    const params = [userId];
    if (dateFrom) { sql += ' AND COALESCE(gb.date, gr.gift_book_date) >= ?'; params.push(dateFrom); }
    if (dateTo) { sql += ' AND COALESCE(gb.date, gr.gift_book_date) <= ?'; params.push(dateTo); }
    sql += ' ORDER BY gift_book_date DESC, gr.id DESC';
    const [rows] = await pool.query(sql, params);
    result.received = rows;
  }

  if (type === 'given' || type === 'all' || !type) {
    let sql = `SELECT gg.contact_name, ct.name as contact_type_name, gg.amount, gg.gift_date,
                      r.name as reason_name, gg.notes, strftime('%Y-%m-%d', gg.created_at) as created_date
        FROM gifts_given gg
        LEFT JOIN contact_types ct ON gg.contact_type_id = ct.id
        LEFT JOIN reasons r ON gg.reason_id = r.id
        WHERE gg.user_id = ?`;
    const params = [userId];
    if (dateFrom) { sql += ' AND gg.gift_date >= ?'; params.push(dateFrom); }
    if (dateTo) { sql += ' AND gg.gift_date <= ?'; params.push(dateTo); }
    sql += ' ORDER BY gg.gift_date DESC, gg.id DESC';
    const [rows] = await pool.query(sql, params);
    result.given = rows;
  }

  return result;
}

// 导出Excel
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const { type, date_from, date_to } = req.query;
    const wb = XLSX.utils.book_new();

    const [users] = await pool.query('SELECT username FROM users WHERE id = ?', [req.user.id]);
    const username = users.length > 0 ? users[0].username : 'unknown';

    const { received, given } = await fetchRows(req.user.id, type || 'all', date_from, date_to);

    if (received.length > 0 || type === 'received') {
      const rows = received.map(r => ({
        '亲友姓名': r.contact_name,
        '亲友类型': r.contact_type_name || '',
        '金额': r.amount,
        '事由': r.reason_name || '',
        '所属礼簿': r.gift_book_name || '',
        '礼簿日期': r.gift_book_date ? String(r.gift_book_date).slice(0, 10) : '',
        // 与页面同一口径：农历YYYY干支生肖年X月XX
        '农历日期': lunarDate(r.gift_book_date),
        '备注': r.notes || '',
        '创建日期': r.created_date || '',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, '收礼');
    }

    if (given.length > 0 || type === 'given') {
      const rows = given.map(r => ({
        '亲友姓名': r.contact_name,
        '亲友类型': r.contact_type_name || '',
        '金额': r.amount,
        '事由': r.reason_name || '',
        '随礼日期': r.gift_date ? String(r.gift_date).slice(0, 10) : '',
        '农历日期': lunarDate(r.gift_date),
        '备注': r.notes || '',
        '创建日期': r.created_date || '',
      }));
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

// 导出文本（.txt）
// 所有日期统一输出「公历（农历YYYY干支生肖年X月XX）」，与页面展示完全一致
router.get('/export-text', authMiddleware, async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    const [users] = await pool.query('SELECT username FROM users WHERE id = ?', [req.user.id]);
    const username = users.length > 0 ? users[0].username : 'unknown';

    const { received, given } = await fetchRows(req.user.id, 'all', date_from, date_to);

    const sum = list => list.reduce((s, r) => s + Number(r.amount || 0), 0);
    const money = n => `¥${Number(n || 0).toFixed(2)}`;
    const today = new Date().toISOString().slice(0, 10);

    const lines = [];
    lines.push('人情记账 · 数据导出');
    lines.push(`账号：${username}`);
    lines.push(`导出日期：${formatDateWithLunar(today)}`);
    if (date_from || date_to) {
      lines.push(`统计区间：${date_from || '最早'} 至 ${date_to || '最新'}`);
    }
    lines.push(`收礼合计：${received.length} 笔 / ${money(sum(received))}`);
    lines.push(`随礼合计：${given.length} 笔 / ${money(sum(given))}`);
    lines.push(`人情差额：${money(sum(received) - sum(given))}`);
    lines.push('');

    const recordLine = (r, idx, withBook) => {
      const date = withBook ? r.gift_book_date : r.gift_date;
      const parts = [
        `${idx + 1}. ${r.contact_name}`,
        `事由：${r.reason_name || r.gift_book_name || '其它'}`,
        `关系：${r.contact_type_name || '其它'}`,
      ];
      if (withBook && r.gift_book_name) parts.push(`礼簿：${r.gift_book_name}`);
      parts.push(`日期：${formatDateWithLunar(date)}`);
      parts.push(money(r.amount));
      if (r.notes) parts.push(`备注：${r.notes}`);
      return parts.join(' | ');
    };

    lines.push('================ 收礼明细 ================');
    if (received.length === 0) lines.push('（暂无记录）');
    else received.forEach((r, i) => lines.push(recordLine(r, i, true)));
    lines.push('');

    lines.push('================ 随礼明细 ================');
    if (given.length === 0) lines.push('（暂无记录）');
    else given.forEach((r, i) => lines.push(recordLine(r, i, false)));
    lines.push('');

    lines.push('—— 由人情记账导出 ——');

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `人情笔记_${username}_${dateStr}.txt`;
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    // 带 BOM，Windows 记事本打开不会乱码
    res.send(`\uFEFF${lines.join('\r\n')}`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '导出文本失败' });
  }
});

// 下载导入模板
router.get('/template', authMiddleware, async (req, res) => {
  try {
    const wb = XLSX.utils.book_new();
    const receivedData = [
      { '亲友姓名': '张安桃', '亲友类型': '同事', '金额': 300, '所属礼簿': '丧事', '礼簿日期': '2026-04-27', '农历日期': lunarDate('2026-04-27'), '备注': '丈母去世，返100', '创建日期': '2026-04-27' },
      { '亲友姓名': '刘效然', '亲友类型': '同事', '金额': 300, '所属礼簿': '婚礼', '礼簿日期': '2025-10-02', '农历日期': lunarDate('2025-10-02'), '备注': '', '创建日期': '2025-10-02' },
    ];
    const givenData = [
      { '亲友姓名': '张安桃', '亲友类型': '同事', '金额': 300, '事由': '丧事', '随礼日期': '2026-04-27', '农历日期': lunarDate('2026-04-27'), '备注': '丈母去世，返100', '创建日期': '2026-04-27' },
      { '亲友姓名': '刘效然', '亲友类型': '同事', '金额': 300, '事由': '婚礼', '随礼日期': '2025-10-02', '农历日期': lunarDate('2025-10-02'), '备注': '', '创建日期': '2025-10-02' },
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
