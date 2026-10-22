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
  const [exporting, setExporting] = useState('');
  const today = new Date().toISOString().slice(0, 10);

  const handleExportExcel = useCallback(async () => {
    setExporting('excel');
    try {
      const res = await dataApi.exportFile();
      downloadBlob(res.data, `人情笔记_${today}.xlsx`);
      toast.success(MSG.EXPORT_SUCCESS);
    } catch { toast.error(MSG.EXPORT_FAIL); }
    finally { setExporting(''); }
  }, [today]);

  const handleExportText = useCallback(async () => {
    setExporting('text');
    try {
      const res = await dataApi.exportText();
      downloadBlob(res.data, `人情笔记_${today}.txt`);
      toast.success(MSG.EXPORT_SUCCESS);
    } catch { toast.error(MSG.EXPORT_FAIL); }
    finally { setExporting(''); }
  }, [today]);

  return (
    <div>
      <PageHeader title="数据导出" variant="flat" backOnClick={() => navigate(ROUTES.PROFILE)} />
      <div className="page-container space-y-3">
        <div className="card">
          <p className="text-gray-700 font-medium mb-1">导出为 Excel</p>
          <p className="text-xs text-gray-400 mb-3">含收礼 / 随礼两个工作表，日期列附带对应农历</p>
          <button onClick={handleExportExcel} disabled={!!exporting} className="btn-primary w-full py-3">
            {exporting === 'excel' ? '导出中...' : '导出 Excel'}
          </button>
        </div>

        <div className="card">
          <p className="text-gray-700 font-medium mb-1">导出为文本</p>
          <p className="text-xs text-gray-400 mb-3">
            纯文本（.txt），每条记录一行；日期统一为「公历（农历YYYY干支生肖年X月XX）」，适合打印或转发
          </p>
          <button onClick={handleExportText} disabled={!!exporting}
            className="w-full py-3 rounded-xl border border-primary-500 text-primary-500 font-medium active:scale-[0.98] transition-transform disabled:opacity-50">
            {exporting === 'text' ? '导出中...' : '导出文本'}
          </button>
        </div>
      </div>
    </div>
  );
}
