import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { statsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/helpers';
import { LoadingSpinner, PageHeader, YearSelector, CardItem } from '../components/UI';
import { ROUTES } from '../constants/routes';
import { MSG } from '../constants/messages';
import toast from 'react-hot-toast';

export default function Home() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [oweMe, setOweMe] = useState([]);
  const [iOwe, setIOwe] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('');
  const [availableYears, setAvailableYears] = useState([]);

  const loadData = useCallback(async () => {
    try {
      const params = selectedYear ? { year: selectedYear } : {};
      const res = await statsApi.summary(params);
      setSummary(res.data);
      setAvailableYears(res.data.availableYears || []);
      setOweMe(res.data.oweMe || []);
      setIOwe(res.data.iOwe || []);
    } catch {
      toast.error(MSG.LOAD_FAIL);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => { loadData(); }, [loadData]);

  const net = useMemo(() => (summary?.totalReceived || 0) - (summary?.totalGiven || 0), [summary]);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="人情记账" variant="rounded"
        action={availableYears.length > 0 && <YearSelector years={availableYears} value={selectedYear} onChange={setSelectedYear} />}>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '收礼总额', value: summary?.totalReceived || 0 },
            { label: '随礼总额', value: summary?.totalGiven || 0 },
            { label: '净额', value: net, prefix: net >= 0 ? '+' : '' },
          ].map(({ label, value, prefix }) => (
            <div key={label} className="bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm">
              <div className="text-xs text-white/80 mb-1">{label}</div>
              <div className="text-lg font-bold text-white">{prefix || ''}{formatCurrency(value)}</div>
            </div>
          ))}
        </div>
      </PageHeader>

      <div className="page-container -mt-4">
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { path: ROUTES.GIVEN.NEW, color: 'purple', label: '新增随礼', icon: 'M12 19V5m0 0l-7 7m7-7l7 7' },
            { path: ROUTES.RECEIVED.NEW, color: 'blue', label: '新增收礼', icon: 'M12 5v14m0 0l7-7m-7 7l-7-7' },
            { path: ROUTES.GIFT_BOOKS.NEW, color: 'green', label: '新增礼簿', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
            { path: ROUTES.CONTACTS.LIST, color: 'orange', label: '亲友录', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
          ].map(({ path, color, label, icon }) => (
            <button key={path} onClick={() => navigate(path)}
              className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col items-center gap-1 active:scale-95 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" className={`w-6 h-6 text-${color}-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
              </svg>
              <span className="text-xs text-gray-600 dark:text-gray-300">{label}</span>
            </button>
          ))}
        </div>

        {oweMe.length > 0 && (
          <div className="mb-4">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">🔻 别人差我礼</h2>
            <div className="space-y-2">
              {oweMe.map(item => (
                <CardItem key={item.contact_name} onClick={() => navigate(ROUTES.CONTACTS.DETAIL(item.contact_name))}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-800 dark:text-white">{item.contact_name}</span>
                    <span className="font-bold text-red-500">{formatCurrency(Math.abs(item.net))}</span>
                  </div>
                </CardItem>
              ))}
            </div>
          </div>
        )}

        {iOwe.length > 0 && (
          <div className="mb-4">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">🔺 我差别人礼</h2>
            <div className="space-y-2">
              {iOwe.map(item => (
                <CardItem key={item.contact_name} onClick={() => navigate(ROUTES.CONTACTS.DETAIL(item.contact_name))}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-800 dark:text-white">{item.contact_name}</span>
                    <span className="font-bold text-green-500">{formatCurrency(Math.abs(item.net))}</span>
                  </div>
                </CardItem>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
