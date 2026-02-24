import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Link } from 'react-router-dom';

/**
 * Персонализированный список товаров для питомца
 * 
 * Учитывает:
 * - Породу (размер, энергию, риски здоровья)
 * - Возраст (puppy/adult/senior)
 * - Вес (диета/набор)
 * - Аллергии (исключение ингредиентов)
 * - Проблемы здоровья
 */
const PersonalizedProductsList = ({ petId, petData = null, category = null, limit = 12 }) => {
  const [products, setProducts] = useState([]);
  const [pet, setPet] = useState(petData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (petData) {
      setPet(petData);
    }
    loadPersonalizedProducts();
  }, [petId, category, petData]);

  const loadPersonalizedProducts = async () => {
    try {
      setLoading(true);

      let resolvedPet = petData || pet;
      if (!resolvedPet && petId) {
        const petResponse = await api.get(`/pets/${petId}/`);
        resolvedPet = petResponse;
        setPet(petResponse);
      }

      const params = {
        animal: resolvedPet?.species,
        pet_id: petId
      };
      
      if (category) {
        params.category = category;
      }
      
      const productsResponse = await api.get('/shop/products/', { params });
      const productsData = Array.isArray(productsResponse)
        ? productsResponse
        : Array.isArray(productsResponse?.results)
          ? productsResponse.results
          : [];

      if (productsData.length > 0 || !resolvedPet?.species) {
        setProducts(productsData);
      } else {
        const fallbackResponse = await api.get('/shop/products/', {
          params: { animal: resolvedPet.species, ...(category ? { category } : {}) }
        });
        const fallbackData = Array.isArray(fallbackResponse)
          ? fallbackResponse
          : Array.isArray(fallbackResponse?.results)
            ? fallbackResponse.results
            : [];
        setProducts(fallbackData);
      }
      setError(null);
    } catch (err) {
      setError(err?.message || 'Ошибка загрузки товаров');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 flex flex-col items-center justify-center min-h-[300px]">
        <div className="spinner"></div>
        <p>Подбираем товары для {pet?.name || 'вашего питомца'}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl p-10 text-center text-red-600">
        <p>⚠️ {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6">
      <div className="flex justify-between items-center mb-5 max-md:flex-col max-md:items-start max-md:gap-3">
        <h3 className="text-xl font-semibold text-gray-800">
          {pet?.breed
            ? `Рекомендовано для породы ${pet.breed}`
            : pet?.name
              ? `Товары для ${pet.name}`
              : 'Товары для вашего питомца'}
        </h3>
        {pet?.breed && (
          <div className="py-1.5 px-4 bg-gradient-to-br from-primary-500 to-primary-700 text-white rounded-[20px] text-[13px] font-medium">
            ✨ Персональный подбор
          </div>
        )}
      </div>

      {pet && pet.allergies && pet.allergies.length > 0 && (
        <div className="py-3 px-4 bg-warning-100 border-l-4 border-warning-400 rounded-md mb-4 text-sm text-yellow-800">
          <strong>⚠️ Исключены аллергены:</strong> {pet.allergies.join(', ')}
        </div>
      )}

      {pet && pet.health_issues && pet.health_issues.length > 0 && (
        <div className="py-3 px-4 bg-info-100 border-l-4 border-cyan-600 rounded-md mb-4 text-sm text-cyan-800">
          <strong>💊 Учтено здоровье:</strong> {pet.health_issues.join(', ')}
        </div>
      )}

      {products.length === 0 ? (
        <div className="py-[60px] px-5 text-center text-gray-500">
          <p>Пока нет подходящих товаров</p>
          <Link
            to="/shop"
            className="inline-block mt-4 py-2.5 px-6 bg-blue-500 text-white no-underline rounded-lg text-sm font-medium transition-all duration-200 hover:bg-blue-600 hover:scale-105"
          >
            Смотреть весь каталог
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4 md:gap-5 mt-5">
          {products.slice(0, limit).map((product) => (
            <div
              key={product.id}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 cursor-pointer hover:shadow-lg hover:-translate-y-1"
            >
              {product.images && product.images.length > 0 && (
                <div className="w-full h-[200px] overflow-hidden bg-gray-50 flex items-center justify-center">
                  <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                </div>
              )}
              
              <div className="p-4">
                <h4 className="mb-2 text-[15px] font-semibold text-gray-800 leading-[1.4] h-[42px] overflow-hidden line-clamp-2">
                  {product.name}
                </h4>
                
                {(product.brand?.name || product.brand_name) && (
                  <div className="text-[13px] text-gray-500 mb-3">
                    {product.brand?.name || product.brand_name}
                  </div>
                )}
                
                <div className="flex items-baseline gap-2 mb-4">
                  {product.compare_price && product.compare_price > product.price && (
                    <span className="text-sm text-gray-400 line-through">
                      {product.compare_price} ₽
                    </span>
                  )}
                  <span className="text-xl font-bold text-gray-800">
                    {product.price} ₽
                  </span>
                  {product.compare_price && product.compare_price > product.price && (
                    <span className="py-0.5 px-2 bg-red-500 text-white rounded-xl text-xs font-semibold">
                      -{Math.round((1 - product.price / product.compare_price) * 100)}%
                    </span>
                  )}
                </div>
                
                {product.is_available ? (
                  <button className="w-full py-2.5 bg-blue-500 text-white border-0 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 hover:bg-blue-600 hover:scale-[1.02]">
                    В корзину
                  </button>
                ) : (
                  <button className="w-full py-2.5 bg-gray-100 text-gray-400 border-0 rounded-lg text-sm font-semibold cursor-not-allowed" disabled>
                    Нет в наличии
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {products.length > limit && (
        <div className="mt-6 text-center">
          <Link
            to={`/shop?pet_id=${petId}`}
            className="inline-block py-3 px-8 bg-white text-blue-500 no-underline border-2 border-blue-500 rounded-lg text-[15px] font-semibold transition-all duration-200 hover:bg-blue-500 hover:text-white hover:scale-105"
          >
            Показать все товары для {pet?.name || 'вашего питомца'}
          </Link>
        </div>
      )}
    </div>
  );
};

export default PersonalizedProductsList;
