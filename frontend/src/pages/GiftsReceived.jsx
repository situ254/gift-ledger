import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { giftsReceivedApi, giftBooksApi } from '../api';
import { formatCurrency, extractYear } from '../utils/helpers';
import { LoadingSpinner, PageHeader, EmptyState, CardItem } from '../components/UI';
import { ROUTES } from '../constants/routes';
import { MSG, DEFAULTS } from '../constants/messages';
import toast from 'react-hot-toast';

export default function GiftsReceived() {
  const navigate = useNavigate();
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [giftsRes, booksRes] = await Promise.all([giftsReceivedApi.list(), giftBooksApi.list()]);
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
      const year = g.gift_book_date ? g.gift_book_date.slice(0, 4) : DEFAULTS.YEAR_UNKNOWN;
      groups[year] ||= [];
      groups[year].push(g);
    });
    return groups;
  }, [gifts]);

  const yearKeys = useMemo(() => Object.keys(byYear).sort((a, b) => b - a), [byYear]);

  const yearStats = useMemo(() => {
    const stats = {};
    yearKeys.forEach(year => {
      const items = byYear[year];
      stats[year] = { count: items.length, totalAmount: items.reduce((s, g) => s + Number(g.amount), 0) };
    });
    return stats;
  }, [yearKeys, byYear]);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="收礼管理" variant="rounded"
        action={<button onClick={() => navigate(ROUTES.RECEIVED.NEW)} className="bg-white/20 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-white/30 transition-colors">+ 新增</button>} />
      <div className="page-container -mt-4">
        {yearKeys.length === 0 ? (
          <EmptyState emoji="📭" text="暂无收礼记录" actionLabel="新增收礼" onAction={() => navigate(ROUTES.RECEIVED.NEW)} />
        ) : (
          <div className="space-y-3">
            {yearKeys.map(year => {
              const stats = yearStats[year];
              return (
                <CardItem key={year} onClick={() => navigate(ROUTES.RECEIVED.YEAR(year))} className="!p-4">
                  <div className="text-lg font-bold text-gray-800 dark:text-white mb-2">{year}年</div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">共{stats.count}笔</span>
                    <span className="font-bold text-blue-500">总金额: {formatCurrency(stats.totalAmount)}</span>
                  </div>
                </CardItem>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
