const pool = require('./db');

/**
 * 智能检测Excel文件中的收礼/随礼sheet
 * 1. 先精确匹配sheet名"收礼"/"随礼"
 * 2. 再模糊匹配含"收"/"随"的sheet名
 * 3. 最后按列头自动判断：含"所属礼簿"→收礼，含"事由"→随礼
 */
function detectSheets(workbook) {
  let receivedSheet = null;
  let givenSheet = null;

  // 第1轮：精确匹配
  for (const name of workbook.SheetNames) {
    if (name === '收礼') receivedSheet = { name, sheet: workbook.Sheets[name] };
    if (name === '随礼') givenSheet = { name, sheet: workbook.Sheets[name] };
  }

  // 第2轮：模糊匹配
  if (!receivedSheet || !givenSheet) {
    for (const name of workbook.SheetNames) {
      if (!receivedSheet && (name.includes('收'))) {
        receivedSheet = { name, sheet: workbook.Sheets[name] };
      }
      if (!givenSheet && (name.includes('随'))) {
        givenSheet = { name, sheet: workbook.Sheets[name] };
      }
    }
  }

  // 第3轮：按列头判断（针对单sheet文件或sheet名不规范的文件）
  if (!receivedSheet || !givenSheet) {
    for (const name of workbook.SheetNames) {
      const sheet = workbook.Sheets[name];
      const rows = XLSX ? XLSX.utils.sheet_to_json(sheet, { header: 1 }) : [];
      if (rows.length === 0) continue;
      const headers = (rows[0] || []).map(h => String(h).trim());

      const isReceived = headers.includes('所属礼簿') || headers.includes('礼簿日期');
      const isGiven = headers.includes('事由') || headers.includes('随礼日期');

      if (!receivedSheet && isReceived) {
        receivedSheet = { name, sheet };
      }
      if (!givenSheet && isGiven) {
        givenSheet = { name, sheet };
      }
      // 如果只有一个sheet且判断为收礼
      if (!receivedSheet && !givenSheet && workbook.SheetNames.length === 1 && isReceived) {
        receivedSheet = { name, sheet };
      }
      if (!receivedSheet && !givenSheet && workbook.SheetNames.length === 1 && isGiven) {
        givenSheet = { name, sheet };
      }
    }
  }

  return { receivedSheet, givenSheet };
}

let XLSX = null;

/**
 * 导入收礼数据行
 */
async function importReceivedRows(rows, userId, dedup = true) {
  const result = { success: 0, fail: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const contactName = row['亲友姓名'];
      const contactTypeName = row['亲友类型'];
      const amount = parseFloat(row['金额']);
      const giftBookName = row['所属礼簿'];
      const giftBookDate = formatDate(row['礼簿日期']);
      const notes = row['备注']?.trim() || null;
      const createdAt = formatDateTime(row['创建时间']);

      if (!contactName || isNaN(amount) || amount <= 0 || !giftBookName || !giftBookDate) {
        result.fail++;
        result.errors.push(`第${i + 2}行：缺少必填字段或金额无效（${contactName || '无名'} ${amount || 0}元）`);
        continue;
      }

      // 查找或创建礼簿
      let [books] = await pool.query('SELECT id FROM gift_books WHERE name = ? AND user_id = ?', [giftBookName, userId]);
      let giftBookId;
      if (books.length > 0) {
        giftBookId = books[0].id;
      } else {
        const [bookResult] = await pool.query('INSERT INTO gift_books (user_id, name, date) VALUES (?, ?, ?)', [userId, giftBookName, giftBookDate]);
        giftBookId = bookResult.insertId;
      }

      // 查找亲友类型
      let contactTypeId = null;
      if (contactTypeName) {
        const [types] = await pool.query('SELECT id FROM contact_types WHERE name = ? AND user_id = ?', [contactTypeName, userId]);
        if (types.length > 0) contactTypeId = types[0].id;
      }

      // 去重检查：含备注+创建时间，确保仅字段完全一致才视为重复
      if (dedup) {
        let dedupSql = 'SELECT id FROM gifts_received WHERE user_id = ? AND contact_name = ? AND amount = ? AND gift_book_id = ? AND gift_book_date = ?';
        const dedupParams = [userId, contactName, amount, giftBookId, giftBookDate];
        if (notes) {
          dedupSql += ' AND notes = ?';
          dedupParams.push(notes);
        } else {
          dedupSql += ' AND notes IS NULL';
        }
        if (createdAt) {
          dedupSql += ' AND created_at = ?';
          dedupParams.push(createdAt);
        }
        const [existing] = await pool.query(dedupSql, dedupParams);
        if (existing.length > 0) {
          result.fail++;
          result.errors.push(`第${i + 2}行：${contactName} ${amount}元 ${giftBookDate} 完全重复，跳过`);
          continue;
        }
      }

      if (createdAt) {
        await pool.query(
          'INSERT INTO gifts_received (user_id, contact_name, contact_type_id, amount, gift_book_id, gift_book_date, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [userId, contactName, contactTypeId, amount, giftBookId, giftBookDate, notes, createdAt]
        );
      } else {
        await pool.query(
          'INSERT INTO gifts_received (user_id, contact_name, contact_type_id, amount, gift_book_id, gift_book_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [userId, contactName, contactTypeId, amount, giftBookId, giftBookDate, notes]
        );
      }
      result.success++;

      // 自动创建亲友
      await ensureContact(userId, contactName, contactTypeId);
    } catch (err) {
      result.fail++;
      result.errors.push(`第${i + 2}行：${err.message}`);
    }
  }

  return result;
}

/**
 * 导入随礼数据行
 */
