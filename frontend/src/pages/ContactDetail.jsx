import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { contactsApi } from '../api';
import { formatCurrency, monthDay } from '../utils/helpers';
import { LoadingSpinner, PageHeader, CardItem } from '../components/UI';
import { ROUTES } from '../constants/routes';
import { MSG, DEFAULTS } from '../constants/messages';
import toast from 'react-hot-toast';

export default function ContactDetail() {
  const { name } = useParams();
  const navigate = useNavigate();
  const decodedName = decodeURIComponent(name);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('received');

  const loadData = useCallback(async () => {
    try { setDetail((await contactsApi.getDetail(decodedName)).data); }
    catch { toast.error(MSG.LOAD_DETAIL_FAIL); navigate(ROUTES.HOME); }
    finally { setLoading(false); }
  }, [decodedName, navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  const { total_received = 0, total_given = 0, net = 0, received_records = [], given_records = [] } = detail || {};

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title={`【${decodedName}】人情往来`} variant="rounded"
        backOnClick={() => navigate(-1)} />
      <div className="page-container -mt-4">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 shadow-sm text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">收礼总次数</div>
            <div className="font-bold text-blue-500 text-lg">{received_records.length}<span className="text-xs font-normal ml-0.5">笔</span></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 shadow-sm text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">收礼总金额（元）</div>
            <div className="font-bold text-blue-500 text-lg">{formatCurrency(total_received)}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 shadow-sm text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">随礼总次数</div>
            <div className="font-bold text-purple-500 text-lg">{given_records.length}<span className="text-xs font-normal ml-0.5">笔</span></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 shadow-sm text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">随礼总金额（元）</div>
            <div className="font-bold text-purple-500 text-lg">{formatCurrency(total_given)}</div>
          </div>
        </div>

        <div className="flex gap-2 mb-3">
          <button onClick={() => setActiveTab('received')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'received' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
            收礼（{received_records.length}）
          </button>
          <button onClick={() => setActiveTab('given')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'given' ? 'bg-purple-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
            随礼（{given_records.length}）
          </button>
        </div>

        {activeTab === 'received' && (
          <div className="space-y-2">
            {received_records.length === 0
              ? <div className="text-center py-8 text-gray-400">暂无收礼记录</div>
              : received_records.map(r => (
                <CardItem key={`r-${r.id}`} onClick={() => navigate(ROUTES.RECEIVED.EDIT(r.id))}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-block bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded font-medium">收</span>
                      <span className="font-medium text-gray-800 dark:text-white">{r.contact_name || decodedName}</span>
                    </div>
                    <span className="font-bold text-blue-500">{formatCurrency(r.amount)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                    {r.gift_book_name && <span>{r.gift_book_name}</span>}
                    <span>{monthDay(r.gift_book_date)}</span>
                  </div>
                </CardItem>
              ))
            }
          </div>
        )}

        {activeTab === 'given' && (
          <div className="space-y-2">
            {given_records.length === 0
              ? <div className="text-center py-8 text-gray-400">暂无随礼记录</div>
              : given_records.map(g => (
                <CardItem key={`g-${g.id}`} onClick={() => navigate(ROUTES.GIVEN.EDIT(g.id))}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-block bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded font-medium">随</span>
                      <span className="font-medium text-gray-800 dark:text-white">{g.contact_name || decodedName}</span>
                      {g.reason_name && <span className="inline-block bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs px-1.5 py-0.5 rounded">{g.reason_name}</span>}
                    </div>
                    <span className="font-bold text-purple-500">{formatCurrency(g.amount)}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{monthDay(g.gift_date)}</div>
                </CardItem>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
}
