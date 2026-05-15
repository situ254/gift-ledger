import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { contactTypesApi } from '../api';
import { LoadingSpinner, PageHeader } from '../components/UI';
import { useDeleteWithConfirm } from '../hooks';
import { ROUTES } from '../constants/routes';
import { MSG } from '../constants/messages';
import toast from 'react-hot-toast';

export default function ContactTypesList() {
  const navigate = useNavigate();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try { setTypes((await contactTypesApi.list()).data); }
    catch { toast.error(MSG.LOAD_FAIL); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const { handleDelete } = useDeleteWithConfirm(
    contactTypesApi.delete, MSG.CONFIRM_DELETE_TYPE, loadData
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="亲友类型管理" variant="flat" backOnClick={() => navigate(ROUTES.PROFILE)} />
      <div className="page-container">
        <button onClick={() => navigate(ROUTES.CONTACT_TYPES.NEW)} className="btn-primary w-full py-3 mb-4">+ 新增类型</button>
        <div className="space-y-2">
          {types.map(t => (
            <div key={t.id} className="card flex items-center justify-between">
              <span className="font-medium text-gray-800 dark:text-white">{t.name}</span>
              <div className="flex gap-2">
                <button onClick={() => navigate(ROUTES.CONTACT_TYPES.EDIT(t.id))} className="text-sm text-primary-500 hover:underline">编辑</button>
                <button onClick={() => handleDelete(t.id)} className="text-sm text-red-500 hover:underline">删除</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
