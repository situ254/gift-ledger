import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { giftsGivenApi, reasonsApi } from '../api';
import { formatCurrency, groupByAndStats, extractYear } from '../utils/helpers';
import { LoadingSpinner, PageHeader, EmptyState, CardItem } from '../components/UI';
import { ROUTES } from '../constants/routes';
import { MSG, DEFAULTS } from '../constants/messages';
import toast from 'react-hot-toast';

export default function GiftsGiven() {
  const navigate = useNavigate();
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [giftsRes] = await Promise.all([giftsGivenApi.list(), reasonsApi.list()]);
      setGifts(giftsRes.data);
    } catch {
      toast.error(MSG.LOAD_FAIL);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const byYear = useMemo(() => {
    const groups = {};
    gifts.forEach(g => {
      const year = extractYear(g.gift_date);
      groups[year] ||= [];
      groups[year].push(g);
    });
    return groups;
  }, [gifts]);

  const years = useMemo(() => Object.keys(byYear).sort((a, b) => b - a), [byYear]);

  const yearStats = useMemo(() => {
    const stats = {};
    years.forEach(year => {
      const items = byYear[year];
      const reasonDist = {};
      items.forEach(g => {
        const r = g.reason_name || DEFAULTS.TYPE_UNKNOWN;
        reasonDist[r] ||= 0;
        reasonDist[r]++;
      });
      stats[year] = {
        count: items.length,
        totalAmount: items.reduce((s, g) => s + Number(g.amount), 0),
        reasonDist,
      };
    });
    return stats;
  }, [years, byYear]);

  if (loading) return <LoadingSpinner />;

  if (gifts.length === 0) {
    return (
      <div>
        <PageHeader title="随礼" variant="rounded"
          action={<button onClick={() => navigate(ROUTES.GIVEN.NEW)} className="bg-white/20 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-white/30 transition-colors">+ 新增</button>} />
        <div className="page-container -mt-4">
          <EmptyState emoji="📭" text="暂无随礼记录" actionLabel="新增随礼" onAction={() => navigate(ROUTES.GIVEN.NEW)} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="随礼" variant="rounded"
        action={<button onClick={() => navigate(ROUTES.GIVEN.NEW)} className="bg-white/20 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-white/30 transition-colors">+ 新增</button>} />
      <div className="page-container -mt-4 space-y-3">
        {years.map(year => {
          const stats = yearStats[year];
          const reasonEntries = Object.entries(stats.reasonDist);
          return (
            <CardItem key={year} onClick={() => navigate(ROUTES.GIVEN.YEAR(year))} className="!p-4">
              <div className="text-lg font-bold text-gray-800 dark:text-white mb-2">{year}年</div>
              {reasonEntries.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-2">
                  {reasonEntries.map(([name, count]) => (
                    <span key={name} className="whitespace-nowrap inline-flex items-center gap-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-xs px-2 py-0.5 rounded-full flex-shrink-0">{name}：{count}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">共{stats.count}笔</span>
                <span className="font-bold text-purple-500">总金额: {formatCurrency(stats.totalAmount)}</span>
              </div>
            </CardItem>
          );
        })}
      </div>
    </div>
  );
}
