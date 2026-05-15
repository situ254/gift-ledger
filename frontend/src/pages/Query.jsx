import { useState, useEffect, useMemo, useCallback } from 'react';
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
];

const SUB_TABS = [
  { key: 'reason', label: '按事由' },
  { key: 'contactType', label: '按类型' },
];

export default function Query() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [subFilter, setSubFilter] = useState('reason');
  const [selectedYear, setSelectedYear] = useState('');

  const loadData = useCallback(async () => {
    try {
      const params = selectedYear ? { year: selectedYear } : {};
      setData((await statsApi.summary(params)).data);
    } catch { toast.error(MSG.LOAD_STATS_FAIL); }
    finally { setLoading(false); }
  }, [selectedYear]);

  useEffect(() => { loadData(); }, [loadData]);

  const { totalReceived = 0, totalGiven = 0, receivedCount = 0, givenCount = 0,
    netAmount = 0, oweMe = [], iOwe = [],
    byReasonGiven = [], byContactTypeGiven = [], byReasonReceived = [],
    byContactTypeReceived = [], byReason = [], byContactType = [],
    availableYears = [] } = data || {};

  const statsSections = useMemo(() => {
    if (subFilter === 'reason') {
      return [
        ...(byReason.length > 0 ? [{ title: '按事由统计', items: byReason, color: 'purple' }] : []),
        ...(byReasonReceived.length > 0 ? [{ title: '收礼·按事由', items: byReasonReceived, color: 'blue' }] : []),
        ...(byReasonGiven.length > 0 ? [{ title: '随礼·按事由', items: byReasonGiven, color: 'purple' }] : []),
      ];
    }
    return [
      ...(byContactType.length > 0 ? [{ title: '按亲友类型统计', items: byContactType, color: 'blue' }] : []),
      ...(byContactTypeReceived.length > 0 ? [{ title: '收礼·按类型', items: byContactTypeReceived, color: 'blue' }] : []),
      ...(byContactTypeGiven.length > 0 ? [{ title: '随礼·按类型', items: byContactTypeGiven, color: 'purple' }] : []),
    ];
  }, [subFilter, byReason, byContactType, byReasonReceived, byReasonGiven, byContactTypeReceived, byContactTypeGiven]);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="统计" variant="rounded"
        action={availableYears.length > 0 && <YearSelector years={availableYears} value={selectedYear} onChange={setSelectedYear} />}>
        <div className="flex gap-2">
          {TABS.map(tab => (
            <button key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSubFilter('reason'); }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-white text-primary-500' : 'bg-white/20 text-white'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </PageHeader>
      <div className="page-container -mt-4">
        {activeTab === 'summary' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="card text-center !p-4">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">收礼</div>
                <div className="text-2xl font-bold text-blue-500">{formatCurrency(totalReceived)}</div>
                <div className="text-xs text-gray-400 mt-1">{receivedCount}笔</div>
              </div>
              <div className="card text-center !p-4">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">随礼</div>
                <div className="text-2xl font-bold text-purple-500">{formatCurrency(totalGiven)}</div>
                <div className="text-xs text-gray-400 mt-1">{givenCount}笔</div>
              </div>
            </div>
            <div className="card !p-3 flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">净额（收礼 - 随礼）</span>
              <span className={`font-bold text-lg ${netAmount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {netAmount >= 0 ? '+' : ''}{formatCurrency(netAmount)}
              </span>
            </div>
            <FilterPills tabs={SUB_TABS} active={subFilter} onChange={setSubFilter} activeColor="primary" />
            {statsSections.map(section => (
              <div key={section.title} className="card">
                <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-2">{section.title}</h3>
                <div className="space-y-2">
                  {section.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`badge badge-${section.color}`}>{item.name || '其它'}</span>
                        <span className="text-xs text-gray-400">{item.count}笔</span>
                      </div>
                      <span className={`font-bold text-${section.color}-500`}>{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'iOwe' && (
          <div className="space-y-2">
            {iOwe.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">✅</div>
                <div>我差别人礼：0 元</div>
              </div>
            ) : iOwe.map((item, idx) => (
                <div key={idx} className="card flex items-center justify-between">
                  <span className="font-medium text-gray-800 dark:text-white">{item.contact_name}</span>
                  <span className="font-bold text-green-500">{formatCurrency(Math.abs(item.net))}</span>
                </div>
              ))
            }
          </div>
        )}
        {activeTab === 'oweMe' && (
          <div className="space-y-2">
            {oweMe.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">✅</div>
                <div>别人差我礼：0 元</div>
              </div>
            ) : oweMe.map((item, idx) => (
                <div key={idx} className="card flex items-center justify-between">
                  <span className="font-medium text-gray-800 dark:text-white">{item.contact_name}</span>
                  <span className="font-bold text-red-500">{formatCurrency(Math.abs(item.net))}</span>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
}
