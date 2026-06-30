import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Plus, Save, Send, Trash2 } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { supplierAPI } from '../utils/api';

const emptyOffer = {
  article_number: '',
  package_name: '',
  package_weight_kg: '',
  price: '',
  in_stock: true,
  barcode: '',
  agency_percent: '',
};

const emptyData = {
  name: '',
  brand: '',
  line: '',
  species: 'dog',
  food_form: 'dry',
  life_stage: 'adult',
  size_group: 'all',
  diet_purpose: [],
  main_protein: '',
  kcal_per_100g: '',
  protein_percent: '',
  fat_percent: '',
  fiber_percent: '',
  ash_percent: '',
  moisture_percent: '',
  calcium_percent: '',
  phosphorus_percent: '',
  ingredients: [],
  allergens: [],
  is_sterilized: false,
  is_sensitive_digestion: false,
  is_urinary: false,
  is_weight_control: false,
  is_grain_free: false,
  is_hypoallergenic: false,
  offers: [{ ...emptyOffer }],
};

const listToText = (list) => Array.isArray(list) ? list.join('\n') : '';
const textToList = (text) => String(text || '').split('\n').map(v => v.trim()).filter(Boolean);

const Field = ({ label, children }) => (
  <label className="block">
    <span className="text-sm font-medium text-gray-700">{label}</span>
    <div className="mt-1">{children}</div>
  </label>
);

const inputClass = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500';

