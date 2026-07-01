import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  CalendarDays, CheckCircle2, Eye, FileText, Megaphone, Newspaper, Pencil, Plus, RefreshCw, Search, Sparkles,
} from 'lucide-react';
import { adminAPI } from '../../admin/utils/api';

const TABS = [
  { value: 'news', label: 'Новости', icon: Newspaper },
  { value: 'events', label: 'Мероприятия', icon: CalendarDays },
];

const emptySummary = {
  news: { total: 0, published: 0, drafts: 0, featured: 0 },
  events: { total: 0, published: 0, drafts: 0, featured: 0, upcoming: 0 },
};

function unwrapList(response) {
  const payload = response?.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function formatDate(iso, withTime = false) {
  if (!iso) return 'Не задано';
  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  if (withTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  return new Date(iso).toLocaleString('ru-RU', options);
}

function StatusBadge({ status }) {
  const cfg = {
    published: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    draft: 'bg-amber-50 text-amber-700 ring-amber-200',
    cancelled: 'bg-rose-50 text-rose-700 ring-rose-200',
  };
  const labels = {
    published: 'Опубликовано',
    draft: 'Черновик',
    cancelled: 'Отменено',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${cfg[status] || cfg.draft}`}>
      {labels[status] || status}
    </span>
  );
}

function MetricCard({ icon: Icon, label, value, hint, color = 'primary', onClick }) {
  const palette = {
    primary: 'border-primary-200 bg-primary-50 text-primary-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    slate: 'border-slate-200 bg-white text-slate-700',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-28 rounded-lg border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${palette[color] || palette.primary}`}
    >
      <div className="flex items-center justify-between gap-3">
        <Icon className="h-5 w-5" />
        <span className="text-3xl font-bold">{value}</span>
      </div>
      <div className="mt-3 text-sm font-semibold text-gray-900">{label}</div>
      <div className="mt-1 text-xs text-gray-500">{hint}</div>
    </button>
  );
}

function ContentRow({ type, item, onPublish, onUnpublish }) {
  const isNews = type === 'news';
  const preview = isNews ? item.excerpt : item.summary;
  const publicPath = isNews ? `/news-events/news/${item.slug}` : `/news-events/events/${item.slug}`;
  const date = isNews ? item.published_at || item.created_at : item.start_at;

  return (
    <div className="grid gap-4 border-t border-gray-100 p-4 lg:grid-cols-[minmax(0,1fr)_9rem_9rem_12rem] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={item.status} />
          {item.is_featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 ring-1 ring-primary-200">
              <Sparkles className="h-3 w-3" />
              Баннер
            </span>
          )}
          <span className="text-xs text-gray-400">{isNews ? item.category || 'Без категории' : item.event_type_display}</span>
        </div>
        <Link
          to={`/marketing-panel/content/${type}/${item.id}`}
          className="mt-2 block truncate text-base font-semibold text-gray-900 hover:text-primary-700"
        >
          {item.title}
        </Link>
        <p className="mt-1 line-clamp-2 text-sm text-gray-500">{preview || 'Описание пока не заполнено'}</p>
      </div>

      <div className="text-sm text-gray-600">
        <div className="text-xs uppercase tracking-wide text-gray-400">{isNews ? 'Дата' : 'Начало'}</div>
        <div className="mt-1 font-medium">{formatDate(date, !isNews)}</div>
      </div>

      <div className="text-sm text-gray-600">
        <div className="text-xs uppercase tracking-wide text-gray-400">Обновлено</div>
        <div className="mt-1 font-medium">{formatDate(item.updated_at)}</div>
      </div>

      <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
        {item.status === 'published' ? (
          <button
            type="button"
            onClick={() => onUnpublish(item)}
            className="inline-flex items-center rounded-md border border-amber-200 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50"
          >
            В черновик
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onPublish(item)}
            className="inline-flex items-center rounded-md border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
          >
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            Опубликовать
          </button>
        )}
        <Link
          to={`/marketing-panel/content/${type}/${item.id}`}
          className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Править
        </Link>
        {item.status === 'published' && item.slug && (
          <Link
            to={publicPath}
            className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            Смотреть
          </Link>
        )}
      </div>
    </div>
  );
}

