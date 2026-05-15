const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

// 汇总统计（增强版：含笔数、按事由/亲友类型分组）
router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const { year } = req.query;

    // 收礼统计
    let receivedYearFilter = '';
    const receivedParams = [req.user.id];
    if (year) { receivedYearFilter = ' AND YEAR(gift_book_date) = ?'; receivedParams.push(year); }

    const [receivedResult] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM gifts_received WHERE user_id = ?${receivedYearFilter}`,
      receivedParams
    );

    // 随礼统计
    let givenYearFilter = '';
    const givenParams = [req.user.id];
    if (year) { givenYearFilter = ' AND YEAR(gift_date) = ?'; givenParams.push(year); }

    const [givenResult] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM gifts_given WHERE user_id = ?${givenYearFilter}`,
      givenParams
    );

    const totalReceived = Number(receivedResult[0].total);
    const receivedCount = Number(receivedResult[0].count);
    const totalGiven = Number(givenResult[0].total);
    const givenCount = Number(givenResult[0].count);

    // 按亲友维度统计
    const [receivedByContact] = await pool.query(
      `SELECT contact_name, SUM(amount) as total_received, COUNT(*) as count FROM gifts_received WHERE user_id = ?${receivedYearFilter} GROUP BY contact_name`,
      receivedParams
    );
    const [givenByContact] = await pool.query(
      `SELECT contact_name, SUM(amount) as total_given, COUNT(*) as count FROM gifts_given WHERE user_id = ?${givenYearFilter} GROUP BY contact_name`,
      givenParams
    );

    const contactMap = {};
    for (const r of receivedByContact) {
      contactMap[r.contact_name] = { contact_name: r.contact_name, received: Number(r.total_received), receivedCount: Number(r.count), given: 0, givenCount: 0 };
    }
    for (const g of givenByContact) {
      if (contactMap[g.contact_name]) {
        contactMap[g.contact_name].given = Number(g.total_given);
        contactMap[g.contact_name].givenCount = Number(g.count);
      } else {
        contactMap[g.contact_name] = { contact_name: g.contact_name, received: 0, receivedCount: 0, given: Number(g.total_given), givenCount: Number(g.count) };
      }
    }

    const netList = Object.values(contactMap).map(c => ({
      ...c,
      net: c.received - c.given
    })).sort((a, b) => Math.abs(b.net) - Math.abs(a.net));

    const oweMe = netList.filter(c => c.net < 0);   // 随礼>收礼 → 别人差我礼
    const iOwe = netList.filter(c => c.net > 0);     // 收礼>随礼 → 我差别人礼

    // 按事由统计（随礼）
    const [byReason] = await pool.query(
      `SELECT COALESCE(r.name, '其它') as name, SUM(gg.amount) as total, COUNT(*) as count
      FROM gifts_given gg LEFT JOIN reasons r ON gg.reason_id = r.id
      WHERE gg.user_id = ?${givenYearFilter}
      GROUP BY r.name ORDER BY total DESC`,
      givenParams
    );

    // 按亲友类型统计（随礼）
    const [byContactTypeGiven] = await pool.query(
      `SELECT COALESCE(ct.name, '其它') as name, SUM(gg.amount) as total, COUNT(*) as count
      FROM gifts_given gg LEFT JOIN contact_types ct ON gg.contact_type_id = ct.id
      WHERE gg.user_id = ?${givenYearFilter}
      GROUP BY ct.name ORDER BY total DESC`,
      givenParams
    );

    // 按事由统计（收礼 - 通过礼簿关联）
    const [byReasonReceived] = await pool.query(
      `SELECT COALESCE(r.name, '其它') as name, SUM(gr.amount) as total, COUNT(*) as count
      FROM gifts_received gr LEFT JOIN gift_books gb ON gr.gift_book_id = gb.id LEFT JOIN reasons r ON gb.reason_id = r.id
      WHERE gr.user_id = ?${receivedYearFilter}
      GROUP BY r.name ORDER BY total DESC`,
      receivedParams
    );

    // 按亲友类型统计（收礼）
    const [byContactTypeReceived] = await pool.query(
      `SELECT COALESCE(ct.name, '其它') as name, SUM(gr.amount) as total, COUNT(*) as count
      FROM gifts_received gr LEFT JOIN contact_types ct ON gr.contact_type_id = ct.id
      WHERE gr.user_id = ?${receivedYearFilter}
      GROUP BY ct.name ORDER BY total DESC`,
      receivedParams
    );

    // 可用年份列表
    const [yearsReceived] = await pool.query('SELECT DISTINCT YEAR(gift_book_date) as year FROM gifts_received WHERE user_id = ? ORDER BY year DESC', [req.user.id]);
    const [yearsGiven] = await pool.query('SELECT DISTINCT YEAR(gift_date) as year FROM gifts_given WHERE user_id = ? ORDER BY year DESC', [req.user.id]);
    const yearSet = new Set();
    for (const y of yearsReceived) if (y.year) yearSet.add(y.year);
    for (const y of yearsGiven) if (y.year) yearSet.add(y.year);
    const years = [...yearSet].sort((a, b) => b - a);

    // 按亲友类型统计（合并收礼+随礼）
    const contactTypeCombined = {};
    for (const r of byContactTypeGiven) {
      contactTypeCombined[r.name] = { name: r.name, total: Number(r.total), count: Number(r.count) };
    }
    for (const r of byContactTypeReceived) {
      if (contactTypeCombined[r.name]) {
        contactTypeCombined[r.name].total += Number(r.total);
        contactTypeCombined[r.name].count += Number(r.count);
      } else {
        contactTypeCombined[r.name] = { name: r.name, total: Number(r.total), count: Number(r.count) };
      }
    }
    const byContactType = Object.values(contactTypeCombined).sort((a, b) => b.total - a.total);

    // 按事由统计（合并收礼+随礼）
    const reasonCombined = {};
    for (const r of byReason) {
      reasonCombined[r.name] = { name: r.name, total: Number(r.total), count: Number(r.count) };
    }
    for (const r of byReasonReceived) {
      if (reasonCombined[r.name]) {
        reasonCombined[r.name].total += Number(r.total);
        reasonCombined[r.name].count += Number(r.count);
      } else {
        reasonCombined[r.name] = { name: r.name, total: Number(r.total), count: Number(r.count) };
      }
    }
    const byReasonAll = Object.values(reasonCombined).sort((a, b) => b.total - a.total);

    res.json({
      totalReceived,
      receivedCount,
      totalGiven,
      givenCount,
      netAmount: totalReceived - totalGiven,
      oweMe,
      iOwe,
      netList,
      byReason: byReasonAll,
      byContactType,
      byReasonGiven: byReason.map(r => ({ name: r.name, total: Number(r.total), count: Number(r.count) })),
      byContactTypeGiven: byContactTypeGiven.map(r => ({ name: r.name, total: Number(r.total), count: Number(r.count) })),
      byReasonReceived: byReasonReceived.map(r => ({ name: r.name, total: Number(r.total), count: Number(r.count) })),
      byContactTypeReceived: byContactTypeReceived.map(r => ({ name: r.name, total: Number(r.total), count: Number(r.count) })),
      availableYears: years,
      currentYear: new Date().getFullYear()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

// 人情查询
router.get('/query', authMiddleware, async (req, res) => {
  try {
    const { contact_name, date_from, date_to, type, gift_book_id, reason_id } = req.query;
    let results = [];

    if (!type || type === 'received') {
      let sql = `SELECT 'received' as type, gr.id, gr.contact_name, ct.name as contact_type_name, gr.amount, gr.gift_book_date as date, gb.name as gift_book_name, r.name as reason_name, gr.notes, gr.created_at
        FROM gifts_received gr
        LEFT JOIN contact_types ct ON gr.contact_type_id = ct.id
        LEFT JOIN gift_books gb ON gr.gift_book_id = gb.id
        LEFT JOIN reasons r ON gb.reason_id = r.id
        WHERE gr.user_id = ?`;
      const params = [req.user.id];
      if (contact_name) { sql += ' AND gr.contact_name LIKE ?'; params.push(`%${contact_name}%`); }
      if (date_from) { sql += ' AND gr.gift_book_date >= ?'; params.push(date_from); }
      if (date_to) { sql += ' AND gr.gift_book_date <= ?'; params.push(date_to); }
      if (gift_book_id) { sql += ' AND gr.gift_book_id = ?'; params.push(gift_book_id); }
      const [rows] = await pool.query(sql, params);
      results = results.concat(rows);
    }

    if (!type || type === 'given') {
      let sql = `SELECT 'given' as type, gg.id, gg.contact_name, ct.name as contact_type_name, gg.amount, gg.gift_date as date, NULL as gift_book_name, r.name as reason_name, gg.notes, gg.created_at
        FROM gifts_given gg
        LEFT JOIN contact_types ct ON gg.contact_type_id = ct.id
        LEFT JOIN reasons r ON gg.reason_id = r.id
        WHERE gg.user_id = ?`;
      const params = [req.user.id];
      if (contact_name) { sql += ' AND gg.contact_name LIKE ?'; params.push(`%${contact_name}%`); }
      if (date_from) { sql += ' AND gg.gift_date >= ?'; params.push(date_from); }
      if (date_to) { sql += ' AND gg.gift_date <= ?'; params.push(date_to); }
      if (reason_id) { sql += ' AND gg.reason_id = ?'; params.push(reason_id); }
      const [rows] = await pool.query(sql, params);
      results = results.concat(rows);
    }

    results.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '查询失败' });
  }
});

module.exports = router;