const SupplierProductEditor = () => {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [data, setData] = useState(emptyData);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isNew) return;
    let mounted = true;
    supplierAPI.products.retrieve(id).then((res) => {
      if (!mounted) return;
      setSubmission(res.data);
      setData({ ...emptyData, ...(res.data.data || {}) });
    });
    return () => {
      mounted = false;
    };
  }, [id, isNew]);

  const validation = useMemo(() => submission?.validation_errors || {}, [submission]);
  const allErrors = [...(validation.shop || []), ...(validation.recommendation || [])];

  const setValue = (field, value) => setData(prev => ({ ...prev, [field]: value }));
  const setOffer = (index, field, value) => {
    setData(prev => ({
      ...prev,
      offers: prev.offers.map((offer, i) => i === index ? { ...offer, [field]: value } : offer),
    }));
  };

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const payload = { data };
      const res = isNew
        ? await supplierAPI.products.create(payload)
        : await supplierAPI.products.update(id, payload);
      setSubmission(res.data);
      if (isNew) {
        navigate(`/supplier-panel/products/${res.data.id}`, { replace: true });
      }
      setMessage('Черновик сохранён');
    } finally {
      setSaving(false);
    }
  };

  const validate = async () => {
    if (isNew) {
      await save();
      return;
    }
    const res = await supplierAPI.products.validate(id);
    setSubmission(prev => ({ ...prev, validation_errors: res.data.validation_errors }));
    setMessage('Проверка обновлена');
  };

  const submit = async () => {
    setSaving(true);
    try {
      const res = await supplierAPI.products.submit(id);
      setSubmission(res.data);
      setMessage('Заявка отправлена на модерацию');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{isNew ? 'Новый корм' : submission?.title || 'Карточка корма'}</h1>
          <div className="mt-2 flex items-center gap-3">
            {submission && <StatusBadge value={submission.status} />}
            {message && <span className="text-sm text-green-700">{message}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Save className="mr-2 h-4 w-4" />
            Сохранить
          </button>
          <button
            type="button"
            onClick={validate}
            disabled={saving || isNew}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Проверить
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving || isNew}
            className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <Send className="mr-2 h-4 w-4" />
            На модерацию
          </button>
        </div>
      </div>

      {allErrors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="text-sm font-medium text-red-800">Блокирующие ошибки</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
            {allErrors.map(error => <li key={error}>{error}</li>)}
          </ul>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-base font-semibold text-gray-900">Идентичность рецепта</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Название рецепта">
              <input className={inputClass} value={data.name} onChange={e => setValue('name', e.target.value)} />
            </Field>
            <Field label="Бренд">
              <input className={inputClass} value={data.brand} onChange={e => setValue('brand', e.target.value)} />
            </Field>
            <Field label="Линейка">
              <input className={inputClass} value={data.line || ''} onChange={e => setValue('line', e.target.value)} />
            </Field>
            <Field label="Основной белок">
              <input className={inputClass} value={data.main_protein || ''} onChange={e => setValue('main_protein', e.target.value)} />
            </Field>
            <Field label="Вид животного">
              <select className={inputClass} value={data.species} onChange={e => setValue('species', e.target.value)}>
                <option value="dog">Собака</option>
                <option value="cat">Кошка</option>
              </select>
            </Field>
            <Field label="Тип корма">
              <select className={inputClass} value={data.food_form} onChange={e => setValue('food_form', e.target.value)}>
                <option value="dry">Сухой</option>
                <option value="wet">Влажный</option>
                <option value="treat">Лакомство</option>
              </select>
            </Field>
            <Field label="Возраст">
              <select className={inputClass} value={data.life_stage} onChange={e => setValue('life_stage', e.target.value)}>
                <option value="puppy">Щенки</option>
                <option value="kitten">Котята</option>
                <option value="adult">Взрослые</option>
                <option value="senior">Пожилые</option>
                <option value="all">Все возрасты</option>
              </select>
            </Field>
            <Field label="Размер породы">
              <select className={inputClass} value={data.size_group || 'all'} onChange={e => setValue('size_group', e.target.value)}>
                <option value="all">Все</option>
                <option value="small">Малые</option>
                <option value="medium">Средние</option>
                <option value="large">Крупные</option>
                <option value="giant">Гигантские</option>
              </select>
            </Field>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-base font-semibold text-gray-900">Питательность на 100 г</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {[
              ['kcal_per_100g', 'Ккал'],
              ['protein_percent', 'Белок, %'],
              ['fat_percent', 'Жир, %'],
              ['fiber_percent', 'Клетчатка, %'],
              ['ash_percent', 'Зола, %'],
              ['moisture_percent', 'Влажность, %'],
              ['calcium_percent', 'Кальций, %'],
              ['phosphorus_percent', 'Фосфор, %'],
            ].map(([field, label]) => (
              <Field key={field} label={label}>
                <input className={inputClass} value={data[field] || ''} onChange={e => setValue(field, e.target.value)} />
              </Field>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-base font-semibold text-gray-900">Состав</h2>
          <textarea
            className={`${inputClass} mt-4 min-h-48`}
            value={listToText(data.ingredients)}
            onChange={e => setValue('ingredients', textToList(e.target.value))}
            placeholder="Каждый ингредиент с новой строки, в порядке с упаковки"
          />
        </section>
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-base font-semibold text-gray-900">Аллергены и признаки</h2>
          <textarea
            className={`${inputClass} mt-4 min-h-28`}
            value={listToText(data.allergens)}
            onChange={e => setValue('allergens', textToList(e.target.value))}
            placeholder="курица, говядина, рыба, пшеница..."
          />
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              ['is_sterilized', 'Для стерилизованных'],
              ['is_sensitive_digestion', 'Чувствительное пищеварение'],
              ['is_urinary', 'Мочевыводящая система'],
              ['is_weight_control', 'Контроль веса'],
              ['is_grain_free', 'Беззерновой'],
              ['is_hypoallergenic', 'Гипоаллергенный'],
            ].map(([field, label]) => (
              <label key={field} className="flex items-center rounded-md border border-gray-200 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(data[field])}
                  onChange={e => setValue(field, e.target.checked)}
                  className="mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                {label}
              </label>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Фасовки</h2>
          <button
            type="button"
            onClick={() => setData(prev => ({ ...prev, offers: [...prev.offers, { ...emptyOffer }] }))}
            className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Plus className="mr-2 h-4 w-4" />
            Добавить
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {(data.offers || []).map((offer, index) => (
            <div key={index} className="grid gap-3 rounded-lg border border-gray-200 p-3 md:grid-cols-6">
              <input className={inputClass} placeholder="Артикул" value={offer.article_number} onChange={e => setOffer(index, 'article_number', e.target.value)} />
              <input className={inputClass} placeholder="Фасовка" value={offer.package_name} onChange={e => setOffer(index, 'package_name', e.target.value)} />
              <input className={inputClass} placeholder="Вес, кг" value={offer.package_weight_kg} onChange={e => setOffer(index, 'package_weight_kg', e.target.value)} />
              <input className={inputClass} placeholder="Цена" value={offer.price} onChange={e => setOffer(index, 'price', e.target.value)} />
              <label className="flex items-center rounded-md border border-gray-200 px-3 py-2 text-sm">
                <input type="checkbox" checked={Boolean(offer.in_stock)} onChange={e => setOffer(index, 'in_stock', e.target.checked)} className="mr-2" />
                В наличии
              </label>
              <button
                type="button"
                onClick={() => setData(prev => ({ ...prev, offers: prev.offers.filter((_, i) => i !== index) }))}
                className="inline-flex items-center justify-center rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default SupplierProductEditor;
