import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { statsApi } from '../api';
import { formatCurrency } from '../utils/helpers';
import { LoadingSpinner, PageHeader, YearSelector, FilterPills } from '../components/UI';
import { ROUTES } from '../constants/routes';
import { MSG } from '../constants/messages';
import toast from 'react-hot-toast';

const TABS = [
  { key: 'summary', label: '收/随礼汇总' },
  { key: 'iOwe', label: '我差别人礼' },
  { key: 'oweMe', label: '别人差我礼' },
  { key: 'settled', label: '已两清' },
];

const SUB_TABS = [
  { key: 'reason', label: '按事由' },
  { key: 'contactType', label: '按类型' },
];

/**
 * 分组统计块：名称 + 笔数 + 金额 + 占比条
 */
function GroupSection({ title, items, tone }) {
  const total = items.reduce((s, it) => s + Number(it.total || 0), 0) || 1;
  const amountCls = tone === 'received' ? 'amount-received' : 'amount-given';
  const barCls = tone === 'received' ? 'bg-gold-400' : 'bg-primary-400';

  return (
    <div className="card">
      <h3 className="font-bold text-gray-700 mb-2 text-sm">{title}</h3>
      {items.length === 0 ? (
        <div className="text-xs text-gray-400 py-2">暂无数据</div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => {
            const pct = Math.max(2, Math.round((Number(item.total || 0) / total) * 100));
            return (
              <div key={`${item.name}-${idx}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm text-gray-700 truncate">{item.name || '其它'}</span>
                    <span className="text-xs text-gray-400 shrink-0">{item.count}笔</span>
                  </div>
                  <span className={`font-bold text-sm shrink-0 ${amountCls}`}>{formatCurrency(item.total)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full rounded-full ${barCls}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * 人情余额清单（累计口径）
 */
function BalanceList({ items, tone, emptyText, onOpen }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <div className="text-4xl mb-2">✅</div>
        <div>{emptyText}</div>
      </div>
    );
  }

  return (
    <div className="responsive-list-sm">
      {items.map(item => (
        <div
          key={item.contact_name}
          className="card flex items-center justify-between cursor-pointer"
          onClick={() => onOpen(item.contact_name)}
        >
          <div className="min-w-0">
            <div className="font-medium text-gray-800 truncate">{item.contact_name}</div>
            <div className="text-xs text-gray-400 mt-0.5">
              收 {formatCurrency(item.received)} · 送 {formatCurrency(item.given)}
            </div>
          </div>
          <span className={`font-bold shrink-0 ${tone === 'iOwe' ? 'amount-given' : 'amount-received'}`}>
            {item.net === 0 ? '两清' : formatCurrency(Math.abs(item.net))}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Query() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [subFilter, setSubFilter] = useState('reason');
  const [selectedYear, setSelectedYear] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = selectedYear ? { year: selectedYear } : {};
        const res = await statsApi.summary(params);
        if (!cancelled) setData(res.data);
      } catch { toast.error(MSG.LOAD_STATS_FAIL); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [selectedYear]);

  const {
    totalReceived = 0, totalGiven = 0, receivedCount = 0, givenCount = 0,
    netAmount = 0, oweMe = [], iOwe = [], settled = [],
    byReasonReceived = [], byReasonGiven = [],
    byContactTypeReceived = [], byContactTypeGiven = [],
    availableYears = [],
  } = data || {};

  const statsSections = useMemo(() => (
    subFilter === 'reason'
      ? [
        { title: '收礼 · 按事由', items: byReasonReceived, tone: 'received' },
        { title: '随礼 · 按事由', items: byReasonGiven, tone: 'given' },
      ]
      : [
        { title: '收礼 · 按关系类型', items: byContactTypeReceived, tone: 'received' },
        { title: '随礼 · 按关系类型', items: byContactTypeGiven, tone: 'given' },
      ]
  ), [subFilter, byReasonReceived, byReasonGiven, byContactTypeReceived, byContactTypeGiven]);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="统计" variant="rounded"
        action={availableYears.length > 0 && <YearSelector years={availableYears} value={selectedYear} onChange={setSelectedYear} />}>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {TABS.map(tab => (
            <button key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex-shrink-0 ${activeTab === tab.key ? 'bg-white text-primary-500' : 'bg-white/20 text-white'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </PageHeader>

      <div className="page-container -mt-4">
        {activeTab === 'summary' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="card text-center !p-4" style={{ background: 'linear-gradient(135deg, #FFFDE7 0%, #FFF8E1 100%)' }}>
                <div className="text-sm text-gray-500 mb-1">收礼</div>
                <div className="text-2xl font-bold amount-received">{formatCurrency(totalReceived)}</div>
                <div className="text-xs text-gray-400 mt-1">{receivedCount} 笔</div>
              </div>
              <div className="card text-center !p-4" style={{ background: 'linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%)' }}>
                <div className="text-sm text-gray-500 mb-1">随礼</div>
                <div className="text-2xl font-bold amount-given">{formatCurrency(totalGiven)}</div>
                <div className="text-xs text-gray-400 mt-1">{givenCount} 笔</div>
              </div>
            </div>

            <div className="card !p-3 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {netAmount > 0 ? '我差别人礼' : netAmount < 0 ? '别人差我礼' : '收支平衡'}
              </span>
              <span className={`font-bold text-lg ${netAmount > 0 ? 'amount-given' : netAmount < 0 ? 'amount-received' : 'text-gray-500'}`}>
                {formatCurrency(Math.abs(netAmount))}
              </span>
            </div>

            <FilterPills tabs={SUB_TABS} active={subFilter} onChange={setSubFilter} activeColor="primary" />
            {statsSections.map(section => (
              <GroupSection key={section.title} title={section.title} items={section.items} tone={section.tone} />
            ))}
            <p className="text-xs text-gray-400 text-center">
              顶部金额随年份筛选变化；人情余额清单始终按全部年份累计统计
            </p>
          </div>
        )}

        {activeTab === 'iOwe' && (
          <div>
            <p className="text-xs text-gray-400 mb-2">我收的比送的多，按累计口径统计（不受顶部年份筛选影响）</p>
            <BalanceList items={iOwe} tone="iOwe" emptyText="我差别人礼：0 元"
              onOpen={name => navigate(ROUTES.CONTACTS.DETAIL(name))} />
          </div>
        )}

        {activeTab === 'oweMe' && (
          <div>
            <p className="text-xs text-gray-400 mb-2">我送的比收的多，按累计口径统计（不受顶部年份筛选影响）</p>
            <BalanceList items={oweMe} tone="oweMe" emptyText="别人差我礼：0 元"
              onOpen={name => navigate(ROUTES.CONTACTS.DETAIL(name))} />
          </div>
        )}

        {activeTab === 'settled' && (
          <div>
            <p className="text-xs text-gray-400 mb-2">收礼与随礼金额相抵的亲友</p>
            <BalanceList items={settled} tone="settled" emptyText="暂无已两清的亲友"
              onOpen={name => navigate(ROUTES.CONTACTS.DETAIL(name))} />
          </div>
        )}
      </div>
    </div>
  );
}
