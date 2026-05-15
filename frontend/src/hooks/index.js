import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MSG, DEFAULTS } from '../constants/messages';

/**
 * 通用异步数据加载 Hook
 * @param {function} fetchFn - 返回 Promise 的数据获取函数
 * @param {Array} deps - 依赖数组
 * @param {string} errorMsg - 加载失败时的提示信息
 * @returns {{ data, loading, error, refresh, setData }}
 */
export function useAsyncData(fetchFn, deps = [], errorMsg = MSG.LOAD_FAIL) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRef.current();
      setData(result);
    } catch (err) {
      setError(err);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [errorMsg]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refresh, setData };
}

/**
 * 通用表单管理 Hook
 * @param {Object} options
 * @param {Object} options.initialValues
 * @param {function} options.onSubmit
 * @param {function} [options.validate]
 * @param {boolean} [options.isEdit]
 */
export function useForm({ initialValues, onSubmit, validate, isEdit = false }) {
  const [form, setForm] = useState(initialValues);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = useCallback((e) => {
    const target = e.target;
    const { name, value } = target;
    setForm(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');
    if (validate) {
      const msg = validate(form);
      if (msg) { setError(msg); return; }
    }
    setSubmitting(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.response?.data?.error || MSG.SAVE_FAIL);
    } finally {
      setSubmitting(false);
    }
  }, [form, onSubmit, validate]);

  return { form, error, submitting, handleChange, handleSubmit, setForm, setError };
}

/**
 * 删除确认 Hook
 */
export function useDeleteWithConfirm(deleteFn, confirmMsg, onSuccess) {
  const handleDelete = useCallback(async (id) => {
    if (!confirm(confirmMsg)) return;
    try {
      await deleteFn(id);
      toast.success(MSG.DELETE_SUCCESS);
      onSuccess?.();
    } catch {
      toast.error(MSG.DELETE_FAIL);
    }
  }, [deleteFn, confirmMsg, onSuccess]);

  return { handleDelete };
}

/**
 * 编辑实体加载 Hook
 */
export function useEditEntity(listFn, id, fallbackPath, mapFn, errorMsg = MSG.LOAD_DETAIL_FAIL) {
  const navigate = useNavigate();
  const [entity, setEntity] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!id) { setLoaded(true); return; }
    listFn().then(res => {
      const found = res.data.find(e => String(e.id) === String(id));
      if (found) {
        setEntity(mapFn(found));
      } else {
        toast.error(errorMsg);
        navigate(fallbackPath);
      }
      setLoaded(true);
    }).catch(() => {
      toast.error(errorMsg);
      navigate(fallbackPath);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return { entity, loaded };
}
