/** 路由常量 - 集中管理所有路由路径 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',

  GIVEN: {
    LIST: '/given',
    NEW: '/given/new',
    EDIT: (id) => `/given/${id}/edit`,
    YEAR: (year) => `/given/year/${year}`,
  },

  RECEIVED: {
    LIST: '/received',
    NEW: '/received/new',
    EDIT: (id) => `/received/${id}/edit`,
    YEAR: (year) => `/received/year/${year}`,
  },

  CONTACTS: {
    LIST: '/contacts',
    NEW: '/contacts/new',
    EDIT: (id) => `/contacts/${id}/edit`,
    DETAIL: (name) => `/contacts/${encodeURIComponent(name)}`,
  },

  GIFT_BOOKS: {
    LIST: '/gift-books',
    NEW: '/gift-books/new',
    EDIT: (id) => `/gift-books/${id}/edit`,
    DETAIL: (id) => `/gift-books/${id}`,
  },

  REASONS: {
    LIST: '/reasons',
    NEW: '/reasons/new',
    EDIT: (id) => `/reasons/${id}/edit`,
  },

  CONTACT_TYPES: {
    LIST: '/contact-types',
    NEW: '/contact-types/new',
    EDIT: (id) => `/contact-types/${id}/edit`,
  },

  QUERY: '/query',
  PROFILE: '/profile',
  IMPORT: '/import',
  EXPORT: '/export',
  BACKUP: '/backup',

  ADMIN: {
    LOGIN: '/admin/login',
    USERS: '/admin/users',
    SYSTEM: '/admin/system',
  },
};
