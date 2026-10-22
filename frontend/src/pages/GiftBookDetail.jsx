import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { giftBooksApi, giftsReceivedApi } from '../api';
import { formatCurrency, formatDateWithLunar } from '../utils/helpers';
import { LoadingSpinner, PageHeader, FilterPills, AmountBadge } from '../components/UI';
import RecordCard from '../components/RecordCard';
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [bookRes, giftsRes] = await Promise.all([giftBooksApi.get(id), giftsReceivedApi.list({ gift_book_id: id })]);
        if (!cancelled) {
          setGiftBook(bookRes.data);
          setReceivedGifts(giftsRes.data);
        }
      } catch { toast.error(MSG.LOAD_FAIL); navigate(ROUTES.GIFT_BOOKS.LIST); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [id, navigate]);

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

  const totalAmount = receivedGifts.reduce((s, g) => s + Number(g.amount), 0);

  return (
    <div>
      <PageHeader title={`【${giftBook?.name || ''}】收礼明细`} variant="rounded"
        backOnClick={() => navigate(ROUTES.GIFT_BOOKS.LIST)} />
      <div className="page-container -mt-4">
        <div className="bg-white rounded-xl p-3 mb-3 border border-gray-100 shadow-sm">
          <div className="record-line !text-[13px] !text-gray-600 mb-2" title={formatDateWithLunar(giftBook?.date)}>
            {formatDateWithLunar(giftBook?.date) || '—'}
          </div>
          <div className="flex flex-wrap gap-3">
            {Object.entries(typeGroups).map(([name, data]) => (
              <AmountBadge key={name} label={name} count={data.count} amount={formatCurrency(data.amount)} />
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-50 text-xs text-gray-500 flex items-center justify-between">
            <span>共 <strong className="text-gray-700">{receivedGifts.length}</strong> 笔</span>
            <span className="font-bold amount-received">{formatCurrency(totalAmount)}</span>
          </div>
        </div>
        <FilterPills tabs={filterTabs} active={activeType} onChange={setActiveType} activeColor="primary" />
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">暂无收礼记录</div>
        ) : (
          <div className="record-grid">
            {filtered.map(g => (
              <RecordCard
                key={g.id}
                name={g.contact_name}
                chips={[g.contact_type_name]}
                date={g.gift_book_date}
                amount={g.amount}
                amountCls="amount-received"
                location={g.guests > 0 ? `参宴 ${g.guests} 人` : ''}
                notes={g.notes}
                onClick={() => navigate(ROUTES.RECEIVED.EDIT(g.id))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
