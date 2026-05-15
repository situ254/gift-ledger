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
  return date ? date.slice(0, 10) : '';
}

/**
 * 提取年份
 * @param {string} date
 * @returns {string}
 */
export function extractYear(date) {
  return date ? date.slice(0, 4) : DEFAULTS.YEAR_UNKNOWN;
}

/**
 * 阳历转农历描述
 * @param {string} date
 * @returns {string}
 */
export function lunarDate(date) {
  if (!date) return '';
  try {
    const d = new Date(date);
    const lunar = Solar.fromDate(d).getLunar();
    return `农历${lunar.getYearInGanZhi()}（${lunar.getYearShengXiao()}）年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;
  } catch {
    return '';
  }
}

/**
 * 格式化日期为 MM-DD
 * @param {string} date
 * @returns {string}
 */
export function monthDay(date) {
  if (!date) return '';
  const d = new Date(date);
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
