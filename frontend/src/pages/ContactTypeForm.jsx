import { useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { contactTypesApi } from '../api';
import { useForm, useEditEntity } from '../hooks';
import { LoadingSpinner, PageHeader, FormField } from '../components/UI';
import { ROUTES } from '../constants/routes';
import { MSG } from '../constants/messages';
import toast from 'react-hot-toast';

export default function ContactTypeForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const mapEntity = useCallback(t => ({ name: t.name || '' }), []);

  const { entity, loaded } = useEditEntity(contactTypesApi.list, id, ROUTES.CONTACT_TYPES.LIST, mapEntity);

  const { form, error, submitting, handleChange, handleSubmit, setForm } = useForm({
    initialValues: { name: '' },
    isEdit,
    validate: (f) => { if (!f.name.trim()) return MSG.VALID_NAME_REQUIRED_SHORT; return ''; },
    onSubmit: async (f) => {
      if (isEdit) { await contactTypesApi.update(id, { name: f.name.trim() }); toast.success(MSG.UPDATE_SUCCESS); }
      else { await contactTypesApi.create({ name: f.name.trim() }); toast.success(MSG.CREATE_SUCCESS); }
      navigate(ROUTES.CONTACT_TYPES.LIST);
    },
  });

  useEffect(() => { if (entity) setForm(entity); }, [entity, setForm]);

  if (isEdit && !loaded) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title={isEdit ? '编辑类型' : '新增类型'} variant="flat" backOnClick={() => navigate(ROUTES.CONTACT_TYPES.LIST)} />
      <div className="page-container">
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="名称"><input type="text" value={form.name} onChange={handleChange} className="input-field" placeholder="请输入类型名称" name="name" /></FormField>
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <button type="submit" disabled={submitting} className="btn-primary w-full py-3">{submitting ? '保存中...' : '保 存'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
