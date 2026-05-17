import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { contactsApi, contactTypesApi } from '../api';
import { formatCurrency, monthDay } from '../utils/helpers';
import { LoadingSpinner, PageHeader, CardItem } from '../components/UI';
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

  const loadData = useCallback(async () => {
    try { setDetail((await contactsApi.getDetail(decodedName)).data); }
    catch { toast.error(MSG.LOAD_DETAIL_FAIL); navigate(ROUTES.HOME); }
    finally { setLoading(false); }
  }, [decodedName, navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  const { total_received = 0, total_given = 0, net = 0, received_records = [], given_records = [] } = detail || {};

  // 人情往来差额：收礼 - 随礼 = net
  // net = total_received - total_given
  // net > 0 → 收礼 > 随礼 → 我差别人礼（我收的多，我欠别人礼）→ 绿色
  // net < 0 → 收礼 < 随礼 → 别人差我礼（我随的多，别人欠我礼）→ 红色
  // net === 0 → 收支平衡 → 灰色
  const balanceLabel = net > 0 ? `我差别人 ${formatCurrency(net)}` : net < 0 ? `别人差我 ${formatCurrency(Math.abs(net))}` : '收支平衡';
  const balanceColor = net > 0 ? 'text-green-500' : net < 0 ? 'text-red-500' : 'text-gray-500';

  const handleDeleteContact = useCallback(async () => {
    if (!window.confirm(DELETE_CONTACT_CONFIRM)) return;
    try {
      // 需要获取contact id才能删除，这里先获取联系人列表
      const res = await contactsApi.list();
      const contact = res.data.find(c => c.name === decodedName);
      if (!contact) {
        toast.error('未找到该好友');
        return;
      }
      await contactsApi.delete(contact.id);
      toast.success(MSG.DELETE_SUCCESS);
      navigate(ROUTES.CONTACTS.LIST);
    } catch {
      toast.error(MSG.DELETE_FAIL);
    }
  }, [decodedName, navigate]);

  if (loading) return <LoadingSpinner />;

  const records = activeTab === 'received' ? received_records : given_records;

  return (
    <div>
      <PageHeader title={`【${decodedName}】人情往来`} variant="rounded"
        backOnClick={() => navigate(-1)}>
        <button onClick={() => setShowMenu(!showMenu)}
          className="text-white text-xl font-bold px-2 py-1">
          ⋮
        </button>
      </PageHeader>

      {/* 下拉菜单 */}
      {showMenu && (
        <div className="absolute right-4 top-16 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 w-32">
          <button onClick={() => { setShowMenu(false); navigate(ROUTES.GIVEN.NEW); }}
            className="w-full text-left px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
            添加随礼
          </button>
          <button onClick={() => { setShowMenu(false); navigate(ROUTES.RECEIVED.NEW); }}
            className="w-full text-left px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
            添加收礼
          </button>
          <button onClick={() => { setShowMenu(false); handleDeleteContact(); }}
            className="w-full text-left px-4 py-3 text-red-500 hover:bg-red-50 text-sm">
            删除好友
          </button>
        </div>
      )}

      <div className="page-container -mt-4">
        {/* 收礼/随礼切换标签 */}
        <div className="flex gap-2 mb-3">
          <button onClick={() => setActiveTab('received')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'received' ? 'bg-teal-400 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
            收礼（{received_records.length}）
          </button>
          <button onClick={() => setActiveTab('given')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'given' ? 'bg-purple-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
            随礼（{given_records.length}）
          </button>
        </div>

        {/* 记录列表 */}
        <div className="space-y-3 mb-4">
          {records.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              {activeTab === 'received' ? '暂无收礼记录' : '暂无随礼记录'}
            </div>
          ) : records.map(r => (
            <div key={r.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 border-l-4 border-teal-400 shadow-sm"
              onClick={() => {
                if (activeTab === 'received') {
                  navigate(ROUTES.RECEIVED.EDIT(r.id));
                } else {
                  navigate(ROUTES.GIVEN.EDIT(r.id));
                }
              }}>
              {/* 姓名 */}
              <div className="text-teal-500 font-medium text-lg mb-2">
                {r.contact_name || decodedName}
              </div>
              {/* 详细信息 */}
              <div className="space-y-1 text-sm text-gray-500 dark:text-gray-400">
                {activeTab === 'received' ? (
                  <>
                    {r.gift_book_name && <div>礼簿：{r.gift_book_name}</div>}
                    {r.contact_type_name && <div>关系：{r.contact_type_name}</div>}
                    <div>日期：{r.gift_book_date || r.date}</div>
                  </>
                ) : (
                  <>
                    {r.contact_type_name && <div>关系：{r.contact_type_name}</div>}
                    {r.reason_name && <div>事由：{r.reason_name}</div>}
                    <div>日期：{r.gift_date || r.date}</div>
                  </>
                )}
                {r.notes && <div className="text-gray-400">备注：{r.notes}</div>}
              </div>
              {/* 金额 */}
              <div className="mt-2 flex justify-end">
                <span className={`font-bold text-lg ${activeTab === 'received' ? 'text-red-500' : 'text-blue-500'}`}>
                  {activeTab === 'received' ? '+' : '-'}{formatCurrency(r.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 底部统计信息 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400">收礼总次数</div>
              <div className="font-bold text-orange-500 text-lg">{received_records.length}<span className="text-xs font-normal">次</span></div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400">收礼总金额</div>
              <div className="font-bold text-orange-500 text-lg">{formatCurrency(total_received)}<span className="text-xs font-normal">元</span></div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400">随礼总次数</div>
              <div className="font-bold text-blue-500 text-lg">{given_records.length}<span className="text-xs font-normal">次</span></div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400">随礼总金额</div>
              <div className="font-bold text-blue-500 text-lg">{formatCurrency(total_given)}<span className="text-xs font-normal">元</span></div>
            </div>
          </div>
          {/* 人情往来差额 */}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-3 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">人情往来差额</div>
            <div className={`font-bold text-lg ${balanceColor}`}>{balanceLabel}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
