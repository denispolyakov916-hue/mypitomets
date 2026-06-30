import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, ClipboardCheck, Eye, Store, X } from 'lucide-react';
import StatusBadge from '../../../supplier/components/StatusBadge';
import { adminAPI } from '../../utils/api';

const checklistItems = [
  ['identity_verified', 'Название, бренд, линейка, вид животного и возраст сверены с упаковкой или карточкой поставщика'],
  ['nutrition_verified', 'Ккал, белок, жир, клетчатка, зола, влажность и минералы сверены с источником'],
  ['ingredients_verified', 'Состав перенесён полностью и в правильном порядке'],
  ['allergens_verified', 'Аллергены и основной белок отмечены вручную'],
  ['assortment_verified', 'Артикулы, фасовки, цены, остатки и штрихкоды сверены'],
  ['recommendation_flags_verified', 'Флаги подбора и лечебные назначения не конфликтуют с составом'],
];

const emptyChecklist = checklistItems.reduce((acc, [key]) => {
  acc[key] = false;
  return acc;
}, {});

const statusOptions = [
  ['', 'Все статусы'],
  ['submitted', 'На проверке'],
  ['needs_fix', 'Нужны исправления'],
  ['approved_for_shop', 'В магазине'],
  ['approved_for_recommendation', 'В подборе'],
  ['rejected', 'Отклонено'],
  ['draft', 'Черновики'],
];

const fieldRows = [
  ['name', 'Название'],
  ['brand', 'Бренд'],
  ['line', 'Линейка'],
  ['species', 'Животное'],
  ['food_form', 'Тип корма'],
  ['life_stage', 'Возраст'],
  ['size_group', 'Размер'],
  ['main_protein', 'Основной белок'],
  ['kcal_per_100g', 'Ккал / 100 г'],
  ['protein_percent', 'Белок, %'],
  ['fat_percent', 'Жир, %'],
  ['fiber_percent', 'Клетчатка, %'],
  ['ash_percent', 'Зола, %'],
  ['moisture_percent', 'Влажность, %'],
  ['calcium_percent', 'Кальций, %'],
  ['phosphorus_percent', 'Фосфор, %'],
];

const formatValue = (value) => {
  if (Array.isArray(value)) return value.length ? value.join(', ') : '-';
  if (value === true) return 'да';
  if (value === false) return 'нет';
  return value || '-';
};

const checklistFromSubmission = (submission) => ({
  ...emptyChecklist,
  ...(submission?.changed_fields?.recommendation_approval_checklist || {}),
});

