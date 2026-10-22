import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { contactsApi } from '../api';
import { formatCurrency } from '../utils/helpers';
import { LoadingSpinner, PageHeader } from '../components/UI';
import RecordCard from '../components/RecordCard';
import { ROUTES } from '../constants/routes';
import { MSG } from '../constants/messages';
import toast from 'react-hot-toast';

const DELETE_CONTACT_CONFIRM = '确定删除该好友吗？删除后不可恢复。';

export default function ContactDetail() {
  const { name } = useParams();
  const navigate = useNavigate();
  const decodedName = decodeURIComponent(name);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('received');
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { if (!cancelled) setDetail((await contactsApi.getDetail(decodedName)).data); }
      catch { toast.error(MSG.LOAD_DETAIL_FAIL); navigate(ROUTES.HOME); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [decodedName, navigate]);

  const { total_received = 0, total_given = 0, net = 0, received_records = [], given_records = [] } = detail || {};

  const balanceLabel = net > 0 ? `我差别人 ${formatCurrency(net)}` : net < 0 ? `别人差我 ${formatCurrency(Math.abs(net))}` : '收支平衡';
  const balanceColor = net > 0 ? 'text-green-500' : net < 0 ? 'amount-given' : 'text-gray-500';

  const handleDeleteContact = useCallback(async () => {
    if (!window.confirm(DELETE_CONTACT_CONFIRM)) return;
    try {
      const res = await contactsApi.list();
      const contact = res.data.find(c => c.name === decodedName);
      if (!contact) { toast.error('未找到该好友'); return; }
      await contactsApi.delete(contact.id);
      toast.success(MSG.DELETE_SUCCESS);
      navigate(ROUTES.CONTACTS.LIST);
    } catch { toast.error(MSG.DELETE_FAIL); }
  }, [decodedName, navigate]);

  if (loading) return <LoadingSpinner />;

  const records = activeTab === 'received' ? received_records : given_records;

  return (
    <div>
      <PageHeader title={`【${decodedName}】人情往来`} variant="rounded"
        backOnClick={() => navigate(-1)}>
        <button onClick={() => setShowMenu(!showMenu)}
          className="text-white text-xl font-bold px-2 py-1">⋮</button>
      </PageHeader>

      {showMenu && (
        <div className="absolute right-4 top-16 bg-white rounded-lg shadow-lg border border-gray-200 z-50 w-32">
          <button onClick={() => { setShowMenu(false); navigate(ROUTES.GIVEN.NEW); }}
            className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 text-sm">添加随礼</button>
          <button onClick={() => { setShowMenu(false); navigate(ROUTES.RECEIVED.NEW); }}
            className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 text-sm">添加收礼</button>
          <button onClick={() => { setShowMenu(false); handleDeleteContact(); }}
            className="w-full text-left px-4 py-3 text-red-500 hover:bg-red-50 text-sm">删除好友</button>
        </div>
      )}

      <div className="page-container -mt-4">
        {/* 收礼/随礼切换标签 - 新中式配色 */}
        <div className="flex gap-2 mb-3">
          <button onClick={() => setActiveTab('received')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'received' ? 'bg-gold-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
            收礼（{received_records.length}）
          </button>
          <button onClick={() => setActiveTab('given')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'given' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
            随礼（{given_records.length}）
          </button>
        </div>

        {/* 记录列表 - 紧凑卡片，单行多条 */}
        <div className="record-grid mb-4">
          {records.length === 0 ? (
            <div className="text-center py-8 text-gray-400 col-span-full">
              {activeTab === 'received' ? '暂无收礼记录' : '暂无随礼记录'}
            </div>
          ) : records.map(r => (
            <RecordCard
              key={r.id}
              name={r.contact_name || decodedName}
              chips={activeTab === 'received'
                ? [r.gift_book_name, r.contact_type_name]
                : [r.reason_name, r.contact_type_name]}
              date={activeTab === 'received' ? (r.gift_book_date || r.date) : (r.gift_date || r.date)}
              amount={r.amount}
              amountCls={activeTab === 'received' ? 'amount-received' : 'amount-given'}
              location={activeTab === 'received'
                ? (r.gift_book_name ? `礼簿 · ${r.gift_book_name}` : '')
                : (r.reason_name ? `事由 · ${r.reason_name}` : '')}
              notes={r.notes}
              onClick={() => {
                if (activeTab === 'received') navigate(ROUTES.RECEIVED.EDIT(r.id));
                else navigate(ROUTES.GIVEN.EDIT(r.id));
              }}
            />
          ))}
        </div>

        {/* 底部统计信息 */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="text-center">
              <div className="text-xs text-gray-500">收礼总次数</div>
              <div className="font-bold amount-received text-lg">{received_records.length}<span className="text-xs font-normal">次</span></div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">收礼总金额</div>
              <div className="font-bold amount-received text-lg">{formatCurrency(total_received)}<span className="text-xs font-normal">元</span></div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">随礼总次数</div>
              <div className="font-bold amount-given text-lg">{given_records.length}<span className="text-xs font-normal">次</span></div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">随礼总金额</div>
              <div className="font-bold amount-given text-lg">{formatCurrency(total_given)}<span className="text-xs font-normal">元</span></div>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-3 text-center">
            <div className="text-xs text-gray-500">人情往来差额</div>
            <div className={`font-bold text-lg ${balanceColor}`}>{balanceLabel}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
