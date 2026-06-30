import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import PeriodFilter from '../components/PeriodFilter';
import { supplierAPI } from '../utils/api';

const money = (value) => new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
}).format(value || 0);

const SupplierAnalytics = () => {
  const [period, setPeriod] = useState('30d');
  const [summary, setSummary] = useState(null);
  const [topProducts, setTopProducts] = useState([]);

  useEffect(() => {
    Promise.all([
      supplierAPI.dashboard.summary({ period }),
      supplierAPI.dashboard.topProducts({ period, limit: 20 }),
    ]).then(([summaryRes, topRes]) => {
      setSummary(summaryRes.data);
      setTopProducts(topRes.data.results || []);
    });
  }, [period]);

  const exportCsv = async () => {
    const res = await supplierAPI.dashboard.export({ period });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'supplier-sales.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Аналитика</h1>
          <p className="mt-1 text-sm text-gray-500">Детализация продаж и возвратов по товарам</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PeriodFilter value={period} onChange={setPeriod} />
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download className="mr-2 h-4 w-4" />
            CSV
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Валовая выручка" value={money(summary?.gross_revenue)} />
        <MetricCard label="Чистая выручка" value={money(summary?.net_revenue)} />
        <MetricCard label="Возвраты" value={money(summary?.refunded_amount)} />
        <MetricCard label="Процент возвратов" value={`${summary?.return_rate ?? 0}%`} />
      </div>

      <div className="space-y-3 md:hidden">
        {topProducts.map(item => (
          <article key={`${item.product_id}-${item.product_name}`} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="line-clamp-3 text-sm font-semibold text-gray-900">{item.product_name}</div>
            <dl className="mt-3 grid grid-cols-3 gap-3 text-xs">
              <div>
                <dt className="text-gray-500">Заказы</dt>
                <dd className="mt-1 font-medium text-gray-900">{item.orders}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Продано</dt>
                <dd className="mt-1 font-medium text-gray-900">{item.units}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Выручка</dt>
                <dd className="mt-1 font-semibold text-gray-900">{money(item.revenue)}</dd>
              </div>
            </dl>
          </article>
        ))}
        {topProducts.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
            Нет данных за период
          </div>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white md:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Товар</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Заказы</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Продано</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Выручка</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {topProducts.map(item => (
              <tr key={`${item.product_id}-${item.product_name}`}>
                <td className="px-4 py-4 text-sm font-medium text-gray-900">{item.product_name}</td>
                <td className="px-4 py-4 text-right text-sm text-gray-700">{item.orders}</td>
                <td className="px-4 py-4 text-right text-sm text-gray-700">{item.units}</td>
                <td className="px-4 py-4 text-right text-sm font-semibold text-gray-900">{money(item.revenue)}</td>
              </tr>
            ))}
            {topProducts.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-gray-500">Нет данных за период</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SupplierAnalytics;
