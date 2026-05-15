import { memo } from 'react';

/**
 * 全局加载旋转器
 */
export const LoadingSpinner = memo(function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
    </div>
  );
});

/**
 * 返回按钮
 */
export const BackButton = memo(function BackButton({ onClick, to }) {
  return (
    <button onClick={onClick} className="text-white">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );
});

/**
 * 页面头部 - 两种变体: rounded(圆角底) / flat(平直)
 */
export const PageHeader = memo(function PageHeader({ title, variant = 'rounded', backTo, backOnClick, action, children }) {
  const Tag = variant === 'rounded' ? 'div' : 'div';
  const cls = variant === 'rounded'
    ? 'page-header-rounded'
    : 'page-header';

  return (
    <Tag className={cls}>
      <div className={`flex items-center ${variant === 'rounded' ? 'justify-between mb-3' : ''} ${variant === 'flat' ? 'gap-3' : ''}`}>
        {backOnClick && <BackButton onClick={backOnClick} />}
        {backTo && <BackButton onClick={backTo} />}
        {variant === 'flat'
          ? <h1 className="font-bold text-lg">{title}</h1>
          : <h1 className="text-xl font-bold">{title}</h1>
        }
        {action}
      </div>
      {children}
    </Tag>
  );
});

/**
 * 空状态提示
 */
export const EmptyState = memo(function EmptyState({ emoji, text, actionLabel, onAction }) {
  return (
    <div className="text-center py-16 text-gray-400">
      <div className="text-5xl mb-3">{emoji}</div>
      <div>{text}</div>
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn-primary mt-4 px-6 py-2">{actionLabel}</button>
      )}
    </div>
  );
});

/**
 * 筛选标签组
 */
export const FilterPills = memo(function FilterPills({ tabs, active, onChange, activeColor = 'primary' }) {
  const colorMap = {
    primary: 'bg-primary-500',
    purple: 'bg-purple-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
  };
  const activeBg = colorMap[activeColor] || colorMap.primary;

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
      {tabs.map(tab => (
        <button
          key={tab.key || 'all'}
          onClick={() => onChange(tab.key)}
          className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex-shrink-0 ${
            active === tab.key
              ? `${activeBg} text-white`
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
});

/**
 * 年份选择器
 */
export const YearSelector = memo(function YearSelector({ years, value, onChange }) {
  if (!years || years.length === 0) return null;
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="bg-white/20 text-white border border-white/30 rounded-lg px-2 py-1 text-sm">
      <option value="" className="text-gray-900">全部年份</option>
      {years.map(y => <option value={y} className="text-gray-900" key={y}>{y}年</option>)}
    </select>
  );
});

/**
 * 表单字段 - 统一 label + input/select 包裹
 */
export const FormField = memo(function FormField({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      {children}
    </div>
  );
});

/**
 * 可点击卡片项
 */
export const CardItem = memo(function CardItem({ onClick, children, className = '' }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 shadow-sm cursor-pointer active:scale-[0.98] transition-transform ${className}`}
    >
      {children}
    </div>
  );
});

/**
 * 摘要统计条
 */
export const SummaryBar = memo(function SummaryBar({ count, amount, amountColor = 'text-primary-500', prefix = '共' }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-3 mb-3 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
      <span className="text-sm text-gray-500 dark:text-gray-400">{prefix} {count} 笔</span>
      <span className={`font-bold ${amountColor}`}>{amount}</span>
    </div>
  );
});

/**
 * 金额标签
 */
export const AmountBadge = memo(function AmountBadge({ label, count, amount, color = 'text-primary-500' }) {
  return (
    <div className="flex-1 min-w-[80px]">
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}{count != null ? `(${count})` : ''}</div>
      <div className={`font-bold ${color}`}>{amount}</div>
    </div>
  );
});
