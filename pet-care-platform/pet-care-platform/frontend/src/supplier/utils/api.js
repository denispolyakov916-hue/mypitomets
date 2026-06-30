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
  products: {
    list: (params) => supplierApi.get('supplier/products/', { params }),
    create: (data) => supplierApi.post('supplier/products/', data),
    retrieve: (id) => supplierApi.get(`supplier/products/${id}/`),
    update: (id, data) => supplierApi.patch(`supplier/products/${id}/`, data),
    validate: (id) => supplierApi.post(`supplier/products/${id}/validate/`),
    submit: (id) => supplierApi.post(`supplier/products/${id}/submit/`),
    archive: (id) => supplierApi.post(`supplier/products/${id}/archive/`),
  },
};

export default supplierApi;
