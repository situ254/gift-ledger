import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { contactsApi, contactTypesApi } from '../api';
import { useForm, useEditEntity } from '../hooks';
import { LoadingSpinner, PageHeader, FormField } from '../components/UI';
import { ROUTES } from '../constants/routes';
import { MSG } from '../constants/messages';
import toast from 'react-hot-toast';

export default function ContactForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [contactTypes, setContactTypes] = useState([]);
  const [contactNames, setContactNames] = useState([]);

  const loadDropdowns = useCallback(async () => {
    try {
      const [t, c] = await Promise.all([contactTypesApi.list(), contactsApi.list()]);
      setContactTypes(t.data);
      setContactNames(c.data.map(x => x.name));
    } catch { /* silent */ }
  }, []);

  const mapEntity = useCallback(c => ({
    name: c.name || '', contact_type_id: c.contact_type_id ? String(c.contact_type_id) : '', notes: c.notes || '',
  }), []);

  const { entity, loaded } = useEditEntity(contactsApi.list, id, ROUTES.CONTACTS.LIST, mapEntity);

  const { form, error, submitting, handleChange, handleSubmit, setForm } = useForm({
    initialValues: { name: '', contact_type_id: '', notes: '' },
    isEdit,
    validate: (f) => { if (!f.name.trim()) return MSG.VALID_NAME_REQUIRED; return ''; },
    onSubmit: async (f) => {
      const data = { name: f.name.trim(), contact_type_id: f.contact_type_id ? Number(f.contact_type_id) : null, notes: f.notes };
      if (isEdit) { await contactsApi.update(id, data); toast.success(MSG.SAVE_SUCCESS); }
      else { await contactsApi.create(data); toast.success(MSG.ADD_SUCCESS); }
      navigate(ROUTES.CONTACTS.LIST);
    },
  });

  useEffect(() => { loadDropdowns(); }, [loadDropdowns]);
  useEffect(() => { if (entity) setForm(entity); }, [entity, setForm]);

  if (isEdit && !loaded) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title={isEdit ? '编辑亲友' : '新增亲友'} variant="flat"
        backOnClick={() => navigate(ROUTES.CONTACTS.LIST)} />
      <div className="page-container">
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="姓名"><input type="text" name="name" value={form.name} onChange={handleChange} className="input-field" placeholder="请输入姓名" /></FormField>
            <FormField label="亲友类型">
              <select name="contact_type_id" value={form.contact_type_id} onChange={handleChange} className="select-field">
                <option value="">请选择</option>
                {contactTypes.map(t => <option value={String(t.id)} key={t.id}>{t.name}</option>)}
              </select>
            </FormField>
            <FormField label="备注"><textarea name="notes" value={form.notes} onChange={handleChange} className="input-field" rows={3} placeholder="可选备注" /></FormField>
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <button type="submit" disabled={submitting} className="btn-primary w-full py-3">{submitting ? '保存中...' : '保 存'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
