import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { giftsReceivedApi, contactTypesApi, giftBooksApi, contactsApi } from '../api';
import { useForm, useEditEntity } from '../hooks';
import { LoadingSpinner, PageHeader, FormField } from '../components/UI';
import { ROUTES } from '../constants/routes';
import { MSG, DEFAULTS } from '../constants/messages';
import toast from 'react-hot-toast';

const INITIAL_FORM = {
  contact_name: '', contact_type_id: '', amount: '', gift_book_id: '', notes: '',
};

export default function GiftReceivedForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [contactTypes, setContactTypes] = useState([]);
  const [giftBooks, setGiftBooks] = useState([]);
  const [contactNames, setContactNames] = useState([]);

  const loadDropdowns = useCallback(async () => {
    try {
      const [t, b, c] = await Promise.all([contactTypesApi.list(), giftBooksApi.list(), contactsApi.list()]);
      setContactTypes(t.data);
      setGiftBooks(b.data);
      setContactNames(c.data.map(x => x.name));
    } catch { /* silent */ }
  }, []);

  const mapEntity = useCallback(g => ({
    contact_name: g.contact_name || '',
    contact_type_id: g.contact_type_id ? String(g.contact_type_id) : '',
    amount: g.amount || '',
    gift_book_id: g.gift_book_id ? String(g.gift_book_id) : '',
    notes: g.notes || '',
  }), []);

  const { entity, loaded } = useEditEntity(giftsReceivedApi.list, id, ROUTES.RECEIVED.LIST, mapEntity);

  const { form, error, submitting, handleChange, handleSubmit, setForm } = useForm({
    initialValues: INITIAL_FORM,
    isEdit,
    validate: (f) => {
      if (!f.contact_name.trim()) return MSG.VALID_NAME_REQUIRED;
      if (!f.amount || Number(f.amount) <= 0) return MSG.VALID_AMOUNT_POSITIVE;
      if (!f.gift_book_id) return MSG.VALID_GIFT_BOOK_REQUIRED;
      return '';
    },
    onSubmit: async (f) => {
      const data = {
        contact_name: f.contact_name.trim(),
        contact_type_id: f.contact_type_id ? Number(f.contact_type_id) : null,
        gift_book_id: Number(f.gift_book_id),
        amount: Number(f.amount),
        notes: f.notes,
      };
      if (isEdit) {
        await giftsReceivedApi.update(id, data);
        toast.success(MSG.SAVE_SUCCESS);
      } else {
        await giftsReceivedApi.create(data);
        toast.success(MSG.ADD_SUCCESS);
      }
      navigate(ROUTES.RECEIVED.LIST);
    },
  });

  useEffect(() => { loadDropdowns(); }, [loadDropdowns]);
  useEffect(() => { if (entity) setForm(entity); }, [entity, setForm]);

  if (isEdit && !loaded) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title={isEdit ? '修改收礼' : '新增收礼'} variant="flat"
        backOnClick={() => navigate(ROUTES.RECEIVED.LIST)} />
      <div className="page-container">
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="姓名">
              <input type="text" name="contact_name" value={form.contact_name} onChange={handleChange}
                className="input-field" placeholder="请输入姓名" list="contact-names" />
              <datalist id="contact-names">{contactNames.map(n => <option value={n} key={n} />)}</datalist>
            </FormField>
            <FormField label="关系">
              <select name="contact_type_id" value={form.contact_type_id} onChange={handleChange} className="select-field">
                <option value="">请选择</option>
                {contactTypes.map(t => <option value={String(t.id)} key={t.id}>{t.name}</option>)}
              </select>
            </FormField>
            <FormField label="金额">
              <input type="number" name="amount" value={form.amount} onChange={handleChange}
                className="input-field" placeholder="请输入金额" min="0.01" step="0.01" />
            </FormField>
            <FormField label="所属礼簿">
              <select name="gift_book_id" value={form.gift_book_id} onChange={handleChange} className="select-field">
                <option value="">请选择礼簿</option>
                {giftBooks.map(b => <option value={String(b.id)} key={b.id}>{b.name} ({b.date?.slice(0, 10)})</option>)}
              </select>
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
