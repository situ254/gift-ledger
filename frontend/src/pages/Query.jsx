import { useState, useEffect, useMemo } from 'react';
import { statsApi } from '../api';
import { formatCurrency } from '../utils/helpers';
import { LoadingSpinner, PageHeader, YearSelector, FilterPills } from '../components/UI';
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

  const { totalReceived = 0, totalGiven = 0, receivedCount = 0, givenCount = 0,
    netAmount = 0, oweMe = [], iOwe = [],
    byReasonGiven = [], byContactTypeGiven = [], byReasonReceived = [],
    byContactTypeReceived = [], byReason = [], byContactType = [],
    availableYears = [] } = data || {};

  // 新中式配色：收礼=gold，送礼=red
  const statsSections = useMemo(() => {
    if (subFilter === 'reason') {
      return [
        ...(byReason.length > 0 ? [{ title: '按事由统计', items: byReason, color: 'primary' }] : []),
        ...(byReasonReceived.length > 0 ? [{ title: '收礼·按事由', items: byReasonReceived, color: 'gold' }] : []),
        ...(byReasonGiven.length > 0 ? [{ title: '随礼·按事由', items: byReasonGiven, color: 'red' }] : []),
      ];
    }
    return [
      ...(byContactType.length > 0 ? [{ title: '按亲友类型统计', items: byContactType, color: 'primary' }] : []),
      ...(byContactTypeReceived.length > 0 ? [{ title: '收礼·按类型', items: byContactTypeReceived, color: 'gold' }] : []),
      ...(byContactTypeGiven.length > 0 ? [{ title: '随礼·按类型', items: byContactTypeGiven, color: 'red' }] : []),
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
              <div className="card text-center !p-4" style={{ background: 'linear-gradient(135deg, #FFFDE7 0%, #FFF8E1 100%)' }}>
                <div className="text-sm text-gray-500 mb-1">收礼</div>
                <div className="text-2xl font-bold amount-received">{formatCurrency(totalReceived)}</div>
                <div className="text-xs text-gray-400 mt-1">{receivedCount}笔</div>
              </div>
              <div className="card text-center !p-4" style={{ background: 'linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%)' }}>
                <div className="text-sm text-gray-500 mb-1">随礼</div>
                <div className="text-2xl font-bold amount-given">{formatCurrency(totalGiven)}</div>
                <div className="text-xs text-gray-400 mt-1">{givenCount}笔</div>
              </div>
            </div>
            <div className="card !p-3 flex items-center justify-between">
              <span className="text-sm text-gray-500">{netAmount > 0 ? '我差别人礼' : netAmount < 0 ? '别人差我礼' : '收支平衡'}</span>
              <span className={`font-bold text-lg ${netAmount > 0 ? 'text-green-500' : netAmount < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                {formatCurrency(Math.abs(netAmount))}
              </span>
            </div>
            <FilterPills tabs={SUB_TABS} active={subFilter} onChange={setSubFilter} activeColor="primary" />
            {statsSections.map(section => (
              <div key={section.title} className="card">
                <h3 className="font-bold text-gray-700 mb-2">{section.title}</h3>
                <div className="space-y-2">
                  {section.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`badge badge-${section.color}`}>{item.name || '其它'}</span>
                        <span className="text-xs text-gray-400">{item.count}笔</span>
                      </div>
                      <span className={`font-bold ${section.color === 'gold' ? 'amount-received' : section.color === 'red' ? 'amount-given' : 'text-primary-500'}`}>
                        {formatCurrency(item.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'iOwe' && (
          <div className="responsive-list-sm">
            {iOwe.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">✅</div>
                <div>我差别人礼：0 元</div>
              </div>
            ) : iOwe.map((item, idx) => (
                <div key={idx} className="card flex items-center justify-between">
                  <span className="font-medium text-gray-800">{item.contact_name}</span>
                  <span className="font-bold text-green-500">{formatCurrency(Math.abs(item.net))}</span>
                </div>
              ))
            }
          </div>
        )}
        {activeTab === 'oweMe' && (
          <div className="responsive-list-sm">
            {oweMe.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">✅</div>
                <div>别人差我礼：0 元</div>
              </div>
            ) : oweMe.map((item, idx) => (
                <div key={idx} className="card flex items-center justify-between">
                  <span className="font-medium text-gray-800">{item.contact_name}</span>
                  <span className="font-bold amount-given">{formatCurrency(Math.abs(item.net))}</span>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
}
