import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { statsApi } from '../api';
import { formatCurrency } from '../utils/helpers';
import { LoadingSpinner, PageHeader, YearSelector, CardItem } from '../components/UI';
import { ROUTES } from '../constants/routes';
import { MSG } from '../constants/messages';
import toast from 'react-hot-toast';

/**
 * 人情余额分区
 *
 * 首页的「别人差我礼 / 我差别人礼」按"累计往来"展示：
 * 只要这个人跟我之间有过收礼或随礼，就一定会出现在下面某一块里，
 * 不会因为新增记录的年份不属于当前筛选年份、或收送金额刚好相抵而"凭空消失"。
 */
function BalanceSection({ title, hint, items, tone, onOpen }) {
  if (items.length === 0) return null;

  const amountCls = tone === 'oweMe' ? 'amount-received' : tone === 'iOwe' ? 'amount-given' : 'text-gray-500';

  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-sm font-bold text-gray-700">{title}</h2>
        <span className="text-xs text-gray-400">{hint}</span>
      </div>
      <div className="responsive-list-sm">
        {items.map(item => (
          <CardItem key={item.contact_name} onClick={() => onOpen(item.contact_name)}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-gray-800 truncate">{item.contact_name}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  收 {formatCurrency(item.received)} · 送 {formatCurrency(item.given)}
                </div>
              </div>
              <span className={`font-bold shrink-0 ${amountCls}`}>
                {item.net === 0 ? '两清' : formatCurrency(Math.abs(item.net))}
              </span>
            </div>
          </CardItem>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [oweMe, setOweMe] = useState([]);
  const [iOwe, setIOwe] = useState([]);
  const [settled, setSettled] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('');
  const [availableYears, setAvailableYears] = useState([]);
  const [refreshTick, setRefreshTick] = useState(0);

  const load = useCallback(async (year) => {
    const params = year ? { year } : {};
    const res = await statsApi.summary(params);
    return res.data;
  }, []);

  // 数据拉取：挂载、切换年份、以及 refreshTick 变化（回到前台/重新聚焦）时触发
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await load(selectedYear);
        if (cancelled) return;
        setSummary(data);
        setAvailableYears(data.availableYears || []);
        setOweMe(data.oweMe || []);
        setIOwe(data.iOwe || []);
        setSettled(data.settled || []);
      } catch {
        if (!cancelled) toast.error(MSG.LOAD_FAIL);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedYear, refreshTick, load]);

  // 兜底刷新：App 从后台切回、或页面重新获得焦点时再同步一次最新数据
  // （解决"刚新增完记录、回到首页仍是旧数据"的问题）
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'hidden') return;
      setRefreshTick(t => t + 1);
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const net = useMemo(() => (summary?.totalReceived || 0) - (summary?.totalGiven || 0), [summary]);
  const hasAnyBalance = oweMe.length > 0 || iOwe.length > 0 || settled.length > 0;

  if (loading && !summary) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="人情记账" variant="rounded"
        action={availableYears.length > 0 && <YearSelector years={availableYears} value={selectedYear} onChange={setSelectedYear} />}>
        {/* 渐变头部统计区 */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '收礼总额', value: summary?.totalReceived || 0 },
            { label: '随礼总额', value: summary?.totalGiven || 0 },
            { label: net > 0 ? '我差别人礼' : net < 0 ? '别人差我礼' : '收支平衡', value: Math.abs(net) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm">
              <div className="text-xs text-white/80 mb-1">{label}</div>
              <div className="text-lg font-bold text-white">{formatCurrency(value)}</div>
            </div>
          ))}
        </div>
      </PageHeader>

      <div className="page-container -mt-4">
        {/* 快捷操作区 */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { path: ROUTES.GIVEN.NEW,      color: 'red',    label: '新增随礼', icon: 'M12 19V5m0 0l-7 7m7-7l7 7' },
            { path: ROUTES.RECEIVED.NEW,   color: 'gold',   label: '新增收礼', icon: 'M12 5v14m0 0l7-7m-7 7l-7-7' },
            { path: ROUTES.GIFT_BOOKS.NEW, color: 'green',  label: '新增礼簿', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
            { path: ROUTES.CONTACTS.LIST,  color: 'orange', label: '亲友录',   icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
          ].map(({ path, color, label, icon }) => (
            <button key={path} onClick={() => navigate(path)}
              className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex flex-col items-center gap-1 active:scale-95 transition-[transform,box-shadow] duration-150 ease-snap">
              <svg xmlns="http://www.w3.org/2000/svg" className={`w-6 h-6 text-${color}-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
              </svg>
              <span className="text-xs text-gray-600">{label}</span>
            </button>
          ))}
        </div>

        {!hasAnyBalance ? (
          <div className="text-center py-10 text-gray-400">
            <div className="text-4xl mb-2">🧧</div>
            <div className="text-sm">还没有人情往来记录</div>
            <div className="text-xs text-gray-300 mt-1">新增收礼 / 随礼后，这里会自动按人统计</div>
          </div>
        ) : (
          <>
            <BalanceSection
              title="🔴 别人差我礼"
              hint="累计计算"
              items={oweMe}
              tone="oweMe"
              onOpen={name => navigate(ROUTES.CONTACTS.DETAIL(name))}
            />
            <BalanceSection
              title="🟡 我差别人礼"
              hint="累计计算"
              items={iOwe}
              tone="iOwe"
              onOpen={name => navigate(ROUTES.CONTACTS.DETAIL(name))}
            />
            <BalanceSection
              title="⚪️ 已两清"
              hint="收送相抵"
              items={settled}
              tone="settled"
              onOpen={name => navigate(ROUTES.CONTACTS.DETAIL(name))}
            />
            {selectedYear && (
              <p className="text-xs text-gray-400 text-center mt-2">
                人情余额按全部年份累计统计，顶部金额按 {selectedYear} 年统计
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
