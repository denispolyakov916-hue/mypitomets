import React from 'react';
import { Link } from 'react-router-dom';

const TopProducts = ({ products }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">🏆 Топ товаров</h2>
        <Link
          to="/admin-panel/products"
          className="text-sm text-primary-600 hover:text-primary-800 font-medium"
        >
          Все товары →
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📦</div>
          <p>Нет данных о товарах</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product, index) => (
            <div
              key={product.id}
              className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {product.brand || 'Без бренда'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">
                  {product.orders_count} заказов
                </div>
                <div className="text-xs text-gray-500">
                  {product.is_available ? '✅ В наличии' : '⚠️ Нет в наличии'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TopProducts;
