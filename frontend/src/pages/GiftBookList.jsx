import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { giftBooksApi, giftsReceivedApi } from '../api';
import { formatCurrency, shortenDate, lunarDate } from '../utils/helpers';
import { LoadingSpinner, PageHeader, YearSelector, EmptyState, CardItem } from '../components/UI';
import { ROUTES } from '../constants/routes';
import { MSG } from '../constants/messages';
import toast from 'react-hot-toast';

export default function GiftBookList() {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('');
  const [years, setYears] = useState([]);

  const loadData = useCallback(async () => {
    try {
      const booksRes = await giftBooksApi.list();
      const bookData = booksRes.data;
      // 并行获取所有礼簿的收礼统计（修复原版N+1问题）
      const statsResults = await Promise.all(
        bookData.map(book => giftsReceivedApi.list({ gift_book_id: book.id }).catch(() => null))
      );
      const statsMap = {};
      const yearSet = new Set();
      bookData.forEach((book, i) => {
        const res = statsResults[i];
        if (res) {
          const typeCount = {};
          res.data.forEach(g => { const t = g.contact_type_name || '其它'; typeCount[t] = (typeCount[t] || 0) + 1; });
          statsMap[book.id] = { totalRecords: res.data.length, totalAmount: res.data.reduce((s, g) => s + Number(g.amount), 0), typeCount };
        } else {
          statsMap[book.id] = { totalRecords: 0, totalAmount: 0, typeCount: {} };
        }
        if (book.date) yearSet.add(book.date.slice(0, 4));
      });
      setBooks(bookData);
      setStats(statsMap);
      setYears([...yearSet].sort((a, b) => b - a));
    } catch { toast.error(MSG.LOAD_FAIL); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => books.filter(b => !selectedYear || b.date?.startsWith(selectedYear)), [books, selectedYear]);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="礼簿" variant="rounded"
        action={
          <div className="flex items-center gap-2">
            <YearSelector years={years} value={selectedYear} onChange={setSelectedYear} />
            <button onClick={() => navigate(ROUTES.GIFT_BOOKS.NEW)} className="bg-white/20 text-white w-8 h-8 rounded-lg text-lg font-medium hover:bg-white/30 transition-colors flex items-center justify-center">+</button>
          </div>
        } />
      <div className="page-container -mt-4">
        {filtered.length === 0 ? (
          <EmptyState emoji="📖" text="暂无礼簿" actionLabel="创建第一个礼簿" onAction={() => navigate(ROUTES.GIFT_BOOKS.NEW)} />
        ) : (
          <div className="space-y-3">
            {filtered.map(book => {
              const s = stats[book.id] || { totalRecords: 0, totalAmount: 0, typeCount: {} };
              const typeEntries = Object.entries(s.typeCount).filter(([, c]) => c > 0);
              return (
                <CardItem key={book.id} onClick={() => navigate(ROUTES.GIFT_BOOKS.DETAIL(book.id))} className="!p-4">
                  <div className="font-bold text-gray-800 dark:text-white text-lg">{book.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {shortenDate(book.date)}
                    {book.date && <span className="ml-1 text-gray-400">（{lunarDate(book.date)}）</span>}
                  </div>
                  {typeEntries.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {typeEntries.map(([n, c]) => <span key={n} className="inline-block bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs px-2 py-0.5 rounded-full">{n}:{c}</span>)}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50 dark:border-gray-700">
                    <span className="text-sm text-gray-500 dark:text-gray-400">💎 共<strong className="text-gray-700 dark:text-gray-200">{s.totalRecords}</strong>笔</span>
                    <span className="font-bold text-primary-500">📈 {formatCurrency(s.totalAmount)}</span>
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
