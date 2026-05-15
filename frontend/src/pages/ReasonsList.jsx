import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { reasonsApi } from '../api';
import { LoadingSpinner, PageHeader } from '../components/UI';
import { useDeleteWithConfirm } from '../hooks';
import { ROUTES } from '../constants/routes';
import { MSG } from '../constants/messages';
import toast from 'react-hot-toast';

export default function ReasonsList() {
  const navigate = useNavigate();
  const [reasons, setReasons] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try { setReasons((await reasonsApi.list()).data); }
    catch { toast.error(MSG.LOAD_FAIL); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const { handleDelete } = useDeleteWithConfirm(
    reasonsApi.delete, MSG.CONFIRM_DELETE_REASON, loadData
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="事由管理" variant="flat" backOnClick={() => navigate(ROUTES.PROFILE)} />
      <div className="page-container">
        <button onClick={() => navigate(ROUTES.REASONS.NEW)} className="btn-primary w-full py-3 mb-4">+ 新增事由</button>
        <div className="space-y-2">
          {reasons.map(r => (
            <div key={r.id} className="card flex items-center justify-between">
              <span className="font-medium text-gray-800 dark:text-white">{r.name}</span>
              <div className="flex gap-2">
                <button onClick={() => navigate(ROUTES.REASONS.EDIT(r.id))} className="text-sm text-primary-500 hover:underline">编辑</button>
                <button onClick={() => handleDelete(r.id)} className="text-sm text-red-500 hover:underline">删除</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
