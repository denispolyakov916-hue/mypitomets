import React, { useEffect, useState } from 'react';
import { Banknote, Boxes, ClipboardList, RotateCcw } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import PeriodFilter from '../components/PeriodFilter';
import { supplierAPI } from '../utils/api';

const money = (value) => new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
}).format(value || 0);

const SupplierDashboard = () => {
  const [period, setPeriod] = useState('30d');
  const [summary, setSummary] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [summaryRes, topRes, trendRes] = await Promise.all([
          supplierAPI.dashboard.summary({ period }),
          supplierAPI.dashboard.topProducts({ period, limit: 8 }),
          supplierAPI.dashboard.salesTrend({ period }),
        ]);
        if (!mounted) return;
        setSummary(summaryRes.data);
        setTopProducts(topRes.data.results || []);
        setTrend(trendRes.data.results || []);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [period]);

  const maxRevenue = Math.max(...trend.map(item => item.revenue || 0), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Дашборд</h1>
          <p className="mt-1 text-sm text-gray-500">Продажи, выручка, возвраты и состояние ассортимента</p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Валовая выручка" value={money(summary?.gross_revenue)} icon={Banknote} />
        <MetricCard label="Заказы" value={summary?.orders_count ?? '-'} icon={ClipboardList} />
        <MetricCard label="Продано единиц" value={summary?.sold_units ?? '-'} icon={Boxes} />
        <MetricCard
          label="Возвраты"
          value={money(summary?.refunded_amount)}
          hint={`${summary?.return_rate ?? 0}% от проданных единиц`}
          icon={RotateCcw}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Динамика выручки</h2>
            {loading && <span className="text-xs text-gray-400">Обновление...</span>}
          </div>
          <div className="mt-5 flex h-64 items-end gap-2">
            {trend.length === 0 ? (
              <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">Нет данных за период</div>
            ) : trend.map(item => (
              <div key={item.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t bg-primary-500"
                  style={{ height: `${Math.max(4, ((item.revenue || 0) / maxRevenue) * 220)}px` }}
                  title={`${item.date}: ${money(item.revenue)}`}
                />
                <div className="w-full truncate text-center text-[10px] text-gray-400">{item.date.slice(5)}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-base font-semibold text-gray-900">Топ товаров</h2>
          <div className="mt-4 divide-y divide-gray-100">
            {topProducts.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500">Нет продаж за период</div>
            ) : topProducts.map(item => (
              <div key={`${item.product_id}-${item.product_name}`} className="py-3">
                <div className="line-clamp-2 text-sm font-medium text-gray-900">{item.product_name}</div>
                <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                  <span>{item.units} шт. / {item.orders} заказов</span>
                  <span className="font-medium text-gray-900">{money(item.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Чистая выручка" value={money(summary?.net_revenue)} />
        <MetricCard label="Заявки на проверке" value={summary?.submissions_in_review ?? '-'} />
        <MetricCard label="Активные офферы" value={summary?.active_offers ?? '-'} />
      </div>
    </div>
  );
};

export default SupplierDashboard;
