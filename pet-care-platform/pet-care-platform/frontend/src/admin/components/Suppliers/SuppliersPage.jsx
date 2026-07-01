import React, { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { adminAPI } from '../../utils/api';

const initialSupplierForm = {
  code: 'dinozavrik',
  name: 'Динозаврик',
  supplier_type: 'feed',
  website_url: '',
  payment_model: 'partner_checkout',
  settlement_model: 'agent_commission',
  is_active: true,
};

const initialAccessForm = {
  user: '',
  supplier: '',
  role: 'manager',
  can_edit_catalog: true,
  can_view_finance: true,
  can_export_reports: true,
  is_active: true,
};

const inputClass = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500';

const Field = ({ label, children }) => (
  <label className="block">
    <span className="text-sm font-medium text-gray-700">{label}</span>
    <div className="mt-1">{children}</div>
  </label>
);

const boolText = (value) => value ? 'да' : 'нет';

const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [accesses, setAccesses] = useState([]);
  const [users, setUsers] = useState([]);
  const [supplierForm, setSupplierForm] = useState(initialSupplierForm);
  const [accessForm, setAccessForm] = useState(initialAccessForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [suppliersRes, accessesRes, usersRes] = await Promise.all([
        adminAPI.suppliers.list({ page_size: 100 }),
        adminAPI.supplierUsers.list({ page_size: 100 }),
        adminAPI.users.list({ page_size: 100 }),
      ]);
      const nextSuppliers = suppliersRes.data.results || [];
      const nextUsers = usersRes.data.results || [];
      setSuppliers(nextSuppliers);
      setAccesses(accessesRes.data.results || []);
      setUsers(nextUsers);
      setAccessForm(prev => ({
        ...prev,
        supplier: prev.supplier || nextSuppliers[0]?.id || '',
        user: prev.user || nextUsers[0]?.id || '',
      }));
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось загрузить поставщиков');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const usersById = useMemo(() => {
    return users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});
  }, [users]);

  const createSupplier = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await adminAPI.suppliers.create(supplierForm);
      setSupplierForm(initialSupplierForm);
      setAccessForm(prev => ({ ...prev, supplier: res.data.id }));
      setMessage('Поставщик создан');
      await load();
    } catch (err) {
      setError(JSON.stringify(err.response?.data || 'Не удалось создать поставщика'));
    } finally {
      setSaving(false);
    }
  };

  const createAccess = async (event) => {
    event.preventDefault();
    if (!accessForm.user || !accessForm.supplier) {
      setError('Выберите пользователя и поставщика');
      return;
    }
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await adminAPI.supplierUsers.create(accessForm);
      setMessage('Доступ выдан');
      await load();
    } catch (err) {
      setError(JSON.stringify(err.response?.data || 'Не удалось выдать доступ'));
    } finally {
      setSaving(false);
    }
  };

  const setSupplierValue = (field, value) => setSupplierForm(prev => ({ ...prev, [field]: value }));
  const setAccessValue = (field, value) => setAccessForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Поставщики</h1>
          <p className="mt-1 text-sm text-gray-600">Поставщики, пользователи доступа и права кабинета</p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Обновить
        </button>
      </div>

      {(message || error) && (
        <div className={`rounded-md border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
          {error || message}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <form onSubmit={createSupplier} className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary-600" />
            <h2 className="text-base font-semibold text-gray-900">Новый поставщик</h2>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Код">
              <input className={inputClass} value={supplierForm.code} onChange={e => setSupplierValue('code', e.target.value)} />
            </Field>
            <Field label="Название">
              <input className={inputClass} value={supplierForm.name} onChange={e => setSupplierValue('name', e.target.value)} />
            </Field>
            <Field label="Тип">
              <select className={inputClass} value={supplierForm.supplier_type} onChange={e => setSupplierValue('supplier_type', e.target.value)}>
                <option value="feed">Фид</option>
                <option value="api">API</option>
                <option value="manual">Вручную</option>
              </select>
            </Field>
            <Field label="Сайт">
              <input className={inputClass} value={supplierForm.website_url} onChange={e => setSupplierValue('website_url', e.target.value)} placeholder="https://..." />
            </Field>
            <Field label="Оплата">
              <select className={inputClass} value={supplierForm.payment_model} onChange={e => setSupplierValue('payment_model', e.target.value)}>
                <option value="partner_checkout">Оплата у партнёра</option>
                <option value="platform_checkout">Оплата на платформе</option>
                <option value="cash_on_pickup">Оплата при получении</option>
              </select>
            </Field>
            <Field label="Расчёты">
              <select className={inputClass} value={supplierForm.settlement_model} onChange={e => setSupplierValue('settlement_model', e.target.value)}>
                <option value="agent_commission">Агентская комиссия</option>
                <option value="resale_margin">Маржа перепродажи</option>
                <option value="manual_reconciliation">Ручная сверка</option>
              </select>
            </Field>
          </div>
          <label className="mt-4 flex items-center text-sm text-gray-700">
            <input
              type="checkbox"
              checked={supplierForm.is_active}
              onChange={e => setSupplierValue('is_active', e.target.checked)}
              className="mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Активен
          </label>
          <button
            type="submit"
            disabled={saving}
            className="mt-5 inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
          >
            <Plus className="mr-2 h-4 w-4" />
            Добавить поставщика
          </button>
        </form>

        <form onSubmit={createAccess} className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary-600" />
            <h2 className="text-base font-semibold text-gray-900">Доступ в кабинет</h2>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Пользователь">
              <select className={inputClass} value={accessForm.user} onChange={e => setAccessValue('user', e.target.value)}>
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.email}</option>
                ))}
              </select>
            </Field>
            <Field label="Поставщик">
              <select className={inputClass} value={accessForm.supplier} onChange={e => setAccessValue('supplier', e.target.value)}>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Роль">
              <select className={inputClass} value={accessForm.role} onChange={e => setAccessValue('role', e.target.value)}>
                <option value="manager">Менеджер</option>
                <option value="editor">Редактор ассортимента</option>
                <option value="analyst">Аналитик</option>
              </select>
            </Field>
            <Field label="Активность">
              <select className={inputClass} value={accessForm.is_active ? 'yes' : 'no'} onChange={e => setAccessValue('is_active', e.target.value === 'yes')}>
                <option value="yes">Активен</option>
                <option value="no">Отключён</option>
              </select>
            </Field>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {[
              ['can_edit_catalog', 'Редактировать ассортимент'],
              ['can_view_finance', 'Смотреть финансы'],
              ['can_export_reports', 'Экспорт отчётов'],
            ].map(([field, label]) => (
              <label key={field} className="flex items-center rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={Boolean(accessForm[field])}
                  onChange={e => setAccessValue(field, e.target.checked)}
                  className="mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                {label}
              </label>
            ))}
          </div>
          <button
            type="submit"
            disabled={saving || suppliers.length === 0 || users.length === 0}
            className="mt-5 inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            Выдать доступ
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Поставщик</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Код</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Тип</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Оплата</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {suppliers.map(supplier => (
              <tr key={supplier.id}>
                <td className="px-4 py-4 text-sm font-medium text-gray-900">{supplier.name}</td>
                <td className="px-4 py-4 text-sm text-gray-600">{supplier.code}</td>
                <td className="px-4 py-4 text-sm text-gray-600">{supplier.supplier_type}</td>
                <td className="px-4 py-4 text-sm text-gray-600">{supplier.payment_model}</td>
                <td className="px-4 py-4 text-sm text-gray-600">{supplier.is_active ? 'Активен' : 'Отключён'}</td>
              </tr>
            ))}
            {!loading && suppliers.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500">Поставщиков пока нет</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900">Доступы пользователей</div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Пользователь</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Поставщик</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Роль</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Права</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Активен</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {accesses.map(access => (
              <tr key={access.id}>
                <td className="px-4 py-4 text-sm font-medium text-gray-900">
                  {access.user_email || usersById[access.user]?.email || access.user}
                </td>
                <td className="px-4 py-4 text-sm text-gray-600">{access.supplier_name}</td>
                <td className="px-4 py-4 text-sm text-gray-600">{access.role}</td>
                <td className="px-4 py-4 text-sm text-gray-600">
                  Каталог: {boolText(access.can_edit_catalog)} · Финансы: {boolText(access.can_view_finance)} · Экспорт: {boolText(access.can_export_reports)}
                </td>
                <td className="px-4 py-4 text-sm text-gray-600">{access.is_active ? 'да' : 'нет'}</td>
              </tr>
            ))}
            {!loading && accesses.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500">Доступы пока не выданы</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SuppliersPage;
