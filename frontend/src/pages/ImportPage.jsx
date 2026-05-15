import { useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataApi } from '../api';
import { downloadBlob } from '../utils/helpers';
import { PageHeader, FormField } from '../components/UI';
import { ROUTES } from '../constants/routes';
import { MSG } from '../constants/messages';
import toast from 'react-hot-toast';

export default function ImportPage() {
  const navigate = useNavigate();
  const fileRef = useRef();
  const [importing, setImporting] = useState(false);

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const res = await dataApi.downloadTemplate();
      downloadBlob(res.data, '导入模板.xlsx');
    } catch { toast.error(MSG.TEMPLATE_FAIL); }
  }, []);

  const handleImport = useCallback(async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files[0];
    if (!file) { toast.error(MSG.VALID_FILE_REQUIRED); return; }
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await dataApi.importFile(formData);
      toast.success(MSG.IMPORT_SUCCESS);
      navigate(ROUTES.HOME);
    } catch (err) { toast.error(err.response?.data?.error || MSG.IMPORT_FAIL); }
    finally { setImporting(false); }
  }, [navigate]);

  return (
    <div>
      <PageHeader title="数据导入" variant="flat" backOnClick={() => navigate(ROUTES.PROFILE)} />
      <div className="page-container">
        <div className="card space-y-4">
          <button onClick={handleDownloadTemplate} className="btn-outline w-full py-3">下载导入模板</button>
          <form onSubmit={handleImport}>
            <input type="file" ref={fileRef} accept=".xlsx,.xls" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 mb-4" />
            <button type="submit" disabled={importing} className="btn-primary w-full py-3">{importing ? '导入中...' : '导入数据'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
