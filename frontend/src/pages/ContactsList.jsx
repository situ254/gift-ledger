import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { contactsApi } from '../api';
import { LoadingSpinner, PageHeader, CardItem } from '../components/UI';
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
    <div>
      <PageHeader title="亲友录" variant="rounded"
        action={<button onClick={() => navigate(ROUTES.CONTACTS.NEW)} className="bg-white/20 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-white/30 transition-colors">+ 新增</button>}>
        <div className="flex gap-2">
          <input type="text" placeholder="搜索姓名" value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-white/20 text-white placeholder-white/60 border border-white/30 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/50" />
        </div>
      </PageHeader>
      <div className="page-container -mt-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400"><div className="text-4xl mb-2">👥</div><div>暂无亲友记录</div></div>
        ) : filtered.map(c => (
            <CardItem key={c.id} onClick={() => navigate(ROUTES.CONTACTS.DETAIL(c.name))}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-800 dark:text-white">{c.name}</span>
                  {c.contact_type_name && <span className="badge badge-primary">{c.contact_type_name}</span>}
                </div>
              </div>
            </CardItem>
          ))}
      </div>
    </div>
  );
}
