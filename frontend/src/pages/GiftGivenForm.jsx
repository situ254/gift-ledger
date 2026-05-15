import { useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { giftsGivenApi, reasonsApi, contactTypesApi, contactsApi } from '../api';
import { useForm, useEditEntity } from '../hooks';
import { LoadingSpinner, PageHeader, FormField } from '../components/UI';
import { ROUTES } from '../constants/routes';
import { MSG, DEFAULTS } from '../constants/messages';
import toast from 'react-hot-toast';

const INITIAL_FORM = {
  contact_name: '', contact_type_id: '', reason_id: '',
  gift_date: DEFAULTS.DATE_TODAY(), amount: '', notes: '',
};

export default function GiftGivenForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [reasons, setReasons] = useState([]);
  const [contactTypes, setContactTypes] = useState([]);
  const [contactNames, setContactNames] = useState([]);

  const loadDropdowns = useCallback(async () => {
    try {
      const [r, t, c] = await Promise.all([reasonsApi.list(), contactTypesApi.list(), contactsApi.list()]);
      setReasons(r.data);
      setContactTypes(t.data);
      setContactNames(c.data.map(x => x.name));
    } catch { /* silent - dropdowns are optional */ }
  }, []);

  const mapEntity = useCallback(g => ({
    contact_name: g.contact_name || '',
    contact_type_id: g.contact_type_id ? String(g.contact_type_id) : '',
    reason_id: g.reason_id ? String(g.reason_id) : '',
    gift_date: g.gift_date ? g.gift_date.slice(0, 10) : DEFAULTS.DATE_TODAY(),
    amount: g.amount || '',
    notes: g.notes || '',
  }), []);

  const { entity, loaded } = useEditEntity(giftsGivenApi.list, id, ROUTES.GIVEN.LIST, mapEntity);

  const { form, error, submitting, handleChange, handleSubmit, setForm } = useForm({
    initialValues: INITIAL_FORM,
    isEdit,
    validate: (f) => {
      if (!f.contact_name.trim()) return MSG.VALID_NAME_REQUIRED;
      if (!f.amount || Number(f.amount) <= 0) return MSG.VALID_AMOUNT_POSITIVE;
      if (!f.gift_date) return MSG.VALID_DATE_REQUIRED;
      return '';
    },
    onSubmit: async (f) => {
      const data = {
        contact_name: f.contact_name.trim(),
        contact_type_id: f.contact_type_id ? Number(f.contact_type_id) : null,
        reason_id: f.reason_id ? Number(f.reason_id) : null,
        amount: Number(f.amount),
        gift_date: f.gift_date,
        notes: f.notes,
      };
      if (isEdit) {
        await giftsGivenApi.update(id, data);
        toast.success(MSG.SAVE_SUCCESS);
      } else {
        await giftsGivenApi.create(data);
        toast.success(MSG.ADD_SUCCESS);
      }
      navigate(ROUTES.GIVEN.LIST);
    },
  });

  useEffect(() => { loadDropdowns(); }, [loadDropdowns]);
  useEffect(() => { if (entity) setForm(entity); }, [entity, setForm]);

  if (isEdit && !loaded) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title={isEdit ? '修改随礼' : '新增随礼'} variant="flat"
        backOnClick={() => navigate(ROUTES.GIVEN.LIST)} />
      <div className="page-container">
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="姓名">
              <input type="text" name="contact_name" value={form.contact_name} onChange={handleChange}
                className="input-field" placeholder="请输入姓名" list="contact-names-given" />
              <datalist id="contact-names-given">{contactNames.map(n => <option value={n} key={n} />)}</datalist>
            </FormField>
            <FormField label="关系">
              <select name="contact_type_id" value={form.contact_type_id} onChange={handleChange} className="select-field">
                <option value="">请选择</option>
                {contactTypes.map(t => <option value={String(t.id)} key={t.id}>{t.name}</option>)}
              </select>
            </FormField>
            <FormField label="事由">
              <select name="reason_id" value={form.reason_id} onChange={handleChange} className="select-field">
                <option value="">请选择</option>
                {reasons.map(r => <option value={String(r.id)} key={r.id}>{r.name}</option>)}
              </select>
            </FormField>
            <FormField label="日期">
              <input type="date" name="gift_date" value={form.gift_date} onChange={handleChange} className="input-field" />
            </FormField>
            <FormField label="金额">
              <input type="number" name="amount" value={form.amount} onChange={handleChange}
                className="input-field" placeholder="请输入金额" min="0.01" step="0.01" />
            </FormField>
            <FormField label="备注">
              <textarea name="notes" value={form.notes} onChange={handleChange} className="input-field" rows={3} placeholder="可选备注" />
            </FormField>
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
              {submitting ? '保存中...' : '保 存'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
