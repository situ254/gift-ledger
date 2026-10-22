/**
 * 农历工具（后端）
 *
 * 与前端 frontend/src/utils/helpers.js 的规则保持一致：
 *   统一格式：公历（农历YYYY干支生肖年X月XX）
 *   例：2026-10-22（农历2026丙午马年九月十三）
 *
 * 月份/日期一律使用规范中文写法（正月/冬月/腊月/闰六月，初一/十五/廿三/三十），
 * 导出文本、Excel 导出与页面展示保持同一口径。
 */
const { Solar } = require('../vendor/lunar.js');

const LUNAR_MONTH_NAMES = [
  '正月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '冬月', '腊月',
];

const LUNAR_DAY_NAMES = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
];

const DIGIT_MAP = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };

function parseChineseNumber(value) {
  if (value == null || value === '') return null;
  const text = String(value).trim();
  if (/^\d+$/.test(text)) return parseInt(text, 10);
  if (Object.prototype.hasOwnProperty.call(DIGIT_MAP, text)) return DIGIT_MAP[text];
  if (text === '十') return 10;
  if (text.startsWith('廿')) return 20 + (DIGIT_MAP[text.slice(1)] || 0);
  if (text.startsWith('卅')) return 30 + (DIGIT_MAP[text.slice(1)] || 0);
  if (text.includes('十')) {
    const [head, tail] = text.split('十');
    const tens = head ? (DIGIT_MAP[head] || 0) : 1;
    const ones = tail ? (DIGIT_MAP[tail] || 0) : 0;
    return tens * 10 + ones;
  }
  return null;
}

function normalizeLunarMonth(value) {
  let text = String(value == null ? '' : value).replace(/\s+/g, '');
  if (!text) return '';
  let leap = false;
  if (text.startsWith('闰')) { leap = true; text = text.slice(1); }
  text = text.replace(/月/g, '');
  if (!text) return '';

  const num = parseChineseNumber(text);
  let normalized;
  if (num && num >= 1 && num <= 12) normalized = LUNAR_MONTH_NAMES[num - 1];
  else if (text === '正') normalized = '正月';
  else if (text === '冬') normalized = '冬月';
  else if (text === '腊') normalized = '腊月';
  else normalized = `${text}月`;

  return leap ? `闰${normalized}` : normalized;
}

function normalizeLunarDay(value) {
  const text = String(value == null ? '' : value).replace(/\s+/g, '').replace(/[日号]/g, '');
  if (!text) return '';
  if (LUNAR_DAY_NAMES.includes(text)) return text;
  const num = parseChineseNumber(text);
  if (num && num >= 1 && num <= 30) return LUNAR_DAY_NAMES[num - 1];
  return text;
}

function toLocalDate(date) {
  if (!date) return null;
  if (date instanceof Date) return Number.isNaN(date.getTime()) ? null : date;
  const d = new Date(`${String(date).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function lunarParts(date) {
  const d = toLocalDate(date);
  if (!d) return null;
  try {
    const lunar = Solar.fromDate(d).getLunar();
    return {
      year: lunar.getYear(),
      ganZhi: lunar.getYearInGanZhi(),
      zodiac: lunar.getYearShengXiao(),
      month: normalizeLunarMonth(lunar.getMonthInChinese()),
      day: normalizeLunarDay(lunar.getDayInChinese()),
    };
  } catch {
    return null;
  }
}

function lunarDate(date) {
  const parts = lunarParts(date);
  if (!parts) return '';
  return `农历${parts.year}${parts.ganZhi}${parts.zodiac}年${parts.month}${parts.day}`;
}

function formatDateWithLunar(date) {
  const solar = date ? String(date).slice(0, 10) : '';
  if (!solar) return '';
  const lunar = lunarDate(date);
  return lunar ? `${solar}（${lunar}）` : solar;
}

module.exports = {
  lunarParts,
  lunarDate,
  formatDateWithLunar,
  normalizeLunarMonth,
  normalizeLunarDay,
  parseChineseNumber,
};
