const pool = require('./db');

/**
 * 确保某亲友存在于 contacts 表（亲友录）
 *
 * 在新增/更新收礼、随礼记录时调用：礼单表只存 contact_name 字符串，
 * 而亲友录列表与统计均以 contacts 表为准，若不自动补录会导致
 * 「新增了不在亲友录中的随礼/收礼后，亲友录中查不到该人及其统计」。
 *
 * 规则（与导入逻辑保持一致，幂等）：
 * 1. 名字为空 → 直接返回；
 * 2. 亲友不存在 → 自动创建（type_id 沿用该记录所选关系，可为空）；
 * 3. 亲友已存在但尚未设置关系 → 用当前记录的关系补上；
 * 4. 亲友已存在且已有关系 → 不覆盖用户已设置的关系。
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
 * 存量数据修复：把历史收礼/随礼记录中出现过、但尚未录入亲友表的姓名全部补录。
 * 幂等，可在服务每次启动时执行，保证升级后亲友录自动补齐旧数据。
 *
 * 补录时会尽量带上该姓名在礼单中出现过的最新一条「非空关系」，
 * 避免历史记录自动补录出的亲友全部没有关系（亲友录中不显示关系）。
 */
async function syncContactsFromGifts() {
  const [users] = await pool.query('SELECT id FROM users');
  for (const u of users) {
    const [rows] = await pool.query(
      `SELECT contact_name, contact_type_id FROM (
         SELECT contact_name, contact_type_id, id FROM gifts_received
          WHERE user_id = ? AND contact_name IS NOT NULL AND contact_name != ''
         UNION ALL
         SELECT contact_name, contact_type_id, id FROM gifts_given
          WHERE user_id = ? AND contact_name IS NOT NULL AND contact_name != ''
       ) t ORDER BY t.id DESC`,
      [u.id, u.id]
    );
    // 每个姓名取「最新一条非空关系」：最新记录无关系时，允许被更早的有关系记录补上
    const bestType = new Map();
    for (const row of rows) {
      if (!bestType.has(row.contact_name)) {
        bestType.set(row.contact_name, row.contact_type_id || null);
      } else if (!bestType.get(row.contact_name) && row.contact_type_id) {
        bestType.set(row.contact_name, row.contact_type_id);
      }
    }
    for (const [name, typeId] of bestType) {
      await ensureContact(u.id, name, typeId);
    }
  }
}

module.exports = { ensureContact, syncContactsFromGifts };