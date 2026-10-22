import { memo } from 'react';
import { formatCurrency, formatDateWithLunar } from '../utils/helpers';

/**
 * 记录卡片（紧凑版）
 *
 * 信息密度约定：
 *  - 第一行：姓名 + 事由 + 关系（同一行），金额靠右
 *  - 第二行：日期（公历 + 农历，单行，超长省略）
 *  - 第三行：地点 / 所属礼簿（单行）
 *  - 第四行：备注（单行）
 *
 * 每一行都固定占位（无内容显示“—”）并按单行省略处理，
 * 这样无论有没有关系/备注，卡片高度都一致，网格对齐不会参差。
 */
const RecordCard = memo(function RecordCard({
  name,
  chips = [],
  date,
  amount,
  amountCls = 'amount-received',
  location,
  notes,
  onClick,
}) {
  const dateText = formatDateWithLunar(date);
  const visibleChips = chips.filter(Boolean);
  // 空行不渲染（避免 随礼 这类没有地点/礼簿的记录出现孤零零的「—」）；
  // 卡片有 min-height，行数少也不会比别的卡片矮。
  const lines = [dateText, location, notes].filter(v => v && String(v).trim());

  return (
    <div onClick={onClick} className="record-card-compact" role="button" tabIndex={0}>
      <div className="record-card-compact-head">
        <div className="record-card-compact-title">
          <span className="record-card-compact-name" title={name}>{name}</span>
          {visibleChips.map(chip => (
            <span key={chip} className="record-chip" title={chip}>{chip}</span>
          ))}
        </div>
        <span className={`record-card-compact-amount ${amountCls}`}>{formatCurrency(amount)}</span>
      </div>
      {lines.map((line, idx) => (
        <div key={idx} className={`record-line ${idx === lines.length - 1 && line === notes ? 'record-line-note' : ''}`} title={line}>
          {line}
        </div>
      ))}
    </div>
  );
});

export default RecordCard;
