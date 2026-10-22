import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { giftsReceivedApi, contactTypesApi, giftBooksApi, contactsApi } from '../api';
import { useForm, useEditEntity } from '../hooks';
import { LoadingSpinner, PageHeader, FormField } from '../components/UI';
import { formatDateWithLunar } from '../utils/helpers';
import { ROUTES } from '../constants/routes';
import { MSG } from '../constants/messages';
import toast from 'react-hot-toast';

const DELETE_CONFIRM_MSG = '确定删除这条记录吗？删除后不可恢复。';
const DELETE_FAIL_MSG = '删除失败，请重试';

const EMPTY_FORM = {
  contact_name: '', contact_type_id: '', amount: '', gift_book_id: '', guests: '', notes: '',
};

export default function GiftReceivedForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  // 支持从礼簿页「记一笔收礼」带过来预选礼簿
  const presetBookId = searchParams.get('gift_book_id') || '';
  const [deleting, setDeleting] = useState(false);

  const [contactTypes, setContactTypes] = useState([]);
  const [giftBooks, setGiftBooks] = useState([]);
  const [contactNames, setContactNames] = useState([]);
  // 姓名 → 该亲友已设置的关系 id（用于选中已有姓名时自动带出关系）
  const [contactTypeByName, setContactTypeByName] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [t, b, c] = await Promise.all([contactTypesApi.list(), giftBooksApi.list(), contactsApi.list()]);
        if (!cancelled) {
          setContactTypes(t.data);
          setGiftBooks(b.data);
          const byName = {};
          c.data.forEach(x => { byName[x.name] = x.type_id ? String(x.type_id) : ''; });
          setContactTypeByName(byName);
          setContactNames(c.data.map(x => x.name));
        }
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const mapEntity = useCallback(g => ({
    contact_name: g.contact_name || '',
    contact_type_id: g.contact_type_id ? String(g.contact_type_id) : '',
    amount: g.amount || '',
    gift_book_id: g.gift_book_id ? String(g.gift_book_id) : '',
    guests: g.guests || '',
    notes: g.notes || '',
  }), []);

  const { entity, loaded } = useEditEntity(giftsReceivedApi.list, id, ROUTES.RECEIVED.LIST, mapEntity);

  const { form, error, submitting, handleChange, handleSubmit, setForm } = useForm({
    initialValues: { ...EMPTY_FORM, gift_book_id: presetBookId },
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
        guests: f.guests ? Number(f.guests) : 0,
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

  const handleDelete = useCallback(async () => {
    if (!window.confirm(DELETE_CONFIRM_MSG)) return;
    setDeleting(true);
    try {
      await giftsReceivedApi.delete(id);
      toast.success(MSG.DELETE_SUCCESS);
      const contactName = form.contact_name?.trim();
      if (contactName) {
        navigate(ROUTES.CONTACTS.DETAIL(contactName));
      } else {
        navigate(ROUTES.RECEIVED.LIST);
      }
    } catch {
      toast.error(DELETE_FAIL_MSG);
      setDeleting(false);
    }
  }, [id, form.contact_name, navigate]);

  useEffect(() => { if (entity) setForm(entity); }, [entity, setForm]);

  // 输入的姓名与亲友录已有记录匹配时，自动带出其关系；
  // 仅当「关系」为空或仍等于上一位亲友自动带出的值时自动更新，手动选择的不覆盖
  const prevNameRef = useRef('');
  useEffect(() => {
    const oldName = prevNameRef.current;
    const newName = form.contact_name;
    prevNameRef.current = newName;
    if (oldName === newName) return;
    const oldTypeId = contactTypeByName[oldName.trim()] || '';
    const newTypeId = contactTypeByName[newName.trim()] || '';
    setForm(prev => {
      const keepManual = prev.contact_type_id && prev.contact_type_id !== oldTypeId;
      return { ...prev, contact_type_id: keepManual ? prev.contact_type_id : newTypeId };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.contact_name]);

  if (isEdit && !loaded) return <LoadingSpinner />;

  const selectedBook = giftBooks.find(b => String(b.id) === String(form.gift_book_id));

  return (
    <div>
      <PageHeader title={isEdit ? '修改收礼' : '新增收礼'} variant="flat"
        backOnClick={() => navigate(ROUTES.RECEIVED.LIST)}>
        {isEdit && (
          <button onClick={handleDelete} disabled={deleting}
            className="text-red-500 text-sm font-medium px-3 py-1 border border-red-500 rounded-lg active:scale-95 transition-[transform] duration-150 ease-snap disabled:opacity-50">
            {deleting ? '删除中...' : '删除'}
          </button>
        )}
      </PageHeader>
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
            <FormField label="礼簿">
              <select name="gift_book_id" value={form.gift_book_id} onChange={handleChange} className="select-field">
                <option value="">请选择礼簿</option>
                {giftBooks.map(b => <option value={String(b.id)} key={b.id}>{b.name} ({b.date?.slice(0, 10)})</option>)}
              </select>
            </FormField>
            <FormField label="日期">
              {/* 收礼的日期取自所属礼簿，这里只做展示，避免改了日期却不生效 */}
              <div className="input-field bg-gray-50 text-gray-600 select-none !text-sm">
                {selectedBook
                  ? `${formatDateWithLunar(selectedBook.date)}（取所属礼簿日期）`
                  : '选择礼簿后自动带出'}
              </div>
            </FormField>
            <FormField label="金额">
              <input type="number" name="amount" value={form.amount} onChange={handleChange}
                className="input-field" placeholder="请输入金额" min="0.01" step="0.01" />
            </FormField>
            <FormField label="参宴人数">
              <input type="number" name="guests" value={form.guests} onChange={handleChange}
                className="input-field" placeholder="请输入参宴人数" min="0" step="1" />
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
