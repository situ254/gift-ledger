import { useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { reasonsApi } from '../api';
import { useForm, useEditEntity } from '../hooks';
import { LoadingSpinner, PageHeader, FormField } from '../components/UI';
import { ROUTES } from '../constants/routes';
import { MSG } from '../constants/messages';
import toast from 'react-hot-toast';

export default function ReasonForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const mapEntity = useCallback(r => ({ name: r.name || '' }), []);

  const { entity, loaded } = useEditEntity(reasonsApi.list, id, ROUTES.REASONS.LIST, mapEntity);

  const { form, error, submitting, handleChange, handleSubmit, setForm } = useForm({
    initialValues: { name: '' },
    isEdit,
    validate: (f) => { if (!f.name.trim()) return MSG.VALID_NAME_REQUIRED_SHORT; return ''; },
    onSubmit: async (f) => {
      if (isEdit) { await reasonsApi.update(id, { name: f.name.trim() }); toast.success(MSG.UPDATE_SUCCESS); }
      else { await reasonsApi.create({ name: f.name.trim() }); toast.success(MSG.CREATE_SUCCESS); }
      navigate(ROUTES.REASONS.LIST);
    },
  });

  useEffect(() => { if (entity) setForm(entity); }, [entity, setForm]);

  if (isEdit && !loaded) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title={isEdit ? '编辑事由' : '新增事由'} variant="flat" backOnClick={() => navigate(ROUTES.REASONS.LIST)} />
      <div className="page-container">
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="名称"><input type="text" value={form.name} onChange={handleChange} className="input-field" placeholder="请输入事由名称" name="name" /></FormField>
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <button type="submit" disabled={submitting} className="btn-primary w-full py-3">{submitting ? '保存中...' : '保 存'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
