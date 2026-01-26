import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Link } from 'react-router-dom';
import './PersonalizedProductsList.css';

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

      // Загружаем питомца (если не передан из родителя)
      let resolvedPet = petData || pet;
      if (!resolvedPet && petId) {
        const petResponse = await api.get(`/pets/${petId}/`);
        resolvedPet = petResponse;
        setPet(petResponse);
      }

      // Загружаем товары с учетом питомца
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
        // Фолбэк: убираем pet_id, оставляем только вид животного
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
      <div className="personalized-products loading">
        <div className="spinner"></div>
        <p>Подбираем товары для {pet?.name || 'вашего питомца'}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="personalized-products error">
        <p>⚠️ {error}</p>
      </div>
    );
  }

  return (
    <div className="personalized-products">
      <div className="products-header">
        <h3>
          {pet?.breed
            ? `Рекомендовано для породы ${pet.breed}`
            : pet?.name
              ? `Товары для ${pet.name}`
              : 'Товары для вашего питомца'}
        </h3>
        {pet?.breed && (
          <div className="personalization-badge">
            ✨ Персональный подбор
          </div>
        )}
      </div>

      {pet && pet.allergies && pet.allergies.length > 0 && (
        <div className="allergies-info">
          <strong>⚠️ Исключены аллергены:</strong> {pet.allergies.join(', ')}
        </div>
      )}

      {pet && pet.health_issues && pet.health_issues.length > 0 && (
        <div className="health-info">
          <strong>💊 Учтено здоровье:</strong> {pet.health_issues.join(', ')}
        </div>
      )}

      {products.length === 0 ? (
        <div className="no-products">
          <p>Пока нет подходящих товаров</p>
          <Link to="/shop" className="browse-all-btn">
            Смотреть весь каталог
          </Link>
        </div>
      ) : (
        <div className="products-grid">
          {products.slice(0, limit).map((product) => (
            <div key={product.id} className="product-card">
              {product.images && product.images.length > 0 && (
                <div className="product-image">
                  <img src={product.images[0]} alt={product.name} />
                </div>
              )}
              
              <div className="product-info">
                <h4 className="product-name">{product.name}</h4>
                
                {product.vendor && (
                  <div className="product-vendor">{product.vendor}</div>
                )}
                
                <div className="product-price">
                  {product.discount_percent > 0 && (
                    <span className="price-old">
                      {product.price} ₽
                    </span>
                  )}
                  <span className="price-current">
                    {product.discount_percent > 0
                      ? Math.round(product.price * (1 - product.discount_percent / 100))
                      : product.price} ₽
                  </span>
                  {product.discount_percent > 0 && (
                    <span className="discount-badge">-{product.discount_percent}%</span>
                  )}
                </div>
                
                {product.in_stock ? (
                  <button className="add-to-cart-btn">
                    В корзину
                  </button>
                ) : (
                  <button className="out-of-stock-btn" disabled>
                    Нет в наличии
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {products.length > limit && (
        <div className="show-more-section">
          <Link to={`/shop?pet_id=${petId}`} className="show-more-btn">
            Показать все товары для {pet?.name || 'вашего питомца'}
          </Link>
        </div>
      )}
    </div>
  );
};

export default PersonalizedProductsList;

