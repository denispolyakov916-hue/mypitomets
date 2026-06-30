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
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:flex">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronLeft className="mr-1 h-3.5 w-3.5" />
            Назад
          </button>
          <span className="text-center text-xs text-gray-500">Стр. {page} из {pageCount}</span>
          <button
            type="button"
            disabled={page >= pageCount || loading}
            onClick={() => setPage(prev => Math.min(pageCount, prev + 1))}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Далее
            <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="space-y-3 md:hidden">
        {products.map(item => {
          const data = item.data || {};
          const origin = item.changed_fields || {};
          const itemParseStatus = origin.parse_status || data.parse_status;
          const errorsCount = (item.validation_errors?.shop?.length || 0) + (item.validation_errors?.recommendation?.length || 0);
          return (
            <article key={item.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <a href={`/supplier-panel/products/${item.id}`} className="line-clamp-3 text-sm font-semibold text-gray-900 hover:text-primary-700">
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
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Корм</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Классификация</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Проверка</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Ошибки</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Обновлено</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map(item => {
              const data = item.data || {};
              const origin = item.changed_fields || {};
              const parseStatus = origin.parse_status || data.parse_status;
              const errorsCount = (item.validation_errors?.shop?.length || 0) + (item.validation_errors?.recommendation?.length || 0);
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <a href={`/supplier-panel/products/${item.id}`} className="font-medium text-gray-900 hover:text-primary-700">
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
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-500">
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
