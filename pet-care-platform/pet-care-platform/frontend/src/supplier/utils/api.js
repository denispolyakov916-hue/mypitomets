import axios from 'axios';

const supplierApi = axios.create({
  baseURL: '/api/',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

supplierApi.interceptors.request.use((config) => {
  const accessJwt = localStorage.getItem('access_token');
  if (accessJwt) {
    config.headers.Authorization = `Bearer ${accessJwt}`;
  }
  return config;
});

export const supplierAPI = {
  profile: {
    me: () => supplierApi.get('supplier/profile/me/'),
    suppliers: () => supplierApi.get('supplier/profile/suppliers/'),
  },
  dashboard: {
    summary: (params) => supplierApi.get('supplier/dashboard/summary/', { params }),
    salesTrend: (params) => supplierApi.get('supplier/dashboard/sales-trend/', { params }),
    topProducts: (params) => supplierApi.get('supplier/dashboard/top-products/', { params }),
    returns: (params) => supplierApi.get('supplier/dashboard/returns/', { params }),
    export: (params) => supplierApi.get('supplier/dashboard/export/', { params, responseType: 'blob' }),
  },
  products: {
    list: (params) => supplierApi.get('supplier/products/', { params }),
    create: (data) => supplierApi.post('supplier/products/', data),
    retrieve: (id) => supplierApi.get(`supplier/products/${id}/`),
    update: (id, data) => supplierApi.patch(`supplier/products/${id}/`, data),
    validate: (id) => supplierApi.post(`supplier/products/${id}/validate/`),
    submit: (id) => supplierApi.post(`supplier/products/${id}/submit/`),
    archive: (id) => supplierApi.post(`supplier/products/${id}/archive/`),
  },
  orders: {
    list: (params) => supplierApi.get('supplier/orders/', { params }),
  },
  returns: {
    list: (params) => supplierApi.get('supplier/returns/', { params }),
  },
  imports: {
    list: (params) => supplierApi.get('supplier/imports/', { params }),
  },
};

export default supplierApi;
