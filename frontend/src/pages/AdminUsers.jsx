import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner, PageHeader } from '../components/UI';
import { ROUTES } from '../constants/routes';
import { MSG } from '../constants/messages';
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try { setUsers((await adminApi.listUsers()).data); }
    catch { toast.error(MSG.LOAD_FAIL); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (!isAdmin) { navigate(ROUTES.HOME); return; } loadData(); }, [isAdmin, navigate, loadData]);

  const handleDelete = useCallback(async (id) => {
    if (!confirm(MSG.CONFIRM_DELETE_USER)) return;
    try { await adminApi.deleteUser(id); toast.success(MSG.DELETE_SUCCESS); loadData(); }
    catch { toast.error(MSG.DELETE_FAIL); }
  }, [loadData]);

  const handleRoleChange = useCallback(async (id, role) => {
    try { await adminApi.updateUserRole(id, role); toast.success(MSG.UPDATE_SUCCESS); loadData(); }
    catch { toast.error(MSG.SAVE_FAIL); }
  }, [loadData]);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="用户管理" variant="flat" backOnClick={() => navigate(ROUTES.HOME)} />
      <div className="page-container space-y-2">
        {users.map(u => (
          <div key={u.id} className="card flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-800 dark:text-white">{u.username}</div>
              <div className="text-xs text-gray-400">{u.role === 'admin' ? '管理员' : '普通用户'}</div>
            </div>
            <div className="flex gap-2 items-center">
              <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)} className="select-field !w-auto text-sm">
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
              </select>
              <button onClick={() => handleDelete(u.id)} className="text-sm text-red-500 hover:underline">删除</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
