import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';

const ENERGY_LABELS = {
  very_low: 'Очень низкая',
  low: 'Низкая',
  medium: 'Средняя',
  moderate: 'Умеренная',
  high: 'Высокая',
  very_high: 'Очень высокая',
};

const SIZE_LABELS = {
  toy: 'Миниатюрный',
  tiny: 'Миниатюрный',
  small: 'Маленький',
  medium: 'Средний',
  large: 'Крупный',
  giant: 'Гигантский',
};

const getEnergyLabel = (level) => ENERGY_LABELS[level] || level;
const getSizeLabel = (size) => SIZE_LABELS[size] || size;

/** Строит список характеристик карточки, пропуская отсутствующие поля. */
const buildBreedStats = (breed) => {
  const stats = [];
  if (breed.size_category) {
    stats.push({ icon: '📏', text: getSizeLabel(breed.size_category) });
  }
  if (breed.energy_level) {
    stats.push({ icon: '⚡', text: getEnergyLabel(breed.energy_level) });
  }
  if (breed.weight_min != null || breed.weight_max != null) {
    stats.push({ icon: '⚖️', text: `${breed.weight_min ?? '?'}-${breed.weight_max ?? '?'} кг` });
  }
  if (breed.lifespan_min != null || breed.lifespan_max != null) {
    stats.push({ icon: '❤️', text: `${breed.lifespan_min}-${breed.lifespan_max} лет` });
  }
  return stats;
};

/** Строит список тегов карточки на основе булевых флагов породы. */
const buildBreedTags = (breed) =>
  [
    { key: 'apartment', show: breed.apartment_friendly, label: 'Для квартиры', cls: 'bg-blue-100 text-blue-700' },
    { key: 'novice', show: breed.good_for_novice, label: 'Для новичков', cls: 'bg-primary-100 text-primary-700' },
    { key: 'brachy', show: breed.brachycephalic, label: 'Брахицефал', cls: 'bg-accent-100 text-accent-700' },
  ].filter((tag) => tag.show);

/**
 * Карточка породы в каталоге. Все поля опциональны — рендерим только
 * то, что реально пришло из API (LIST-эндпоинт отдаёт подмножество).
 */
const BreedCard = ({ breed }) => (
  <Link
    to={`/breeds/${breed.slug || breed.id}`}
    className="bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden group"
  >
    {/* Заголовок карточки */}
    <div className={`p-4 ${breed.species === 'dog' ? 'bg-secondary-50' : 'bg-primary-50'}`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl">{breed.species === 'dog' ? '🐕' : '🐈'}</span>
        {breed.hypoallergenic && (
          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
            Гипоаллергенная
          </span>
        )}
      </div>
      <h3 className="font-semibold text-lg text-gray-800 mt-2 group-hover:text-primary-600 transition">
        {breed.name}
      </h3>
      {breed.name_en && <p className="text-sm text-gray-500">{breed.name_en}</p>}
    </div>

    {/* Характеристики */}
    <div className="p-4">
      {breed.short_description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-3">{breed.short_description}</p>
      )}

      <div className="grid grid-cols-2 gap-2 text-sm">
        {buildBreedStats(breed).map((stat) => (
          <div key={stat.icon} className="flex items-center text-gray-500">
            <span className="mr-1">{stat.icon}</span>
            {stat.text}
          </div>
        ))}
      </div>

      {/* Теги */}
      <div className="mt-3 flex flex-wrap gap-1">
        {buildBreedTags(breed).map((tag) => (
          <span key={tag.key} className={`px-2 py-0.5 ${tag.cls} text-xs rounded`}>
            {tag.label}
          </span>
        ))}
      </div>
    </div>
  </Link>
);

/**
 * Страница каталога пород
 */
const BreedsPage = () => {
  const [breeds, setBreeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    species: '',
    size: '',
    hypoallergenic: '',
    apartment_friendly: '',
    search: '',
  });

  useEffect(() => {
    fetchBreeds();
  }, [filters.species, filters.size, filters.hypoallergenic, filters.apartment_friendly]);

  const fetchBreeds = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.species) params.append('species', filters.species);
      if (filters.size) params.append('size', filters.size);
      if (filters.hypoallergenic) params.append('hypoallergenic', filters.hypoallergenic);
      if (filters.apartment_friendly) params.append('apartment_friendly', filters.apartment_friendly);
      if (filters.search) params.append('search', filters.search);

      const response = await api.get(`/pets/breeds/?${params.toString()}`);
      setBreeds(response.data.breeds || []);
      setError(null);
    } catch (err) {
      setError('Не удалось загрузить породы');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchBreeds();
  };

  const clearFilters = () => {
    setFilters({
      species: '',
      size: '',
      hypoallergenic: '',
      apartment_friendly: '',
      search: '',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Заголовок */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-600 text-white py-12">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Каталог пород</h1>
          <p className="text-primary-100 text-lg">
            Более 100 пород собак и кошек с подробной информацией
          </p>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Фильтры */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Поиск */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Поиск</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Название породы..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Вид */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Вид</label>
                <select
                  value={filters.species}
                  onChange={(e) => setFilters({ ...filters, species: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Все</option>
                  <option value="dog">Собаки</option>
                  <option value="cat">Кошки</option>
                </select>
              </div>

              {/* Размер */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Размер</label>
                <select
                  value={filters.size}
                  onChange={(e) => setFilters({ ...filters, size: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Все</option>
                  <option value="tiny">Миниатюрный</option>
                  <option value="small">Маленький</option>
                  <option value="medium">Средний</option>
                  <option value="large">Крупный</option>
                  <option value="giant">Гигантский</option>
                </select>
              </div>

              {/* Для квартиры */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Для квартиры</label>
                <select
                  value={filters.apartment_friendly}
                  onChange={(e) => setFilters({ ...filters, apartment_friendly: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Все</option>
                  <option value="true">Да</option>
                  <option value="false">Нет</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.hypoallergenic === 'true'}
                  onChange={(e) => setFilters({ ...filters, hypoallergenic: e.target.checked ? 'true' : '' })}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700">Гипоаллергенные</span>
              </label>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Сбросить
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                >
                  Найти
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Результаты */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-2/3 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center">
            {error}
          </div>
        ) : breeds.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-500 text-lg">Породы не найдены</p>
            <button
              onClick={clearFilters}
              className="mt-4 text-primary-600 hover:text-primary-800"
            >
              Сбросить фильтры
            </button>
          </div>
        ) : (
          <>
            <p className="text-gray-600 mb-4">Найдено: {breeds.length} пород</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {breeds.map((breed) => (
                <BreedCard key={breed.id} breed={breed} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BreedsPage;

