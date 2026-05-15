import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { giftsGivenApi, reasonsApi } from '../api';
import { formatCurrency, monthDay } from '../utils/helpers';
import { LoadingSpinner, PageHeader, FilterPills, SummaryBar } from '../components/UI';
import { ROUTES } from '../constants/routes';
import { MSG, DEFAULTS } from '../constants/messages';
import toast from 'react-hot-toast';

export default function GiftsGivenDetail() {
  const { year } = useParams();
  const navigate = useNavigate();
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeReason, setActiveReason] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [giftsRes] = await Promise.all([giftsGivenApi.list({ year }), reasonsApi.list()]);
      setGifts(giftsRes.data);
    } catch {
      toast.error(MSG.LOAD_FAIL);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { loadData(); }, [loadData]);

  const reasonGroups = useMemo(() => {
    const map = {};
    gifts.forEach(g => {
      const r = g.reason_name || DEFAULTS.TYPE_UNKNOWN;
      map[r] ||= { count: 0, amount: 0 };
      map[r].count++;
      map[r].amount += Number(g.amount);
    });
    return map;
  }, [gifts]);

  const filterTabs = useMemo(() => {
    const total = gifts.reduce((s, g) => s + Number(g.amount), 0);
    return [
      { key: '', label: '全部', count: gifts.length, amount: total },
      ...Object.entries(reasonGroups).map(([name, data]) => ({
        key: name, label: `${name}(${data.count})`, count: data.count, amount: data.amount,
      })),
    ];
  }, [reasonGroups, gifts]);

  const filtered = useMemo(
    () => activeReason ? gifts.filter(g => (g.reason_name || DEFAULTS.TYPE_UNKNOWN) === activeReason) : gifts,
    [gifts, activeReason]
  );

  const totalAmount = useMemo(() => filtered.reduce((s, g) => s + Number(g.amount), 0), [filtered]);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title={`${year}年随礼明细`} variant="rounded"
        backOnClick={() => navigate(ROUTES.GIVEN.LIST)} />
      <div className="page-container -mt-4">
        <FilterPills tabs={filterTabs} active={activeReason} onChange={setActiveReason} activeColor="purple" />
        <SummaryBar count={filtered.length} amount={`共: ${formatCurrency(totalAmount)}`} amountColor="text-purple-500" />
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">暂无随礼记录</div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            {filtered.map((g, idx) => (
              <div key={g.id}
                onClick={() => navigate(ROUTES.GIVEN.EDIT(g.id))}
                className={`flex items-center px-4 py-3 cursor-pointer active:bg-gray-50 dark:active:bg-gray-700 transition-colors ${idx < filtered.length - 1 ? 'border-b border-gray-50 dark:border-gray-700' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800 dark:text-white truncate">{g.contact_name}</span>
                    {g.reason_name && <span className="inline-block bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs px-1.5 py-0.5 rounded">{g.reason_name}</span>}
                  </div>
                  <div className="text-xs text-gray-400">{monthDay(g.gift_date)}</div>
                </div>
                <span className="font-bold text-purple-500 ml-3">{formatCurrency(g.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
