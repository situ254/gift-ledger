import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(res => res, err => {
  // 只有「未登录 / 登录过期」（401）才清除登录态并回登录页。
  // 超时、断网、5xx 等都不应该把用户踢出去，否则会出现
  // 「刚登录成功，一次网络抖动就被弹回登录页」的现象。
  if (err.response?.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    const { pathname, search } = window.location;
    const onAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
    if (!onAuthPage) {
      // 记住来路，登录后原路返回，避免登录成功却停在登录页
      const redirect = encodeURIComponent(pathname + (search || ''));
      window.location.replace(`/login?redirect=${redirect}`);
    }
  }
  return Promise.reject(err);
});

export const authApi = {
  login: data => api.post('/auth/login', data),
  register: data => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me')
};

export const reasonsApi = {
  list: () => api.get('/reasons'),
  create: data => api.post('/reasons', data),
  update: (id, data) => api.put(`/reasons/${id}`, data),
  delete: id => api.delete(`/reasons/${id}`)
};

export const contactTypesApi = {
  list: () => api.get('/contact-types'),
  create: data => api.post('/contact-types', data),
  update: (id, data) => api.put(`/contact-types/${id}`, data),
  delete: id => api.delete(`/contact-types/${id}`)
};

export const contactsApi = {
  list: () => api.get('/contacts'),
  getDetail: name => api.get(`/contacts/${encodeURIComponent(name)}/detail`),
  create: data => api.post('/contacts', data),
  update: (id, data) => api.put(`/contacts/${id}`, data),
  delete: id => api.delete(`/contacts/${id}`)
};

export const giftBooksApi = {
  list: () => api.get('/gift-books'),
  get: id => api.get(`/gift-books/${id}`),
  create: data => api.post('/gift-books', data),
  update: (id, data) => api.put(`/gift-books/${id}`, data),
  delete: (id, params) => api.delete(`/gift-books/${id}`, { params })
};

export const giftsReceivedApi = {
  list: params => api.get('/gifts-received', { params }),
  create: data => api.post('/gifts-received', data),
  update: (id, data) => api.put(`/gifts-received/${id}`, data),
  delete: id => api.delete(`/gifts-received/${id}`),
  deleteAll: () => api.delete('/gifts-received')
};

export const giftsGivenApi = {
  list: params => api.get('/gifts-given', { params }),
  create: data => api.post('/gifts-given', data),
  update: (id, data) => api.put(`/gifts-given/${id}`, data),
  delete: id => api.delete(`/gifts-given/${id}`),
  deleteAll: () => api.delete('/gifts-given')
};

export const statsApi = {
  summary: params => api.get('/stats/summary', { params }),
  query: params => api.get('/stats/query', { params })
};

export const dataApi = {
  importFile: formData => api.post('/data/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  exportFile: params => api.get('/data/export', { params, responseType: 'blob' }),
  exportText: params => api.get('/data/export-text', { params, responseType: 'blob' }),
  downloadTemplate: () => api.get('/data/template', { responseType: 'blob' })
};

export const backupApi = {
  cloudStatus: () => api.get('/backup/cloud/status'),
  cloudBackup: () => api.post('/backup/cloud/backup'),
  cloudRestore: () => api.post('/backup/cloud/restore'),
  deleteCloudBackup: id => api.delete(`/backup/cloud/${id}`),
  localBackup: () => api.get('/backup/local', { responseType: 'blob' }),
  localRestore: formData => api.post('/backup/local', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getWebdavConfig: () => api.get('/backup/webdav/config'),
  saveWebdavConfig: data => api.post('/backup/webdav/config', data),
  testWebdav: data => api.post('/backup/webdav/test', data),
  webdavBackup: () => api.post('/backup/webdav/backup'),
  webdavRestore: () => api.post('/backup/webdav/restore')
};

export const adminApi = {
  listUsers: () => api.get('/admin'),
  createUser: data => api.post('/admin', data),
  updateUserRole: (id, role) => api.put(`/admin/${id}/role`, { role }),
  deleteUser: id => api.delete(`/admin/${id}`),
  systemInfo: () => api.get('/admin/system')
};

export default api;
