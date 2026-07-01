import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CheckCircle2, Eye, Image, Loader2, Save, Trash2 } from 'lucide-react';
import { adminAPI } from '../../admin/utils/api';

const EVENT_TYPES = [
  { value: 'meetup', label: 'Сходка/встреча' },
  { value: 'exhibition', label: 'Выставка' },
  { value: 'webinar', label: 'Вебинар' },
  { value: 'workshop', label: 'Мастер-класс' },
  { value: 'lecture', label: 'Лекция' },
  { value: 'other', label: 'Другое' },
];

const newsDefaults = {
  title: '',
  slug: '',
  excerpt: '',
  body: '',
  cover_image_url: '',
  category: '',
  status: 'draft',
  is_featured: false,
  related_event_id: '',
};

const eventDefaults = {
  title: '',
  slug: '',
  summary: '',
  description: '',
  event_type: 'meetup',
  cover_image_url: '',
  start_at: '',
  end_at: '',
  is_online: false,
  location: '',
  online_url: '',
  status: 'draft',
  is_featured: false,
};

function toDateTimeLocal(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

function fromDateTimeLocal(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-900">{label}</span>
      {hint && <span className="ml-2 text-xs text-gray-400">{hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputClass = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100';

export default function MarketingContentEditor() {
  const navigate = useNavigate();
  const { contentType, id } = useParams();
  const type = contentType === 'events' ? 'events' : 'news';
  const isNews = type === 'news';
  const isNew = id === 'new';
  const api = isNews ? adminAPI.marketing.news : adminAPI.marketing.events;

  const [form, setForm] = useState(isNews ? newsDefaults : eventDefaults);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const title = isNews ? 'Редактор новости' : 'Редактор мероприятия';
  const publicPath = useMemo(() => {
    if (!form.slug || form.status !== 'published') return null;
    return isNews ? `/news-events/news/${form.slug}` : `/news-events/events/${form.slug}`;
  }, [form.slug, form.status, isNews]);

  useEffect(() => {
    let alive = true;
    if (isNew) return undefined;
    setLoading(true);
    api.retrieve(id)
      .then((response) => {
        if (!alive) return;
        const data = response.data || {};
        if (isNews) {
          setForm({
            ...newsDefaults,
            ...data,
            related_event_id: data.related_event_id || '',
            is_featured: Boolean(data.is_featured),
          });
        } else {
          setForm({
            ...eventDefaults,
            ...data,
            start_at: toDateTimeLocal(data.start_at),
            end_at: toDateTimeLocal(data.end_at),
            is_online: Boolean(data.is_online),
            is_featured: Boolean(data.is_featured),
          });
        }
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.response?.data?.error || 'Не удалось загрузить публикацию');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [api, id, isNew, isNews]);

  const update = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const payload = () => {
    if (isNews) {
      return {
        title: form.title,
        slug: form.slug,
        excerpt: form.excerpt,
        body: form.body,
        cover_image_url: form.cover_image_url,
        category: form.category,
        status: form.status,
        is_featured: form.is_featured,
        related_event_id: form.related_event_id || null,
      };
    }
    return {
      title: form.title,
      slug: form.slug,
      summary: form.summary,
      description: form.description,
      event_type: form.event_type,
      cover_image_url: form.cover_image_url,
      start_at: fromDateTimeLocal(form.start_at),
      end_at: fromDateTimeLocal(form.end_at),
      is_online: form.is_online,
      location: form.location,
      online_url: form.online_url,
      status: form.status,
      is_featured: form.is_featured,
    };
  };

  const save = async (nextStatus) => {
    setSaving(true);
    setError('');
    try {
      const data = { ...payload(), ...(nextStatus ? { status: nextStatus } : {}) };
      const response = isNew ? await api.create(data) : await api.update(id, data);
      const saved = response.data;
      setForm(prev => ({ ...prev, ...saved, start_at: isNews ? prev.start_at : toDateTimeLocal(saved.start_at), end_at: isNews ? prev.end_at : toDateTimeLocal(saved.end_at) }));
      if (isNew) {
        navigate(`/marketing-panel/content/${type}/${saved.id}`, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Не удалось сохранить публикацию');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (isNew) return;
    if (!window.confirm('Удалить публикацию? Она пропадет из админки и с публичной страницы.')) return;
    setSaving(true);
    try {
      await api.delete(id);
      navigate(`/marketing-panel/content?tab=${type}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Не удалось удалить публикацию');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[28rem] items-center justify-center text-gray-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Загрузка редактора...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link to={`/marketing-panel/content?tab=${type}`} className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к публикациям
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Заполните материал так, чтобы он хорошо смотрелся в карточках, баннере и на детальной странице.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {publicPath && (
            <Link
              to={publicPath}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Eye className="mr-2 h-4 w-4" />
              Смотреть
            </Link>
          )}
          {!isNew && (
            <button
              type="button"
              onClick={remove}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-md border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Удалить
            </button>
          )}
          <button
            type="button"
            onClick={() => save()}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <Save className="mr-2 h-4 w-4" />
            Сохранить
          </button>
          <button
            type="button"
            onClick={() => save('published')}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Опубликовать
          </button>
        </div>
      </div>

      {error && <div className="rounded-md border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Заголовок">
              <input
                value={form.title}
                onChange={(event) => update('title', event.target.value)}
                className={inputClass}
                placeholder={isNews ? 'Например: Летний день питомцев' : 'Например: Встреча владельцев собак'}
              />
            </Field>
            <Field label="Slug" hint="Можно оставить пустым">
              <input
                value={form.slug || ''}
                onChange={(event) => update('slug', event.target.value)}
                className={inputClass}
                placeholder="summer-pet-day"
              />
            </Field>
          </div>

          <Field label={isNews ? 'Анонс' : 'Краткое описание'}>
            <textarea
              value={isNews ? form.excerpt : form.summary}
              onChange={(event) => update(isNews ? 'excerpt' : 'summary', event.target.value)}
              rows={3}
              className={inputClass}
              placeholder="Короткий текст для карточки и главного баннера"
            />
          </Field>

          <Field label={isNews ? 'Текст новости' : 'Описание мероприятия'}>
            <textarea
              value={isNews ? form.body : form.description}
              onChange={(event) => update(isNews ? 'body' : 'description', event.target.value)}
              rows={12}
              className={inputClass}
              placeholder="Основной текст публикации"
            />
          </Field>

          {!isNews && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Тип мероприятия">
                <select
                  value={form.event_type}
                  onChange={(event) => update('event_type', event.target.value)}
                  className={inputClass}
                >
                  {EVENT_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Формат">
                <select
                  value={form.is_online ? 'online' : 'offline'}
                  onChange={(event) => update('is_online', event.target.value === 'online')}
                  className={inputClass}
                >
                  <option value="offline">Офлайн</option>
                  <option value="online">Онлайн</option>
                </select>
              </Field>
              <Field label="Начало">
                <input
                  type="datetime-local"
                  value={form.start_at}
                  onChange={(event) => update('start_at', event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Окончание" hint="Если есть">
                <input
                  type="datetime-local"
                  value={form.end_at || ''}
                  onChange={(event) => update('end_at', event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label={form.is_online ? 'Название/платформа' : 'Место'}>
                <input
                  value={form.location}
                  onChange={(event) => update('location', event.target.value)}
                  className={inputClass}
                  placeholder={form.is_online ? 'Zoom, Telegram, YouTube' : 'Адрес или площадка'}
                />
              </Field>
              <Field label="Онлайн-ссылка" hint="Если нужна">
                <input
                  value={form.online_url}
                  onChange={(event) => update('online_url', event.target.value)}
                  className={inputClass}
                  placeholder="https://..."
                />
              </Field>
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Публикация</h2>
            <div className="mt-4 space-y-4">
              <Field label="Статус">
                <select
                  value={form.status}
                  onChange={(event) => update('status', event.target.value)}
                  className={inputClass}
                >
                  <option value="draft">Черновик</option>
                  <option value="published">Опубликовано</option>
                  {!isNews && <option value="cancelled">Отменено</option>}
                </select>
              </Field>
              <label className="flex items-start gap-3 rounded-md border border-primary-100 bg-primary-50 p-3">
                <input
                  type="checkbox"
                  checked={Boolean(form.is_featured)}
                  onChange={(event) => update('is_featured', event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span>
                  <span className="block text-sm font-medium text-gray-900">Показывать как баннер</span>
                  <span className="mt-1 block text-xs text-gray-500">Материал попадет в верхний промо-блок публичной страницы.</span>
                </span>
              </label>
              {isNews && (
                <Field label="Категория">
                  <input
                    value={form.category}
                    onChange={(event) => update('category', event.target.value)}
                    className={inputClass}
                    placeholder="Сообщество, здоровье, магазин"
                  />
                </Field>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center text-sm font-semibold text-gray-900">
              <Image className="mr-2 h-4 w-4 text-primary-600" />
              Обложка и баннер
            </h2>
            <Field label="URL изображения" hint="16:9 или шире">
              <input
                value={form.cover_image_url}
                onChange={(event) => update('cover_image_url', event.target.value)}
                className={inputClass}
                placeholder="https://..."
              />
            </Field>
            <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              {form.cover_image_url ? (
                <img src={form.cover_image_url} alt="" className="aspect-video w-full object-cover" />
              ) : (
                <div className="flex aspect-video flex-col items-center justify-center text-gray-400">
                  <Image className="h-8 w-8" />
                  <span className="mt-2 text-xs">Превью появится после URL</span>
                </div>
              )}
            </div>
          </div>

          {!isNews && (
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600 shadow-sm">
              <div className="flex items-center font-semibold text-gray-900">
                <CalendarDays className="mr-2 h-4 w-4 text-primary-600" />
                Напоминание
              </div>
              <p className="mt-2">
                После публикации мероприятие появится в списке и сможет сохраняться пользователями в календарь.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