export default function MarketingContentList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'events' ? 'events' : 'news';
  const [tab, setTab] = useState(initialTab);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [summary, setSummary] = useState(emptySummary);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const activeApi = tab === 'news' ? adminAPI.marketing.news : adminAPI.marketing.events;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page_size: 100,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
      };
      const [summaryResponse, rowsResponse] = await Promise.all([
        adminAPI.marketing.summary(),
        activeApi.list(params),
      ]);
      setSummary(summaryResponse.data || emptySummary);
      setItems(unwrapList(rowsResponse));
    } catch (err) {
      console.error('[MarketingContentList] load error', err);
      setError(err.response?.data?.detail || err.response?.data?.error || 'Не удалось загрузить публикации');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeApi, search, statusFilter]);

  useEffect(() => {
    const timeout = setTimeout(loadData, 250);
    return () => clearTimeout(timeout);
  }, [loadData]);

  useEffect(() => {
    setSearchParams(tab === 'events' ? { tab: 'events' } : {});
  }, [tab, setSearchParams]);

  const metrics = useMemo(() => {
    const news = summary.news || emptySummary.news;
    const events = summary.events || emptySummary.events;
    return [
      { icon: Newspaper, label: 'Новости', value: news.total, hint: `${news.published} опубликовано`, color: 'slate', action: () => setTab('news') },
      { icon: CalendarDays, label: 'Мероприятия', value: events.total, hint: `${events.upcoming} впереди`, color: 'primary', action: () => setTab('events') },
      { icon: Megaphone, label: 'Баннеры', value: news.featured + events.featured, hint: 'Выведены на витрину', color: 'green', action: () => setStatusFilter('') },
      { icon: FileText, label: 'Черновики', value: news.drafts + events.drafts, hint: 'Нужно подготовить', color: 'amber', action: () => setStatusFilter('draft') },
    ];
  }, [summary]);

  const publish = async (item) => {
    await activeApi.publish(item.id);
    await loadData();
  };

  const unpublish = async (item) => {
    await activeApi.unpublish(item.id);
    await loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary-600">Контент и витрина</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">Новости и мероприятия</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Публикуйте последние новости, события и главные баннеры публичной страницы.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Обновить
          </button>
          <button
            type="button"
            onClick={() => navigate(`/marketing-panel/content/${tab}/new`)}
            className="inline-flex items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            {tab === 'news' ? 'Создать новость' : 'Создать мероприятие'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} onClick={metric.action} />
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex rounded-lg bg-gray-100 p-1">
            {TABS.map((item) => {
              const Icon = item.icon;
              const active = tab === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setTab(item.value);
                    setStatusFilter('');
                  }}
                  className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition ${
                    active ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-10 w-full rounded-md border border-gray-300 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 sm:w-72"
                placeholder="Поиск по заголовку"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 rounded-md border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              <option value="">Все статусы</option>
              <option value="draft">Черновики</option>
              <option value="published">Опубликованные</option>
              {tab === 'events' && <option value="cancelled">Отмененные</option>}
            </select>
          </div>
        </div>

        {error && (
          <div className="border-b border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}

        {loading ? (
          <div className="flex min-h-64 items-center justify-center text-gray-400">
            <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
            Загрузка публикаций...
          </div>
        ) : items.length ? (
          <div>
            {items.map((item) => (
              <ContentRow
                key={item.id}
                type={tab}
                item={item}
                onPublish={publish}
                onUnpublish={unpublish}
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center px-4 text-center">
            <Newspaper className="h-10 w-10 text-gray-300" />
            <h2 className="mt-4 text-lg font-semibold text-gray-900">Публикаций нет</h2>
            <p className="mt-1 max-w-md text-sm text-gray-500">
              Создайте первый материал, добавьте обложку и отметьте его как баннер, если он должен быть главным на странице.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
