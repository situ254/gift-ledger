import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { giftBooksApi, giftsReceivedApi } from '../api';
import { formatCurrency, formatDateWithLunar } from '../utils/helpers';
import { LoadingSpinner, PageHeader, YearSelector, EmptyState } from '../components/UI';
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
  // 默认全部折叠，只展示核心字段；点击卡片展开详情
  const [expanded, setExpanded] = useState(() => new Set());

  const toggle = useCallback((id) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const booksRes = await giftBooksApi.list();
        const bookData = booksRes.data;
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
            statsMap[book.id] = {
              totalRecords: res.data.length,
              totalAmount: res.data.reduce((s, g) => s + Number(g.amount), 0),
              typeCount,
            };
          } else {
            statsMap[book.id] = { totalRecords: 0, totalAmount: 0, typeCount: {} };
          }
          if (book.date) yearSet.add(String(book.date).slice(0, 4));
        });
        if (!cancelled) {
          setBooks(bookData);
          setStats(statsMap);
          setYears([...yearSet].sort((a, b) => b - a));
        }
      } catch { toast.error(MSG.LOAD_FAIL); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(
    () => books.filter(b => !selectedYear || String(b.date || '').startsWith(selectedYear)),
    [books, selectedYear]
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="礼簿" variant="rounded"
        action={
          <div className="flex items-center gap-2 flex-shrink-0">
            <YearSelector years={years} value={selectedYear} onChange={setSelectedYear} />
            <button
              onClick={() => navigate(ROUTES.GIFT_BOOKS.NEW)}
              className="bg-white/20 text-white px-2.5 py-1.5 rounded-lg text-[13px] font-medium hover:bg-white/30 transition-colors whitespace-nowrap flex-shrink-0"
            >
              + 新建礼簿
            </button>
          </div>
        }
      />
      <div className="page-container -mt-4">
        {filtered.length === 0 ? (
          <EmptyState emoji="📖" text="暂无礼簿" actionLabel="创建礼簿" onAction={() => navigate(ROUTES.GIFT_BOOKS.NEW)} />
        ) : (
          <div className="giftbook-grid">
            {filtered.map(book => {
              const s = stats[book.id] || { totalRecords: 0, totalAmount: 0, typeCount: {} };
              const typeEntries = Object.entries(s.typeCount).filter(([, c]) => c > 0);
              const isOpen = expanded.has(book.id);
              return (
                <div
                  key={book.id}
                  className={`giftbook-card ${isOpen ? 'giftbook-card-expanded' : ''}`}
                  onClick={() => toggle(book.id)}
                >
                  {/* 折叠态：核心字段一行读完 */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-bold text-gray-800 truncate" title={book.name}>{book.name}</span>
                      {book.reason_name && <span className="record-chip">{book.reason_name}</span>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-bold amount-received">{formatCurrency(s.totalAmount)}</span>
                      <span className="giftbook-toggle">{isOpen ? '收起' : '展开'}</span>
                    </div>
                  </div>

                  <div className="record-line mt-1" title={formatDateWithLunar(book.date)}>
                    {formatDateWithLunar(book.date) || '—'}
                  </div>
                  <div className="record-line">
                    共 {s.totalRecords} 笔{typeEntries.length > 0 ? ` · ${typeEntries.map(([n, c]) => `${n}${c}`).join(' / ')}` : ''}
                  </div>

                  {/* 展开态：类型明细 + 快捷操作 */}
                  {isOpen && (
                    <div className="mt-2 pt-2 border-t border-gray-100" onClick={e => e.stopPropagation()}>
                      {typeEntries.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {typeEntries.map(([n, c]) => (
                            <span key={n} className="inline-flex items-center gap-1 bg-gold-50 text-gold-600 text-xs px-2 py-0.5 rounded-full">
                              {n}：{c}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 mb-2">这个礼簿还没有收礼记录</div>
                      )}
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => navigate(ROUTES.GIFT_BOOKS.DETAIL(book.id))}
                          className="text-xs py-1.5 rounded-lg bg-gray-50 text-gray-600 active:scale-95 transition-transform"
                        >查看明细</button>
                        <button
                          onClick={() => navigate(ROUTES.GIFT_BOOKS.EDIT(book.id))}
                          className="text-xs py-1.5 rounded-lg bg-gray-50 text-gray-600 active:scale-95 transition-transform"
                        >编辑礼簿</button>
                        <button
                          onClick={() => navigate(`${ROUTES.RECEIVED.NEW}?gift_book_id=${book.id}`)}
                          className="text-xs py-1.5 rounded-lg bg-gold-50 text-gold-700 active:scale-95 transition-transform"
                        >记一笔收礼</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
