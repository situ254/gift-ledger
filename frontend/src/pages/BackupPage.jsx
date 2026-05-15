import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { backupApi } from '../api';
import { PageHeader, FormField } from '../components/UI';
import { ROUTES } from '../constants/routes';
import { MSG } from '../constants/messages';
import toast from 'react-hot-toast';

export default function BackupPage() {
  const navigate = useNavigate();
  const [webdavConfig, setWebdavConfig] = useState({ url: '', username: '', password: '' });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    backupApi.getWebdavConfig().then(res => {
      if (res.data) setWebdavConfig({ url: res.data.url || '', username: res.data.username || '', password: res.data.password || '' });
    }).catch(() => {});
  }, []);

  const handleTestWebdav = useCallback(async () => {
    setTesting(true);
    try { await backupApi.testWebdav(webdavConfig); toast.success(MSG.WEBDAV_TEST_SUCCESS); }
    catch { toast.error(MSG.WEBDAV_TEST_FAIL); }
    finally { setTesting(false); }
  }, [webdavConfig]);

  const handleSaveWebdav = useCallback(async () => {
    setSaving(true);
    try { await backupApi.saveWebdavConfig(webdavConfig); toast.success(MSG.WEBDAV_SAVE_SUCCESS); }
    catch { toast.error(MSG.WEBDAV_SAVE_FAIL); }
    finally { setSaving(false); }
  }, [webdavConfig]);

  const handleLocalBackup = useCallback(async () => {
    try {
      const res = await backupApi.localBackup();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(MSG.BACKUP_SUCCESS);
    } catch { toast.error(MSG.BACKUP_FAIL); }
  }, []);

  const handleLocalRestore = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      await backupApi.localRestore(formData);
      toast.success(MSG.RESTORE_SUCCESS);
    } catch { toast.error(MSG.RESTORE_FAIL); }
  }, []);

  const handleCloudBackup = useCallback(async () => {
    try { await backupApi.cloudBackup(); toast.success(MSG.CLOUD_BACKUP_SUCCESS); }
    catch { toast.error(MSG.CLOUD_BACKUP_FAIL); }
  }, []);

  const handleCloudRestore = useCallback(async () => {
    if (!confirm(MSG.CONFIRM_CLOUD_RESTORE)) return;
    try { await backupApi.cloudRestore(); toast.success(MSG.CLOUD_RESTORE_SUCCESS); }
    catch { toast.error(MSG.CLOUD_RESTORE_FAIL); }
  }, []);

  const handleWebdavBackup = useCallback(async () => {
    try { await backupApi.webdavBackup(); toast.success(MSG.WEBDAV_BACKUP_SUCCESS); }
    catch { toast.error(MSG.WEBDAV_BACKUP_FAIL); }
  }, []);

  const handleWebdavRestore = useCallback(async () => {
    if (!confirm(MSG.CONFIRM_WEBDAV_RESTORE)) return;
    try { await backupApi.webdavRestore(); toast.success(MSG.WEBDAV_RESTORE_SUCCESS); }
    catch { toast.error(MSG.WEBDAV_RESTORE_FAIL); }
  }, []);

  return (
    <div>
      <PageHeader title="云端备份" variant="flat" backOnClick={() => navigate(ROUTES.PROFILE)} />
      <div className="page-container space-y-4">
        <div className="card space-y-3">
          <h3 className="font-bold text-gray-700 dark:text-gray-200">WebDAV 配置</h3>
          <FormField label="URL"><input type="text" value={webdavConfig.url} onChange={e => setWebdavConfig(c => ({ ...c, url: e.target.value }))} className="input-field" placeholder="https://dav.example.com/path" /></FormField>
          <FormField label="用户名"><input type="text" value={webdavConfig.username} onChange={e => setWebdavConfig(c => ({ ...c, username: e.target.value }))} className="input-field" /></FormField>
          <FormField label="密码"><input type="password" value={webdavConfig.password} onChange={e => setWebdavConfig(c => ({ ...c, password: e.target.value }))} className="input-field" /></FormField>
          <div className="flex gap-2">
            <button onClick={handleTestWebdav} disabled={testing} className="btn-outline flex-1 py-2">{testing ? '测试中...' : '测试连接'}</button>
            <button onClick={handleSaveWebdav} disabled={saving} className="btn-primary flex-1 py-2">{saving ? '保存中...' : '保存配置'}</button>
          </div>
          <div className="flex gap-2">
            <button onClick={handleWebdavBackup} className="btn-outline flex-1 py-2">WebDAV备份</button>
            <button onClick={handleWebdavRestore} className="btn-outline flex-1 py-2">WebDAV恢复</button>
          </div>
        </div>
        <div className="card space-y-3">
          <h3 className="font-bold text-gray-700 dark:text-gray-200">本地备份</h3>
          <button onClick={handleLocalBackup} className="btn-primary w-full py-2">下载备份文件</button>
          <div>
            <input type="file" accept=".json" onChange={handleLocalRestore} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 mb-2" />
            <button onClick={() => {}} className="btn-outline w-full py-2">从备份文件恢复</button>
          </div>
        </div>
        <div className="card space-y-3">
          <h3 className="font-bold text-gray-700 dark:text-gray-200">服务器云端</h3>
          <div className="flex gap-2">
            <button onClick={handleCloudBackup} className="btn-primary flex-1 py-2">云端备份</button>
            <button onClick={handleCloudRestore} className="btn-outline flex-1 py-2">云端恢复</button>
          </div>
        </div>
      </div>
    </div>
  );
}
