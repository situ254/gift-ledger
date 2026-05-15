import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner, PageHeader } from '../components/UI';
import { ROUTES } from '../constants/routes';
import { MSG } from '../constants/messages';
import toast from 'react-hot-toast';

export default function AdminSystem() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) { navigate(ROUTES.HOME); return; }
    adminApi.systemInfo().then(res => setInfo(res.data)).catch(() => toast.error(MSG.LOAD_FAIL)).finally(() => setLoading(false));
  }, [isAdmin, navigate]);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="系统信息" variant="flat" backOnClick={() => navigate(ROUTES.HOME)} />
      <div className="page-container">
        <div className="card">
          {info && Object.entries(info).map(([key, value]) => (
            <div key={key} className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
              <span className="text-gray-500 dark:text-gray-400">{key}</span>
              <span className="font-medium text-gray-800 dark:text-white">{String(value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
