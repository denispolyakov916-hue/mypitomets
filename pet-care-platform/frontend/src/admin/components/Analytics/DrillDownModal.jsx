import React, { useState, useEffect } from 'react';

// Components
import Modal from '../Forms/Modal';
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

        case 'orders_by_region':
          // Используем данные заказов по статусам
          try {
            const ordersResponse = await adminAPI.orders.list({ page_size: 100 });
            const orders = ordersResponse.data?.results || [];

            const statusCount = orders.reduce((acc, order) => {
              const status = order.status || 'pending';
              acc[status] = (acc[status] || 0) + 1;
              return acc;
            }, {});

            const statusLabels = {
              pending: 'Ожидает',
              processing: 'В обработке',
              shipped: 'Отправлен',
              delivered: 'Доставлен',
              cancelled: 'Отменён',
              expired: 'Истёк'
            };

            const labels = Object.keys(statusCount).map(s => statusLabels[s] || s);

            responseData = {
              labels: labels,
              datasets: [{
                data: Object.values(statusCount),
                backgroundColor: [
                  'rgba(245, 158, 11, 0.8)',
                  'rgba(59, 130, 246, 0.8)',
                  'rgba(139, 92, 246, 0.8)',
                  'rgba(16, 185, 129, 0.8)',
                  'rgba(239, 68, 68, 0.8)',
                  'rgba(107, 114, 128, 0.8)'
                ].slice(0, labels.length)
              }],
              total: labels.length
            };
          } catch (err) {
            throw new Error('Не удалось загрузить данные о заказах');
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
        // Для продаж по товарам используем данные о продажах в рублях (первый датасет)
        if (data.datasets && data.datasets[0] && data.datasets[0].data) {
          const salesData = data.datasets[0].data;
          const sum = salesData.reduce((acc, val) => acc + val, 0);
          const average = salesData.length > 0 ? sum / salesData.length : 0;
          const max = salesData.length > 0 ? Math.max(...salesData) : 0;

          // Расчет роста: сравнение первой и второй половины данных
          const midPoint = Math.floor(salesData.length / 2);
          const firstHalf = salesData.slice(0, midPoint);
          const secondHalf = salesData.slice(midPoint);

          const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((acc, val) => acc + val, 0) / firstHalf.length : 0;
          const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((acc, val) => acc + val, 0) / secondHalf.length : 0;

          const growth = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;

          return {
            average: Math.round(average),
            max: Math.round(max),
            growth: Math.round(growth * 100) / 100
          };
        }
        break;

      case 'sales_by_category':
        // Для продаж по категориям используем данные из datasets[0].data
        if (data.datasets && data.datasets[0] && data.datasets[0].data) {
          const salesData = data.datasets[0].data;
          const sum = salesData.reduce((acc, val) => acc + val, 0);
          const average = salesData.length > 0 ? sum / salesData.length : 0;
          const max = salesData.length > 0 ? Math.max(...salesData) : 0;

          // Расчет роста аналогично
          const midPoint = Math.floor(salesData.length / 2);
          const firstHalf = salesData.slice(0, midPoint);
          const secondHalf = salesData.slice(midPoint);

          const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((acc, val) => acc + val, 0) / firstHalf.length : 0;
          const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((acc, val) => acc + val, 0) / secondHalf.length : 0;

          const growth = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;

          return {
            average: Math.round(average),
            max: Math.round(max),
            growth: Math.round(growth * 100) / 100
          };
        }
        break;

      case 'orders_by_region':
        // Для заказов по регионам используем данные из datasets[0].data
        if (data.datasets && data.datasets[0] && data.datasets[0].data) {
          const orderData = data.datasets[0].data;
          const sum = orderData.reduce((acc, val) => acc + val, 0);
          const average = orderData.length > 0 ? sum / orderData.length : 0;
          const max = orderData.length > 0 ? Math.max(...orderData) : 0;

          const midPoint = Math.floor(orderData.length / 2);
          const firstHalf = orderData.slice(0, midPoint);
          const secondHalf = orderData.slice(midPoint);

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

      case 'orders_by_region':
        return (
          <BarChart
            {...chartProps}
            data={data}
            title="Заказы по статусам"
            horizontal={false}
          />
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
      orders_by_region: 'Заказы по регионам',
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
                              type === 'sales_by_products' || type === 'sales_by_category' ?
                                `${metrics.average.toLocaleString()} ₽` :
                                metrics.average
                            ) : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Максимум:</span>
                          <span className="ml-2 font-medium">
                            {metrics.max !== null ? (
                              type === 'sales_by_products' || type === 'sales_by_category' ?
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
