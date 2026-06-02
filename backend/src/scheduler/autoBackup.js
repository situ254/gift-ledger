const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const pool = require('../db');

// 云端数据目录（与 backup.js 保持一致）
const CLOUD_DATA_DIR = process.env.CLOUD_DATA_DIR || '/data';
// 自动备份开关
const AUTO_BACKUP_ENABLED = process.env.AUTO_BACKUP !== 'false';
// 每个用户保留的备份数
const AUTO_BACKUP_KEEP = parseInt(process.env.AUTO_BACKUP_KEEP || '2', 10);

/**
 * 生成备份数据的 Excel Buffer（与 backup.js 逻辑一致）
 */
async function generateBackupBuffer(userId) {
  const XLSX = require('xlsx');
  const wb = XLSX.utils.book_new();

  const [received] = await pool.query(
    `SELECT gr.contact_name as '亲友姓名', ct.name as '亲友类型', gr.amount as '金额', gb.name as '所属礼簿', gr.gift_book_date as '礼簿日期', gr.notes as '备注', DATE_FORMAT(gr.created_at, '%Y-%m-%d %H:%i:%s') as '创建时间'
    FROM gifts_received gr LEFT JOIN contact_types ct ON gr.contact_type_id = ct.id LEFT JOIN gift_books gb ON gr.gift_book_id = gb.id WHERE gr.user_id = ?`,
    [userId]
  );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(received), '收礼');

  const [given] = await pool.query(
    `SELECT gg.contact_name as '亲友姓名', ct.name as '亲友类型', gg.amount as '金额', r.name as '事由', gg.gift_date as '随礼日期', gg.notes as '备注', DATE_FORMAT(gg.created_at, '%Y-%m-%d %H:%i:%s') as '创建时间'
    FROM gifts_given gg LEFT JOIN contact_types ct ON gg.contact_type_id = ct.id LEFT JOIN reasons r ON gg.reason_id = r.id WHERE gg.user_id = ?`,
    [userId]
  );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(given), '随礼');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * 清理旧备份，只保留最新 N 个
 */
function cleanupOldBackups(userDir, keepCount) {
  if (!fs.existsSync(userDir)) return;

  const files = fs.readdirSync(userDir)
    .filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'))
    .map(f => {
      const filePath = path.join(userDir, f);
      const stat = fs.statSync(filePath);
      return { name: f, path: filePath, mtime: stat.mtime };
    })
    .sort((a, b) => new Date(b.mtime) - new Date(a.mtime)); // 新 → 旧

  // 删除超出保留数量的旧文件
  for (let i = keepCount; i < files.length; i++) {
    try {
      fs.unlinkSync(files[i].path);
      console.log(`[AutoBackup] 已删除旧备份: ${files[i].name}`);
    } catch (err) {
      console.error(`[AutoBackup] 删除旧备份失败: ${files[i].name}`, err.message);
    }
  }
}

/**
 * 对单个用户执行备份
 */
async function backupUser(userId, username) {
  const userDir = path.join(CLOUD_DATA_DIR, username);

  // 确保用户目录存在
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }

  // 生成备份
  const buf = await generateBackupBuffer(userId);

  // 文件名包含精确到分钟的时间戳
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  const filename = `人情笔记_${username}_${timestamp}.xlsx`;
  const filePath = path.join(userDir, filename);

  fs.writeFileSync(filePath, buf);

  // 清理旧备份，只保留最新 N 个
  cleanupOldBackups(userDir, AUTO_BACKUP_KEEP);

  return { username, filename, size: buf.length };
}

/**
 * 执行一次全量自动备份
 */
async function runAutoBackup() {
  console.log('[AutoBackup] 开始自动备份...');
  const startTime = Date.now();

  try {
    const [users] = await pool.query('SELECT id, username FROM users');
    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
      try {
        const result = await backupUser(user.id, user.username);
        console.log(`[AutoBackup] ✅ ${result.username}: ${result.filename} (${(result.size / 1024).toFixed(1)}KB)`);
        successCount++;
      } catch (err) {
        console.error(`[AutoBackup] ❌ ${user.username}: ${err.message}`);
        failCount++;
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[AutoBackup] 完成！成功 ${successCount}，失败 ${failCount}，耗时 ${elapsed}s`);
  } catch (err) {
    console.error('[AutoBackup] 自动备份异常:', err.message);
  }
}

/**
 * 启动定时自动备份任务
 * 每月 1 号和 16 号凌晨 3 点执行
 */
function startAutoBackup() {
  if (!AUTO_BACKUP_ENABLED) {
    console.log('[AutoBackup] 自动备份已禁用 (AUTO_BACKUP=false)');
    return;
  }

  // cron 表达式：分 时 日 月 星期
  // 每月 1 号和 16 号的 03:00 执行
  const schedule = '0 3 1,16 * *';

  if (!cron.validate(schedule)) {
    console.error('[AutoBackup] cron 表达式无效:', schedule);
    return;
  }

  cron.schedule(schedule, runAutoBackup, {
    scheduled: true,
    timezone: 'Asia/Shanghai',
  });

  console.log(`[AutoBackup] 定时备份已启动: 每月1号和16号凌晨3点 (Asia/Shanghai), 保留最新 ${AUTO_BACKUP_KEEP} 个备份`);
}

module.exports = { startAutoBackup, runAutoBackup };