async function importGivenRows(rows, userId, dedup = true) {
  const result = { success: 0, fail: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const contactName = row['亲友姓名'];
      const contactTypeName = row['亲友类型'];
      const amount = parseFloat(row['金额']);
      const reasonName = row['事由'];
      const giftDate = formatDate(row['随礼日期']);
      const notes = row['备注']?.trim() || null;
      const createdAt = formatDateTime(row['创建时间']);

      if (!contactName || isNaN(amount) || amount <= 0 || !giftDate) {
        result.fail++;
        result.errors.push(`第${i + 2}行：缺少必填字段或金额无效（${contactName || '无名'} ${amount || 0}元）`);
        continue;
      }

      // 查找事由
      let reasonId = null;
      if (reasonName) {
        const [reasons] = await pool.query('SELECT id FROM reasons WHERE name = ? AND user_id = ?', [reasonName, userId]);
        if (reasons.length > 0) reasonId = reasons[0].id;
      }

      // 查找亲友类型
      let contactTypeId = null;
      if (contactTypeName) {
        const [types] = await pool.query('SELECT id FROM contact_types WHERE name = ? AND user_id = ?', [contactTypeName, userId]);
        if (types.length > 0) contactTypeId = types[0].id;
      }

      // 去重检查：含备注+创建时间，确保仅字段完全一致才视为重复
      if (dedup) {
        let dedupSql = 'SELECT id FROM gifts_given WHERE user_id = ? AND contact_name = ? AND amount = ? AND gift_date = ? AND (reason_id = ? OR (reason_id IS NULL AND ? IS NULL))';
        const dedupParams = [userId, contactName, amount, giftDate, reasonId, reasonId];
        if (notes) {
          dedupSql += ' AND notes = ?';
          dedupParams.push(notes);
        } else {
          dedupSql += ' AND notes IS NULL';
        }
        if (createdAt) {
          dedupSql += ' AND created_at = ?';
          dedupParams.push(createdAt);
        }
        const [existing] = await pool.query(dedupSql, dedupParams);
        if (existing.length > 0) {
          result.fail++;
          result.errors.push(`第${i + 2}行：${contactName} ${amount}元 ${giftDate} 完全重复，跳过`);
          continue;
        }
      }

      if (createdAt) {
        await pool.query(
          'INSERT INTO gifts_given (user_id, contact_name, contact_type_id, amount, reason_id, gift_date, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [userId, contactName, contactTypeId, amount, reasonId, giftDate, notes, createdAt]
        );
      } else {
        await pool.query(
          'INSERT INTO gifts_given (user_id, contact_name, contact_type_id, amount, reason_id, gift_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [userId, contactName, contactTypeId, amount, reasonId, giftDate, notes]
        );
      }
      result.success++;

      // 自动创建亲友
      await ensureContact(userId, contactName, contactTypeId);
    } catch (err) {
      result.fail++;
      result.errors.push(`第${i + 2}行：${err.message}`);
    }
  }

  return result;
}

/**
 * 自动创建亲友（如果不存在）
 */
async function ensureContact(userId, contactName, contactTypeId) {
  if (!contactName) return;
  const [existing] = await pool.query('SELECT id, type_id FROM contacts WHERE name = ? AND user_id = ?', [contactName, userId]);
  if (existing.length === 0) {
    await pool.query('INSERT INTO contacts (user_id, name, type_id) VALUES (?, ?, ?)', [userId, contactName, contactTypeId || null]);
  } else if (contactTypeId && !existing[0].type_id) {
    await pool.query('UPDATE contacts SET type_id = ? WHERE id = ? AND user_id = ?', [contactTypeId, existing[0].id, userId]);
  }
}

/**
 * 日期格式化（处理Excel日期序列号，仅日期部分）
 */
function formatDate(value) {
  if (!value) return null;
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return null;
}

/**
 * 日期时间格式化（处理Excel日期序列号，支持日期+时间）
 */
function formatDateTime(value) {
  if (!value) return null;
  if (typeof value === 'number') {
    // Excel日期序列号（含小数部分为时间）
    const date = new Date((value - 25569) * 86400 * 1000);
    return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
  }
  const str = String(value).trim();
  // 已经是标准格式 "2026-04-27 10:45:58"
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str)) return str;
  // 只有日期 "2026-04-27"
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str + ' 00:00:00';
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
  return null;
}

/**
 * 从Excel workbook导入所有数据（统一入口）
 */
async function importFromWorkbook(workbook, userId, xlsxLib, options = {}) {
  XLSX = xlsxLib;
  const { dedup = true, showErrors = false } = options;

  const { receivedSheet, givenSheet } = detectSheets(workbook);

  let receivedResult = { success: 0, fail: 0, errors: [] };
  let givenResult = { success: 0, fail: 0, errors: [] };

  if (receivedSheet) {
    const rows = XLSX.utils.sheet_to_json(receivedSheet.sheet);
    receivedResult = await importReceivedRows(rows, userId, dedup);
  }

  if (givenSheet) {
    const rows = XLSX.utils.sheet_to_json(givenSheet.sheet);
    givenResult = await importGivenRows(rows, userId, dedup);
  }

  const result = {
    received: { success: receivedResult.success, fail: receivedResult.fail },
    given: { success: givenResult.success, fail: givenResult.fail },
    detectedSheets: {
      received: receivedSheet ? receivedSheet.name : null,
      given: givenSheet ? givenSheet.name : null
    }
  };

  if (showErrors) {
    result.received.errors = receivedResult.errors;
    result.given.errors = givenResult.errors;
  }

  return result;
}

module.exports = {
  importFromWorkbook,
  importReceivedRows,
  importGivenRows,
  ensureContact,
  formatDate,
  formatDateTime,
  detectSheets
};
