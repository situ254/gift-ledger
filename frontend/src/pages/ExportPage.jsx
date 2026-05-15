import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataApi } from '../api';
import { downloadBlob } from '../utils/helpers';
import { PageHeader } from '../components/UI';
import { ROUTES } from '../constants/routes';
import { MSG } from '../constants/messages';
import toast from 'react-hot-toast';

export default function ExportPage() {
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const res = await dataApi.exportFile();
      const date = new Date().toISOString().slice(0, 10);
      downloadBlob(res.data, `人情记账_${date}.xlsx`);
      toast.success(MSG.EXPORT_SUCCESS);
    } catch { toast.error(MSG.EXPORT_FAIL); }
    finally { setExporting(false); }
  }, []);

  return (
    <div>
      <PageHeader title="数据导出" variant="flat" backOnClick={() => navigate(ROUTES.PROFILE)} />
      <div className="page-container">
        <div className="card">
          <p className="text-gray-600 dark:text-gray-400 mb-4">将所有数据导出为Excel文件</p>
          <button onClick={handleExport} disabled={exporting} className="btn-primary w-full py-3">{exporting ? '导出中...' : '导出数据'}</button>
        </div>
      </div>
    </div>
  );
}
