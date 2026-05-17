import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { contactsApi } from '../api';
import { LoadingSpinner } from '../components/UI';
import { ROUTES } from '../constants/routes';
import { MSG } from '../constants/messages';
import toast from 'react-hot-toast';

export default function ContactsList() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    try {
      setContacts((await contactsApi.list()).data);
    } catch { toast.error(MSG.LOAD_FAIL); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => contacts.filter(c => {
    if (search && !c.name.includes(search)) return false;
    return true;
  }), [contacts, search]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 头部 */}
      <div className="bg-[#4ecdc4] dark:bg-[#3aa89d] text-white pt-4 pb-6 px-4 rounded-b-[2rem]">
        <div className="flex items-center justify-center relative mb-4">
          <h1 className="text-xl font-bold">亲友录</h1>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="px-4 -mt-3">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm px-4 py-3">
          <input
            type="text"
            placeholder={`从${contacts.length}位亲友中搜索`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 bg-transparent border-b border-gray-200 dark:border-gray-600 pb-2 text-base focus:outline-none focus:border-[#4ecdc4] dark:focus:border-[#3aa89d] transition-colors"
          />
        </div>
      </div>

      {/* 列表 */}
      <div className="px-4 mt-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            <div className="text-4xl mb-2">👥</div>
            <div>暂无亲友记录</div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
            {filtered.map((c, idx) => (
              <div
                key={c.id}
                onClick={() => navigate(ROUTES.CONTACTS.DETAIL(c.name))}
                className={`px-4 py-3 cursor-pointer active:bg-gray-50 dark:active:bg-gray-700 transition-colors ${
                  idx < filtered.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''
                }`}
              >
                <div className="text-[#2c7a7b] dark:text-[#6ee7e0] font-medium text-lg">{c.name}</div>
                {c.type_name && (
                  <div className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{c.type_name}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
