import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { giftsReceivedApi } from '../api';
import { formatCurrency } from '../utils/helpers';
import { LoadingSpinner, PageHeader, FilterPills, SummaryBar } from '../components/UI';
import RecordCard from '../components/RecordCard';
import { ROUTES } from '../constants/routes';
import { MSG, DEFAULTS } from '../constants/messages';
import toast from 'react-hot-toast';

export default function GiftsReceivedDetail() {
  const { year } = useParams();
  const navigate = useNavigate();
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeReason, setActiveReason] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await giftsReceivedApi.list({ year });
        const yearGifts = res.data.filter(g => g.gift_book_date && String(g.gift_book_date).startsWith(year));
        if (!cancelled) setGifts(yearGifts);
      } catch { toast.error(MSG.LOAD_FAIL); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [year]);

  const reasonGroups = useMemo(() => {
    const map = {};
    gifts.forEach(g => {
      const r = g.reason_name || g.gift_book_name || DEFAULTS.TYPE_UNKNOWN;
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
    () => activeReason
      ? gifts.filter(g => (g.reason_name || g.gift_book_name || DEFAULTS.TYPE_UNKNOWN) === activeReason)
      : gifts,
    [gifts, activeReason]
  );

  const totalAmount = useMemo(() => filtered.reduce((s, g) => s + Number(g.amount), 0), [filtered]);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title={`${year}年收礼明细`} variant="rounded"
        backOnClick={() => navigate(ROUTES.RECEIVED.LIST)} />
      <div className="page-container -mt-4">
        <FilterPills tabs={filterTabs} active={activeReason} onChange={setActiveReason} activeColor="gold" />
        <SummaryBar count={filtered.length} amount={`共: ${formatCurrency(totalAmount)}`} amountColor="amount-received" />
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">暂无收礼记录</div>
        ) : (
          <div className="record-grid">
            {filtered.map(g => (
              <RecordCard
                key={g.id}
                name={g.contact_name}
                chips={[g.reason_name || '其它', g.contact_type_name]}
                date={g.gift_book_date}
                amount={g.amount}
                amountCls="amount-received"
                location={g.gift_book_name ? `礼簿 · ${g.gift_book_name}` : ''}
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
