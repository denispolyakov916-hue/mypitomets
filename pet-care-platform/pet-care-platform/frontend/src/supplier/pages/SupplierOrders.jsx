import React, { useEffect, useState } from 'react';
import PeriodFilter from '../components/PeriodFilter';
import StatusBadge from '../components/StatusBadge';
import { supplierAPI } from '../utils/api';

const money = (value) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(value || 0);
const formatDateTime = (value) => value ? new Date(value).toLocaleString('ru-RU') : '-';

const SupplierOrders = () => {
  const [period, setPeriod] = useState('30d');
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    supplierAPI.orders.list({ period }).then(res => setOrders(res.data.results || []));
  }, [period]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Заказы</h1>
          <p className="mt-1 text-sm text-gray-500">Только позиции с товарами текущего поставщика</p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>
      <div className="space-y-3 md:hidden">
        {orders.map(item => (
          <article key={`${item.order_id}-${item.product_id}-${item.sku_id}`} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-gray-900">{item.order_id}</div>
                <div className="mt-1 text-xs text-gray-500">{formatDateTime(item.created_at)}</div>
              </div>
              <StatusBadge value={item.status} />
            </div>
            <div className="mt-3 line-clamp-3 text-sm font-medium text-gray-900">{item.product_name}</div>
            <div className="mt-1 text-xs text-gray-500">{item.sku_name || '-'} {item.article_number ? `· ${item.article_number}` : ''}</div>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-gray-500">Количество</dt>
                <dd className="mt-1 font-medium text-gray-900">{item.quantity}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Сумма</dt>
                <dd className="mt-1 font-semibold text-gray-900">{money(item.total)}</dd>
              </div>
            </dl>
          </article>
        ))}
        {orders.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
            Нет заказов за период
          </div>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white md:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Заказ</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Товар</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">SKU</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Кол-во</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Сумма</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map(item => (
              <tr key={`${item.order_id}-${item.product_id}-${item.sku_id}`} className="hover:bg-gray-50">
                <td className="px-4 py-4 text-sm text-gray-600">
                  <div className="font-medium text-gray-900">{item.order_id}</div>
                  <div className="text-xs text-gray-500">{formatDateTime(item.created_at)}</div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-900">{item.product_name}</td>
                <td className="px-4 py-4 text-sm text-gray-600">
                  <div>{item.sku_name || '-'}</div>
                  <div className="text-xs text-gray-400">{item.article_number || ''}</div>
                </td>
                <td className="px-4 py-4 text-right text-sm text-gray-700">{item.quantity}</td>
                <td className="px-4 py-4 text-right text-sm font-medium text-gray-900">{money(item.total)}</td>
                <td className="px-4 py-4"><StatusBadge value={item.status} /></td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">Нет заказов за период</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SupplierOrders;