const SupplierSubmissionsPage = () => {
  const [submissions, setSubmissions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState('submitted');
  const [busyId, setBusyId] = useState(null);
  const [checklist, setChecklist] = useState(emptyChecklist);
  const [reviewComment, setReviewComment] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    const res = await adminAPI.supplierSubmissions.list({ status, page_size: 100 });
    const results = res.data.results || [];
    setSubmissions(results);
    const nextSelected = (selected && results.find(item => item.id === selected.id)) || results[0] || null;
    setSelected(nextSelected);
    setChecklist(checklistFromSubmission(nextSelected));
    setReviewComment(nextSelected?.review_comment || '');
  };

  useEffect(() => {
    load().catch(err => {
      setError(err.response?.data?.detail || 'Не удалось загрузить заявки');
    });
  }, [status]);

  const openSubmission = (submission) => {
    setSelected(submission);
    setChecklist(checklistFromSubmission(submission));
    setReviewComment(submission.review_comment || '');
    setError('');
  };

  const act = async (id, fn) => {
    setBusyId(id);
    setError('');
    try {
      const res = await fn();
      if (res?.data?.id) {
        setSelected(res.data);
        setChecklist(checklistFromSubmission(res.data));
        setReviewComment(res.data.review_comment || '');
      }
      await load();
    } catch (err) {
      setError(JSON.stringify(err.response?.data || 'Не удалось выполнить действие'));
    } finally {
      setBusyId(null);
    }
  };

  const selectedData = selected?.data || {};
  const selectedErrors = useMemo(() => {
    return [
      ...(selected?.validation_errors?.shop || []),
      ...(selected?.validation_errors?.recommendation || []),
    ];
  }, [selected]);
  const checklistComplete = checklistItems.every(([key]) => Boolean(checklist[key]));

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Модерация кормов</h1>
          <p className="mt-1 text-sm text-gray-600">Очередь ручной проверки перед магазином и подбором</p>
        </div>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {statusOptions.map(([value, label]) => <option key={value || 'all'} value={value}>{label}</option>)}
        </select>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_1.15fr]">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Корм</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Данные</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Ошибки</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Открыть</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {submissions.map(item => {
                const data = item.data || {};
                const errors = [...(item.validation_errors?.shop || []), ...(item.validation_errors?.recommendation || [])];
                return (
                  <tr key={item.id} className={`align-top ${selected?.id === item.id ? 'bg-primary-50' : ''}`}>
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">{item.title}</div>
                      <div className="mt-1 text-xs text-gray-500">{item.supplier_name} · {data.brand || 'бренд не указан'}</div>
                      <div className="mt-2"><StatusBadge value={item.status} /></div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      <div>{data.species || '-'} / {data.food_form || '-'}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        {data.kcal_per_100g || '-'} ккал, Б {data.protein_percent || '-'}%, Ж {data.fat_percent || '-'}%
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      {errors.length ? (
                        <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                          <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                          {errors.length}
                        </span>
                      ) : (
                        <span className="text-green-700">нет</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openSubmission(item)}
                        className="inline-flex items-center rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Eye className="mr-1 h-3.5 w-3.5" />
                        Проверить
                      </button>
                    </td>
                  </tr>
                );
              })}
              {submissions.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-gray-500">Заявок нет</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <aside className="rounded-lg border border-gray-200 bg-white p-5">
          {!selected ? (
            <div className="py-16 text-center text-sm text-gray-500">Выберите заявку для проверки</div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selected.title}</h2>
                  <div className="mt-1 text-sm text-gray-500">{selected.supplier_name} · {selected.source_raw_external_id || 'без исходной записи'}</div>
                </div>
                <StatusBadge value={selected.status} />
              </div>

              {selectedErrors.length > 0 && (
                <div className="rounded-md border border-red-200 bg-red-50 p-4">
                  <div className="text-sm font-medium text-red-800">Блокирующие ошибки</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
                    {selectedErrors.map(errorItem => <li key={errorItem}>{errorItem}</li>)}
                  </ul>
                </div>
              )}

              <section>
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-primary-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Чек-лист ручного допуска в подбор</h3>
                </div>
                <div className="mt-3 space-y-2">
                  {checklistItems.map(([key, label]) => (
                    <label key={key} className="flex items-start rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={Boolean(checklist[key])}
                        onChange={e => setChecklist(prev => ({ ...prev, [key]: e.target.checked }))}
                        className="mr-2 mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </section>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">Комментарий модератора</span>
                <textarea
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  className="mt-1 min-h-24 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="Что исправить или что было проверено вручную"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyId === selected.id}
                  onClick={() => act(selected.id, () => adminAPI.supplierSubmissions.requestFixes(selected.id, { comment: reviewComment || 'Нужны исправления' }))}
                  className="rounded-md border border-amber-200 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-60"
                >
                  Исправить
                </button>
                <button
                  type="button"
                  disabled={busyId === selected.id}
                  onClick={() => act(selected.id, () => adminAPI.supplierSubmissions.reject(selected.id, { comment: reviewComment || 'Отклонено' }))}
                  className="inline-flex items-center rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  <X className="mr-2 h-4 w-4" />
                  Отклонить
                </button>
                <button
                  type="button"
                  disabled={busyId === selected.id}
                  onClick={() => act(selected.id, () => adminAPI.supplierSubmissions.approveShop(selected.id, { comment: reviewComment }))}
                  className="inline-flex items-center rounded-md border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                >
                  <Store className="mr-2 h-4 w-4" />
                  В магазин
                </button>
                <button
                  type="button"
                  disabled={busyId === selected.id || !checklistComplete}
                  onClick={() => act(selected.id, () => adminAPI.supplierSubmissions.approveRecommendation(selected.id, { checklist, comment: reviewComment }))}
                  className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <Check className="mr-2 h-4 w-4" />
                  В подбор
                </button>
              </div>

              <section className="grid gap-4 lg:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Карточка для публикации</h3>
                  <dl className="mt-3 divide-y divide-gray-100 rounded-md border border-gray-200">
                    {fieldRows.map(([field, label]) => (
                      <div key={field} className="grid grid-cols-[130px_1fr] gap-3 px-3 py-2 text-sm">
                        <dt className="text-gray-500">{label}</dt>
                        <dd className="min-w-0 break-words text-gray-900">{formatValue(selectedData[field])}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Фасовки</h3>
                  <div className="mt-3 space-y-2">
                    {(selectedData.offers || []).map((offer, index) => (
                      <div key={`${offer.article_number || index}`} className="rounded-md border border-gray-200 px-3 py-2 text-sm">
                        <div className="font-medium text-gray-900">{offer.article_number || 'без артикула'}</div>
                        <div className="mt-1 text-gray-600">{offer.package_name || '-'} · {offer.package_weight_kg || '-'} кг · {offer.price || '-'} ₽</div>
                        <div className="mt-1 text-xs text-gray-500">Штрихкод: {offer.barcode || '-'} · Наличие: {offer.in_stock === false ? 'нет' : 'да'}</div>
                      </div>
                    ))}
                    {(!selectedData.offers || selectedData.offers.length === 0) && (
                      <div className="rounded-md border border-gray-200 px-3 py-8 text-center text-sm text-gray-500">Фасовки не указаны</div>
                    )}
                  </div>
                </div>
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Состав</h3>
                  <div className="mt-3 max-h-52 overflow-auto rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                    {formatValue(selectedData.ingredients)}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Исходный JSON поставщика</h3>
                  <pre className="mt-3 max-h-52 overflow-auto rounded-md border border-gray-200 bg-gray-950 p-3 text-xs text-gray-100">
                    {selected.source_raw_json ? JSON.stringify(selected.source_raw_json, null, 2) : 'Нет связанной исходной записи'}
                  </pre>
                </div>
              </section>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default SupplierSubmissionsPage;
