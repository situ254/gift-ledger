import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { giftBooksApi, giftsReceivedApi, contactTypesApi } from '../api';
import { formatCurrency, monthDay } from '../utils/helpers';
import { LoadingSpinner, PageHeader, FilterPills, AmountBadge } from '../components/UI';
import { ROUTES } from '../constants/routes';
import { MSG, DEFAULTS } from '../constants/messages';
import toast from 'react-hot-toast';

export default function GiftBookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [giftBook, setGiftBook] = useState(null);
  const [receivedGifts, setReceivedGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [bookRes, giftsRes] = await Promise.all([giftBooksApi.get(id), giftsReceivedApi.list({ gift_book_id: id })]);
      setGiftBook(bookRes.data);
      setReceivedGifts(giftsRes.data);
    } catch { toast.error(MSG.LOAD_FAIL); navigate(ROUTES.GIFT_BOOKS.LIST); }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  const typeGroups = useMemo(() => {
    const map = {};
    receivedGifts.forEach(g => {
      const t = g.contact_type_name || DEFAULTS.TYPE_UNKNOWN;
      map[t] ||= { count: 0, amount: 0 };
      map[t].count++;
      map[t].amount += Number(g.amount);
    });
    return map;
  }, [receivedGifts]);

  const filterTabs = useMemo(() => [
    { key: '', label: '全部' },
    ...Object.entries(typeGroups).map(([name, data]) => ({ key: name, label: `${name}(${data.count})` })),
  ], [typeGroups]);

  const filtered = useMemo(
    () => activeType ? receivedGifts.filter(g => (g.contact_type_name || DEFAULTS.TYPE_UNKNOWN) === activeType) : receivedGifts,
    [receivedGifts, activeType]
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title={`【${giftBook?.name}】收礼明细`} variant="rounded"
        backOnClick={() => navigate(ROUTES.GIFT_BOOKS.LIST)} />
      <div className="page-container -mt-4">
        <FilterPills tabs={filterTabs} active={activeType} onChange={setActiveType} activeColor="primary" />
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 mb-3 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex flex-wrap gap-3">
            {Object.entries(typeGroups).map(([name, data]) => (
              <AmountBadge key={name} label={name} count={data.count} amount={formatCurrency(data.amount)} />
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-50 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
            共 <strong className="text-gray-700 dark:text-gray-200">{receivedGifts.length}</strong> 笔
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">暂无收礼记录</div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            {filtered.map((g, idx) => (
              <div key={g.id}
                onClick={() => navigate(ROUTES.RECEIVED.EDIT(g.id))}
                className={`flex items-center px-4 py-3 cursor-pointer active:bg-gray-50 dark:active:bg-gray-700 transition-colors ${idx < filtered.length - 1 ? 'border-b border-gray-50 dark:border-gray-700' : ''}`}>
                <span className="text-gray-300 dark:text-gray-600 text-xs w-8 text-right mr-3">{filtered.length - idx}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800 dark:text-white truncate">{g.contact_name}</span>
                    {g.contact_type_name && <span className="inline-block bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs px-1.5 py-0.5 rounded">{g.contact_type_name}</span>}
                  </div>
                  <div className="text-xs text-gray-400">{monthDay(g.gift_book_date)}</div>
                </div>
                <span className="font-bold text-blue-500 ml-3">{formatCurrency(g.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
