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
        case 'sales_by_category':
          // Используем данные продуктов для формирования графика продаж
          try {
            const productsResponse = await adminAPI.products.list({ page_size: 50 });
            const products = productsResponse.data?.results || [];
            
            // Формируем данные по категориям
            const categoryCount = products.reduce((acc, product) => {
              const category = product.category || 'other';
              acc[category] = (acc[category] || 0) + 1;
              return acc;
            }, {});

            responseData = {
              labels: Object.keys(categoryCount),
              datasets: [{
                data: Object.values(categoryCount),
                backgroundColor: [
                  'rgba(59, 130, 246, 0.8)',
                  'rgba(16, 185, 129, 0.8)',
                  'rgba(245, 158, 11, 0.8)',
                  'rgba(239, 68, 68, 0.8)',
                  'rgba(139, 92, 246, 0.8)'
                ].slice(0, Object.keys(categoryCount).length)
              }]
            };
          } catch (err) {
            throw new Error('Не удалось загрузить данные о товарах');
          }
          break;

        case 'user_activity':
          // Используем данные пользователей
          try {
            const usersResponse = await adminAPI.users.list({ page_size: 100 });
            const users = usersResponse.data?.results || [];
            const totalUsers = users.length;
            
            responseData = {
              labels: ['Всего пользователей', 'Активных', 'Администраторов'],
              datasets: [{
                label: 'Пользователи',
                data: [
                  totalUsers,
                  users.filter(u => u.is_active !== false).length,
                  users.filter(u => u.is_staff).length
                ],
                backgroundColor: [
                  'rgba(59, 130, 246, 0.8)',
                  'rgba(16, 185, 129, 0.8)',
                  'rgba(245, 158, 11, 0.8)'
                ]
              }]
            };
          } catch (err) {
            throw new Error('Не удалось загрузить данные о пользователях');
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

            responseData = {
              labels: Object.keys(statusCount).map(s => statusLabels[s] || s),
              datasets: [{
                data: Object.values(statusCount),
                backgroundColor: [
                  'rgba(245, 158, 11, 0.8)',
                  'rgba(59, 130, 246, 0.8)',
                  'rgba(139, 92, 246, 0.8)',
                  'rgba(16, 185, 129, 0.8)',
                  'rgba(239, 68, 68, 0.8)',
                  'rgba(107, 114, 128, 0.8)'
                ].slice(0, Object.keys(statusCount).length)
              }]
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

            responseData = {
              labels: Object.keys(speciesCount).map(s => 
                s === 'dog' ? 'Собаки' : s === 'cat' ? 'Кошки' : 'Другие'
              ),
              datasets: [{
                data: Object.values(speciesCount),
                backgroundColor: [
                  'rgba(59, 130, 246, 0.8)',
                  'rgba(16, 185, 129, 0.8)',
                  'rgba(245, 158, 11, 0.8)',
                  'rgba(239, 68, 68, 0.8)',
                  'rgba(139, 92, 246, 0.8)'
                ].slice(0, Object.keys(speciesCount).length)
              }]
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
                <div>
                  <span className="text-gray-600">Всего записей:</span>
                  <span className="ml-2 font-medium">{data.total || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Среднее значение:</span>
                  <span className="ml-2 font-medium">{data.average || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Максимум:</span>
                  <span className="ml-2 font-medium">{data.max || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Рост:</span>
                  <span className={`ml-2 font-medium ${data.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {data.growth ? `${data.growth > 0 ? '+' : ''}${data.growth}%` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default DrillDownModal;
