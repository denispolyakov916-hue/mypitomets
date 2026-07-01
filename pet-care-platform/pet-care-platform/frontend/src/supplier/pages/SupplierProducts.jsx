import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { supplierAPI } from '../utils/api';

const pageSize = 50;

const parseLabels = {
  auto_parsed: 'запарсено',
  partial: 'частично',
  not_parsed: 'не запарсено',
};

const smallBadgeClass = 'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium';
const formatDate = (value) => value ? new Date(value).toLocaleDateString('ru-RU') : '-';

// Окно номеров страниц с многоточиями: [1, gap, 4, 5, 6, gap, 33]
const buildPageWindow = (page, pageCount) => {
  const sorted = [...new Set([1, pageCount, page, page - 1, page + 1])]
    .filter(p => p >= 1 && p <= pageCount)
    .sort((a, b) => a - b);
  const out = [];
  let prev = 0;
  sorted.forEach(p => {
    if (p - prev > 1) out.push(`gap-${p}`);
    out.push(p);
    prev = p;
  });
  return out;
};

const pageNavBtn = 'inline-flex items-center justify-center rounded-md border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50';

const Pagination = ({ page, pageCount, loading, onChange }) => {
  const [jump, setJump] = useState('');
  const go = (p) => onChange(Math.min(pageCount, Math.max(1, Number(p) || 1)));
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button type="button" disabled={page <= 1 || loading} onClick={() => go(page - 1)} className={pageNavBtn} aria-label="Назад">
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      {buildPageWindow(page, pageCount).map(p => (typeof p === 'string'
        ? <span key={p} className="px-1 text-xs text-gray-400">…</span>
        : (
          <button
            key={p}
            type="button"
            disabled={loading}
            onClick={() => go(p)}
            className={`min-w-[2rem] rounded-md border px-2 py-1.5 text-xs font-medium ${p === page ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            {p}
          </button>
        )))}
      <button type="button" disabled={page >= pageCount || loading} onClick={() => go(page + 1)} className={pageNavBtn} aria-label="Далее">
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
      <form onSubmit={(e) => { e.preventDefault(); go(jump); setJump(''); }} className="ml-1 flex items-center gap-1">
        <input
          type="number"
          min={1}
          max={pageCount}
          value={jump}
          onChange={(e) => setJump(e.target.value)}
          placeholder={`${page}`}
          aria-label="Перейти к странице"
          className="w-14 rounded-md border border-gray-300 px-2 py-1 text-xs"
        />
        <button type="submit" className={pageNavBtn}>Перейти</button>
        <span className="text-xs text-gray-400">из {pageCount}</span>
      </form>
    </div>
  );
};

const SupplierProducts = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [parseStatus, setParseStatus] = useState('');
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await supplierAPI.products.list({ search, status, parse_status: parseStatus, page, page_size: pageSize });
        if (mounted) {
          setProducts(res.data.results || []);
          setCount(res.data.count || 0);
        }
      } catch (err) {
        if (mounted) {
          setError(err.response?.data?.detail || 'Не удалось загрузить ассортимент');
          setProducts([]);
          setCount(0);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    const timer = setTimeout(load, 250);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [search, status, parseStatus, page]);

  const pageCount = Math.max(1, Math.ceil(count / pageSize));
  const from = count ? ((page - 1) * pageSize) + 1 : 0;
  const to = Math.min(page * pageSize, count);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Ассортимент</h1>
          <p className="mt-1 text-sm text-gray-500">Корма из магазина, подбора и сырые позиции фида Динозаврика</p>
        </div>
        <a
          href="/supplier-panel/products/new"
          className="inline-flex items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Создать корм
        </a>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 lg:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Поиск по названию или бренду"
            className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">Все статусы</option>
          <option value="draft">Черновики</option>
          <option value="submitted">На проверке</option>
          <option value="needs_fix">Нужны исправления</option>
          <option value="approved_for_shop">В магазине</option>
          <option value="approved_for_recommendation">В подборе</option>
        </select>
        <select
          value={parseStatus}
          onChange={(event) => {
            setParseStatus(event.target.value);
            setPage(1);
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">Все парсинги</option>
          <option value="auto_parsed">Запарсено</option>
          <option value="partial">Частично</option>
          <option value="not_parsed">Не запарсено</option>
        </select>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {loading ? 'Загружаю ассортимент...' : `Показано ${from}-${to} из ${count} позиций`}
        </div>
        <Pagination page={page} pageCount={pageCount} loading={loading} onChange={setPage} />
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="space-y-3 md:hidden">
        {products.map((item, idx) => {
          const rowNo = (page - 1) * pageSize + idx + 1;
          const data = item.data || {};
          const origin = item.changed_fields || {};
          const itemParseStatus = origin.parse_status || data.parse_status;
          const errorsCount = (item.validation_errors?.shop?.length || 0) + (item.validation_errors?.recommendation?.length || 0);
          return (
            <article key={item.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-gray-400">№{rowNo}</span>
                  <a href={`/supplier-panel/products/${item.id}`} className="block line-clamp-3 text-sm font-semibold text-gray-900 hover:text-primary-700">
                    {item.title}
                  </a>
                  <div className="mt-1 truncate text-xs text-gray-500">{data.brand || 'Бренд не указан'}</div>
                </div>
                <div className="flex-shrink-0">
                  <StatusBadge value={item.status} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {origin.in_shop && <span className={`${smallBadgeClass} bg-blue-50 text-blue-700`}>магазин</span>}
                {origin.in_recommendation && <span className={`${smallBadgeClass} bg-green-50 text-green-700`}>подбор</span>}
                {origin.catalog_origin === 'raw_unparsed' && <span className={`${smallBadgeClass} bg-amber-50 text-amber-700`}>сырой фид</span>}
                {itemParseStatus && (
                  <span className={`${smallBadgeClass} ${itemParseStatus === 'auto_parsed' ? 'bg-gray-100 text-gray-700' : 'bg-amber-100 text-amber-800'}`}>
                    {parseLabels[itemParseStatus] || itemParseStatus}
                  </span>
                )}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-gray-500">Классификация</dt>
                  <dd className="mt-1 font-medium text-gray-900">{data.species || '-'} / {data.food_form || '-'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Возраст</dt>
                  <dd className="mt-1 font-medium text-gray-900">{data.life_stage || '-'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Ошибки</dt>
                  <dd className={`mt-1 font-medium ${errorsCount ? 'text-red-600' : 'text-green-700'}`}>
                    {errorsCount ? `${errorsCount} блок.` : 'Нет'}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Обновлено</dt>
                  <dd className="mt-1 font-medium text-gray-900">{formatDate(item.updated_at)}</dd>
                </div>
              </dl>
            </article>
          );
        })}
        {!loading && products.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
            Корма не найдены
          </div>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white md:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-14 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">№</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Корм</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Классификация</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Проверка</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Ошибки</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Обновлено</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map((item, idx) => {
              const rowNo = (page - 1) * pageSize + idx + 1;
              const data = item.data || {};
              const origin = item.changed_fields || {};
              const parseStatus = origin.parse_status || data.parse_status;
              const errorsCount = (item.validation_errors?.shop?.length || 0) + (item.validation_errors?.recommendation?.length || 0);
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 text-sm font-medium text-gray-400 align-top">{rowNo}</td>
                  <td className="px-4 py-4">
                    <a href={`/supplier-panel/products/${item.id}`} className="block font-medium text-gray-900 hover:text-primary-700">
                      {item.title}
                    </a>
                    <div className="mt-1 text-xs text-gray-500">{data.brand || 'Бренд не указан'}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {origin.in_shop && (
                        <span className={`${smallBadgeClass} bg-blue-50 text-blue-700`}>магазин</span>
                      )}
                      {origin.in_recommendation && (
                        <span className={`${smallBadgeClass} bg-green-50 text-green-700`}>подбор</span>
                      )}
                      {origin.catalog_origin === 'raw_unparsed' && (
                        <span className={`${smallBadgeClass} bg-amber-50 text-amber-700`}>сырой фид</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">
                    <div>{data.species || '-'} / {data.food_form || '-'}</div>
                    <div className="mt-1 text-xs text-gray-400">{data.life_stage || 'возраст не указан'}</div>
                    {parseStatus && (
                      <div className="mt-2">
                        <span className={`${smallBadgeClass} ${parseStatus === 'auto_parsed' ? 'bg-gray-100 text-gray-700' : 'bg-amber-100 text-amber-800'}`}>
                          {parseLabels[parseStatus] || parseStatus}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge value={item.status} />
                  </td>
                  <td className="px-4 py-4 text-sm">
                    {errorsCount ? (
                      <span className="text-red-600">{errorsCount} блок.</span>
                    ) : (
                      <span className="text-green-700">Нет блокировок</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right text-xs text-gray-500">
                    {formatDate(item.updated_at)}
                  </td>
                </tr>
              );
            })}
            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">
                  Корма не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SupplierProducts;
