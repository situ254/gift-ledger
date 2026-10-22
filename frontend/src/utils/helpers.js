import { Solar } from 'lunar-javascript';
import { DEFAULTS } from '../constants/messages';

/**
 * 格式化金额为人民币格式
 * @param {number|null} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  if (amount == null) return '¥0.00';
  return `¥${Number(amount).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * 截断日期为 YYYY-MM-DD
 * @param {string} date
 * @returns {string}
 */
export function shortenDate(date) {
  return date ? String(date).slice(0, 10) : '';
}

/**
 * 提取年份
 * @param {string} date
 * @returns {string}
 */
export function extractYear(date) {
  return date ? String(date).slice(0, 4) : DEFAULTS.YEAR_UNKNOWN;
}

/* ------------------------------------------------------------------ *
 * 农历
 *
 * 统一格式：公历（农历YYYY干支生肖年X月XX）
 * 例：2026-10-22（农历2026丙午马年九月十三）
 *
 * 月份、日期一律使用规范中文写法（正月 / 冬月 / 腊月 / 闰六月，
 * 初一 / 十五 / 廿三 / 三十），避免出现「十月15」「腊月7」这类
 * 数字与中文混排的写法。
 * ------------------------------------------------------------------ */

const LUNAR_MONTH_NAMES = [
  '正月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '冬月', '腊月',
];

const LUNAR_DAY_NAMES = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
];

const DIGIT_MAP = {
  零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4,
  五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
};

/**
 * 解析中文数字（支持 十五 / 廿三 / 三十 / 7 等写法）
 * @param {string|number} value
 * @returns {number|null}
 */
export function parseChineseNumber(value) {
  if (value == null || value === '') return null;
  const text = String(value).trim();
  if (/^\d+$/.test(text)) return parseInt(text, 10);

  if (Object.prototype.hasOwnProperty.call(DIGIT_MAP, text)) return DIGIT_MAP[text];
  if (text === '十') return 10;

  if (text.startsWith('廿')) {
    const tail = text.slice(1);
    return 20 + (tail ? (DIGIT_MAP[tail] ?? 0) : 0);
  }
  if (text.startsWith('卅')) {
    const tail = text.slice(1);
    return 30 + (tail ? (DIGIT_MAP[tail] ?? 0) : 0);
  }
  if (text.includes('十')) {
    const [head, tail] = text.split('十');
    const tens = head ? (DIGIT_MAP[head] ?? 0) : 1;
    const ones = tail ? (DIGIT_MAP[tail] ?? 0) : 0;
    return tens * 10 + ones;
  }
  return null;
}

/**
 * 规范化农历月份：正 / 冬 / 腊 / 10 / 十月15 等 → 正月 / 冬月 / 腊月 / 十月
 * 闰月保留「闰」前缀
 * @param {string|number} value
 * @returns {string}
 */
export function normalizeLunarMonth(value) {
  let text = String(value ?? '').replace(/\s+/g, '');
  if (!text) return '';

  let leap = false;
  if (text.startsWith('闰')) {
    leap = true;
    text = text.slice(1);
  }
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

/**
 * 规范化农历日期：15 / 十五 / 廿三 / 7 等 → 十五 / 廿三 / 初七
 * @param {string|number} value
 * @returns {string}
 */
export function normalizeLunarDay(value) {
  const text = String(value ?? '').replace(/\s+/g, '').replace(/[日号]/g, '');
  if (!text) return '';
  if (LUNAR_DAY_NAMES.includes(text)) return text;

  const num = parseChineseNumber(text);
  if (num && num >= 1 && num <= 30) return LUNAR_DAY_NAMES[num - 1];
  return text;
}

/**
 * 把各种日期入参转成 Date（按本地零点，避免时区把日期推到前一天）
 * @param {string|Date} date
 * @returns {Date|null}
 */
function toLocalDate(date) {
  if (!date) return null;
  if (date instanceof Date) return Number.isNaN(date.getTime()) ? null : date;
  const text = String(date).slice(0, 10);
  const d = new Date(`${text}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * 解析农历信息
 * @param {string|Date} date
 * @returns {{year:number, ganZhi:string, zodiac:string, month:string, day:string}|null}
 */
export function lunarParts(date) {
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

/**
 * 农历描述：农历2026丙午马年九月十三
 * @param {string|Date} date
 * @returns {string}
 */
export function lunarDate(date) {
  const parts = lunarParts(date);
  if (!parts) return '';
  return `农历${parts.year}${parts.ganZhi}${parts.zodiac}年${parts.month}${parts.day}`;
}

/**
 * 统一日期展示：2026-10-22（农历2026丙午马年九月十三）
 * 记录列表、礼簿列表、详情页、导出文本全部走这一个函数，保证入口一致
 * @param {string|Date} date
 * @returns {string}
 */
export function formatDateWithLunar(date) {
  const solar = shortenDate(date);
  if (!solar) return '';
  const lunar = lunarDate(date);
  return lunar ? `${solar}（${lunar}）` : solar;
}

/**
 * 格式化日期为 MM-DD
 * @param {string} date
 * @returns {string}
 */
export function monthDay(date) {
  if (!date) return '';
  const d = toLocalDate(date);
  if (!d) return '';
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 按指定键对列表分组并计算统计
 * @param {Array} items
 * @param {function} keyFn - 返回分组键
 * @param {Object} valueFns - { count: true, amount: 'amount' } 聚合字段
 * @returns {Object} { [groupKey]: { count, amount, ... } }
 */
export function groupByAndStats(items, keyFn, valueFns = { count: true, amount: 'amount' }) {
  const groups = {};
  items.forEach(item => {
    const key = keyFn(item);
    groups[key] ||= { count: 0, amount: 0 };
    groups[key].count++;
    if (valueFns.amount) {
      groups[key].amount += Number(item[valueFns.amount] || 0);
    }
  });
  return groups;
}

/**
 * 通用下载 Blob 文件
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(new Blob([blob]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
