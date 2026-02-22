import React, { useState, useEffect } from 'react';

// Components
import Modal from '../../../components/ui/Modal';
import LineChart from '../Charts/LineChart';
import BarChart from '../Charts/BarChart';
import PieChart from '../Charts/PieChart';

// Utils
import { adminAPI } from '../../utils/api';

const DrillDownModal = ({
  isOpen,
  onClose,
  type,
  title,
  period = '30d'
}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(period);

  // Загрузка данных при открытии модального окна
  useEffect(() => {
    if (isOpen && type) {
      loadDrillDownData(type, selectedPeriod);
    }
  }, [isOpen, type, selectedPeriod]);

  const loadDrillDownData = async (drillType, period) => {
    setLoading(true);
    setError(null);

    try {
      let responseData = null;

      switch (drillType) {
        case 'sales_by_products':
          // Используем API аналитики для получения реальных данных о продажах по товарам
          try {
            const response = await adminAPI.analytics.sales_by_products({ period });
            responseData = response.data;
          } catch (err) {
            throw new Error('Не удалось загрузить данные о продажах по товарам');
          }
          break;

        case 'sales_by_category':
          // Используем API аналитики для получения реальных данных о продажах по категориям
          try {
            const response = await adminAPI.analytics.sales_by_category({ period });
            responseData = response.data;
          } catch (err) {
            throw new Error('Не удалось загрузить данные о продажах по категориям');
          }
          break;

        case 'user_activity':
          // Используем API аналитики для получения данных об активности пользователей
          try {
            const response = await adminAPI.analytics.user_activity_detail({ period });
            responseData = response.data;
          } catch (err) {
            throw new Error('Не удалось загрузить данные об активности пользователей');
          }
          break;

        case 'orders_delivery_analysis':
          // Используем API аналитики для получения данных о времени доставки и возвратах
          try {
            const response = await adminAPI.analytics.orders_delivery_analysis({ period });
            responseData = response.data;
          } catch (err) {
            throw new Error('Не удалось загрузить данные о времени доставки и возвратах');
          }
          break;

        case 'pets_by_breed':
          // Используем данные питомцев
          try {
            const petsResponse = await adminAPI.pets.list({ page_size: 100 });
            const pets = petsResponse.data?.results || [];

            const speciesCount = pets.reduce((acc, pet) => {
              const species = pet.species || 'other';
              acc[species] = (acc[species] || 0) + 1;
              return acc;
            }, {});

            const labels = Object.keys(speciesCount).map(s =>
              s === 'dog' ? 'Собаки' : s === 'cat' ? 'Кошки' : 'Другие'
            );

            responseData = {
              labels: labels,
              datasets: [{
                data: Object.values(speciesCount),
                backgroundColor: [
                  'rgba(59, 130, 246, 0.8)',
                  'rgba(16, 185, 129, 0.8)',
                  'rgba(245, 158, 11, 0.8)',
                  'rgba(239, 68, 68, 0.8)',
                  'rgba(139, 92, 246, 0.8)'
                ].slice(0, labels.length)
              }],
              total: labels.length
            };
          } catch (err) {
            throw new Error('Не удалось загрузить данные о питомцах');
          }
          break;

        default:
          throw new Error('Неизвестный тип drill-down');
      }

      setData(responseData);
    } catch (err) {
      console.error('Drill-down data load error:', err);
      setError(err.message || err.response?.data?.detail || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  // Функция для расчета дополнительных метрик
  const calculateMetrics = (data, type) => {
    if (!data) return { average: null, max: null, growth: null };

    switch (type) {
      case 'sales_by_products':
        // Метрики для товаров теперь берутся из summary в основном коде
        return { average: null, max: null, growth: null };

      case 'sales_by_category':
        // Метрики для категорий теперь берутся из summary в основном коде
        return { average: null, max: null, growth: null };

      case 'orders_delivery_analysis':
        // Для анализа доставки используем данные из summary
        if (data.summary) {
          return {
            average: data.summary.average_delivery_time || 0,
            max: null, // Не используем для этого типа
            growth: null // Не используем для этого типа
          };
        }
        break;

      case 'pets_by_breed':
        // Для питомцев по породам используем данные из datasets[0].data
        if (data.datasets && data.datasets[0] && data.datasets[0].data) {
          const petData = data.datasets[0].data;
          const sum = petData.reduce((acc, val) => acc + val, 0);
          const average = petData.length > 0 ? sum / petData.length : 0;
          const max = petData.length > 0 ? Math.max(...petData) : 0;

          const midPoint = Math.floor(petData.length / 2);
          const firstHalf = petData.slice(0, midPoint);
          const secondHalf = petData.slice(midPoint);

          const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((acc, val) => acc + val, 0) / firstHalf.length : 0;
          const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((acc, val) => acc + val, 0) / secondHalf.length : 0;

          const growth = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;

          return {
            average: Math.round(average),
            max: max,
            growth: Math.round(growth * 100) / 100
          };
        }
        break;

      default:
        return { average: null, max: null, growth: null };
    }

    return { average: null, max: null, growth: null };
  };

  const renderChart = () => {
    if (!data || loading) return null;

    const chartProps = {
      height: 400,
      className: 'w-full'
    };

    switch (type) {
      case 'sales_by_products':
        return (
          <BarChart
            {...chartProps}
            data={data}
            title="Топ товаров по продажам"
            horizontal={true}
          />
        );

      case 'sales_by_category':
        return (
          <PieChart
            {...chartProps}
            data={data}
            title="Продажи по категориям"
            type="doughnut"
            showPercentages={true}
          />
        );

      case 'user_activity':
        // Для user_activity возвращается объект с registrations_trend
        return (
          <LineChart
            {...chartProps}
            data={data.registrations_trend}
            title="Регистрации пользователей"
            fill={true}
          />
        );

      case 'orders_delivery_analysis':
        return (
          <div className="space-y-6">
            {/* График времени доставки */}
            {data.delivery_time_analysis && data.delivery_time_analysis.datasets &&
             data.delivery_time_analysis.datasets[0] &&
             data.delivery_time_analysis.datasets[0].data.some(value => value > 0) ? (
              <BarChart
                {...chartProps}
                data={data.delivery_time_analysis}
                title="Время доставки заказов"
                horizontal={false}
              />
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div style={{ height: `${chartProps.height}px` }} className="flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <div className="text-4xl mb-2">🚚</div>
                    <p className="font-medium">Время доставки заказов</p>
                    <p className="text-sm mt-1">Нет данных о времени доставки</p>
                    <p className="text-xs mt-2 text-gray-400">
                      У доставленных заказов не указана дата доставки
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* График возвратов */}
            <PieChart
              {...chartProps}
              data={data.returns_analysis}
              title="Анализ возвратов заказов"
              showPercentages={true}
            />
          </div>
        );

      case 'pets_by_breed':
        return (
          <PieChart
            {...chartProps}
            data={data}
            title="Распределение питомцев по видам"
            showPercentages={true}
          />
        );

      default:
        return <div>График не найден</div>;
    }
  };

  const getDrillDownTitle = () => {
    const titles = {
      sales_by_products: 'Продажи по товарам',
      sales_by_category: 'Продажи по категориям',
      user_activity: 'Активность пользователей',
      orders_delivery_analysis: 'Время доставки и возвраты',
      pets_by_breed: 'Распределение по породам'
    };
    return titles[type] || 'Детальная аналитика';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getDrillDownTitle()}
      size="xl"
      className="max-w-4xl"
    >
      <div className="p-6">
        {/* Настройки периода */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Период:</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="7d">7 дней</option>
              <option value="30d">30 дней</option>
              <option value="90d">90 дней</option>
              <option value="1y">1 год</option>
            </select>
          </div>

          <button
            onClick={() => loadDrillDownData(type, selectedPeriod)}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Загрузка...' : 'Обновить'}
          </button>
        </div>

        {/* Содержимое */}
        {loading && (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Загрузка данных...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-800 text-sm">{error}</div>
          </div>
        )}

        {!loading && !error && data && (
          <div className="space-y-6">
            {renderChart()}

            {/* Дополнительная информация */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Дополнительная информация</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {type === 'user_activity' ? (
                  <>
                    <div>
                      <span className="text-gray-600">Всего пользователей:</span>
                      <span className="ml-2 font-medium">{data.summary?.total_users || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Активных пользователей:</span>
                      <span className="ml-2 font-medium">{data.summary?.active_users || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Администраторов:</span>
                      <span className="ml-2 font-medium">{data.summary?.staff_users || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Супер-пользователей:</span>
                      <span className="ml-2 font-medium">{data.summary?.superuser_count || 'N/A'}</span>
                    </div>
                  </>
                ) : type === 'orders_delivery_analysis' ? (
                  // Специальная информация для анализа заказов
                  <>
                    <div>
                      <span className="text-gray-600">Всего заказов:</span>
                      <span className="ml-2 font-medium">{data.summary?.total_orders || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Доставлено:</span>
                      <span className="ml-2 font-medium text-green-600">{data.summary?.delivered_orders !== undefined ? data.summary.delivered_orders : 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Отменено:</span>
                      <span className="ml-2 font-medium text-red-600">{data.summary?.cancelled_orders !== undefined ? data.summary.cancelled_orders : 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Среднее время доставки:</span>
                      <span className="ml-2 font-medium">{data.summary?.average_delivery_time !== undefined ? `${data.summary.average_delivery_time} дней` : 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Процент доставки:</span>
                      <span className="ml-2 font-medium text-green-600">{data.summary?.delivery_rate !== undefined ? `${data.summary.delivery_rate.toFixed(1)}%` : 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Процент отмен:</span>
                      <span className="ml-2 font-medium text-red-600">{data.summary?.cancellation_rate !== undefined ? `${data.summary.cancellation_rate.toFixed(1)}%` : 'N/A'}</span>
                    </div>
                  </>
                ) : type === 'sales_by_category' ? (
                  // Специальные метрики для продаж по категориям
                  <>
                    <div>
                      <span className="text-gray-600">Общий объем продаж:</span>
                      <span className="ml-2 font-medium">
                        {data.summary?.total_sales ? `${data.summary.total_sales.toLocaleString()} ₽` : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Топ-категория:</span>
                      <span className="ml-2 font-medium">{data.summary?.top_category?.name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Доля топ-категории:</span>
                      <span className="ml-2 font-medium text-blue-600">
                        {data.summary?.top_category?.share_percentage !== undefined ? `${data.summary.top_category.share_percentage}%` : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Заказов в топ-категории:</span>
                      <span className="ml-2 font-medium">{data.summary?.top_category?.order_count || 'N/A'}</span>
                    </div>
                  </>
                ) : type === 'sales_by_products' ? (
                  // Специальные метрики для продаж по товарам
                  <>
                    <div>
                      <span className="text-gray-600">Общий объем продаж:</span>
                      <span className="ml-2 font-medium">
                        {data.summary?.total_sales ? `${data.summary.total_sales.toLocaleString()} ₽` : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Количество заказов:</span>
                      <span className="ml-2 font-medium">{data.summary?.total_orders || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Средний чек:</span>
                      <span className="ml-2 font-medium">
                        {data.summary?.average_check ? `${data.summary.average_check.toLocaleString()} ₽` : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Топ-товар:</span>
                      <span className="ml-2 font-medium">{data.summary?.top_product?.name || 'N/A'}</span>
                    </div>
                  </>
                ) : (
                  (() => {
                    const metrics = calculateMetrics(data, type);
                    return (
                      <>
                        <div>
                          <span className="text-gray-600">Всего записей:</span>
                          <span className="ml-2 font-medium">{data.total || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Среднее значение:</span>
                          <span className="ml-2 font-medium">
                            {metrics.average !== null ? (
                              type === 'sales_by_products' ?
                                `${metrics.average.toLocaleString()} ₽` :
                                metrics.average
                            ) : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Максимум:</span>
                          <span className="ml-2 font-medium">
                            {metrics.max !== null ? (
                              type === 'sales_by_products' ?
                                `${metrics.max.toLocaleString()} ₽` :
                                metrics.max
                            ) : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Рост:</span>
                          <span className={`ml-2 font-medium ${metrics.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {metrics.growth !== null ? `${metrics.growth > 0 ? '+' : ''}${metrics.growth}%` : 'N/A'}
                          </span>
                        </div>
                      </>
                    );
                  })()
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default DrillDownModal;
