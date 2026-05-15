import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { giftBooksApi, reasonsApi } from '../api';
import { useForm } from '../hooks';
import { LoadingSpinner, PageHeader, FormField } from '../components/UI';
import { ROUTES } from '../constants/routes';
import { MSG, DEFAULTS } from '../constants/messages';
import toast from 'react-hot-toast';

export default function GiftBookForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [reasons, setReasons] = useState([]);

  const { form, error, submitting, handleChange, handleSubmit, setForm } = useForm({
    initialValues: { name: '', date: DEFAULTS.DATE_TODAY(), reason_id: '' },
    isEdit,
    validate: (f) => {
      if (!f.name.trim()) return MSG.VALID_BOOK_NAME_REQUIRED;
      if (!f.date) return MSG.VALID_DATE_REQUIRED;
      return '';
    },
    onSubmit: async (f) => {
      const data = { ...f, reason_id: f.reason_id ? Number(f.reason_id) : null };
      if (isEdit) { await giftBooksApi.update(id, data); toast.success(MSG.UPDATE_SUCCESS); }
      else { await giftBooksApi.create(data); toast.success(MSG.CREATE_SUCCESS); }
      navigate(ROUTES.GIFT_BOOKS.LIST);
    },
  });

  useEffect(() => {
    reasonsApi.list().then(res => setReasons(res.data)).catch(() => {});
    if (isEdit) {
      giftBooksApi.get(id).then(res => {
        setForm({ name: res.data.name || '', date: res.data.date?.slice(0, 10) || '', reason_id: res.data.reason_id ? String(res.data.reason_id) : '' });
      }).catch(() => { toast.error(MSG.LOAD_DETAIL_FAIL); navigate(ROUTES.GIFT_BOOKS.LIST); });
    }
  }, [id, isEdit, navigate, setForm]);

  return (
    <div>
      <PageHeader title={isEdit ? '编辑礼簿' : '新增礼簿'} variant="flat"
        backOnClick={() => navigate(ROUTES.GIFT_BOOKS.LIST)} />
      <div className="page-container">
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="礼簿名称 *"><input type="text" name="name" value={form.name} onChange={handleChange} className="input-field" placeholder="如：张三婚礼" /></FormField>
            <FormField label="日期 *"><input type="date" name="date" value={form.date} onChange={handleChange} className="input-field" /></FormField>
            <FormField label="事由">
              <select name="reason_id" value={form.reason_id} onChange={handleChange} className="select-field">
                <option value="">请选择事由</option>
                {reasons.map(r => <option value={String(r.id)} key={r.id}>{r.name}</option>)}
              </select>
            </FormField>
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <button type="submit" disabled={submitting} className="btn-primary w-full py-3">{submitting ? '保存中...' : isEdit ? '更新' : '创建礼簿'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
