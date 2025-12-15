/**
 * Компонент страницы магазина
 * 
 * Каталог товаров с возможностями фильтрации.
 * Функции:
 * - Сетка отображения товаров
 * - Фильтр по типу животного
 * - Фильтр по типу товара
 * - Функция добавления в корзину
 * - Состояния загрузки и ошибки
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProducts, PET_TYPE_OPTIONS, PRODUCT_TYPE_OPTIONS } from '../../api/shop'
import { useCartStore } from '../../store/cartStore'
import { useAuthStore } from '../../store/authStore'
import ProductCard from '../../components/ProductCard'
import { PageLoader } from '../../components/Loader'

/**
 * Компонент страницы магазина
 * 
 * Отображает каталог товаров с опциями фильтрации.
 * Обрабатывает добавление в корзину с проверкой аутентификации.
 */
function Shop() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const { addItem } = useCartStore()
  
  // Состояние
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    pet_type: '',
    product_type: ''
  })
  
  /**
   * Загрузка товаров при монтировании и изменении фильтров
   */
  useEffect(() => {
    fetchProducts()
  }, [filters])
  
  /**
   * Загрузка товаров из API
   */
  const fetchProducts = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await getProducts(filters)
      setProducts(response.products || [])
    } catch (err) {
      setError(err.message || 'Не удалось загрузить товары')
    } finally {
      setIsLoading(false)
    }
  }
  
  /**
   * Обработчик изменения фильтра
   */
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }))
  }
  
  /**
   * Обработчик добавления в корзину
   * Перенаправляет на страницу входа если не авторизован
   */
  const handleAddToCart = async (product) => {
    if (!isAuthenticated) {
      if (confirm('Для добавления в корзину необходимо войти в аккаунт. Перейти на страницу входа?')) {
        navigate('/login', { state: { from: { pathname: '/shop' } } })
      }
      return
    }
    
    const success = await addItem(product.id)
    if (success) {
      // Показать краткое уведомление об успехе
      alert('Товар добавлен в корзину')
    }
  }
  
  return (
    <div className="page-container animate-fadeIn">
      {/* Заголовок */}
      <div className="mb-8">
        <h1 className="page-title">Магазин кормов</h1>
        <p className="text-gray-600">
          Качественные корма для ваших питомцев с быстрой доставкой
        </p>
      </div>
      
      {/* Фильтры */}
      <div className="card mb-8">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Фильтр по типу животного */}
          <div className="flex-1">
            <label htmlFor="pet_type" className="label">
              Для кого
            </label>
            <select
              id="pet_type"
              value={filters.pet_type}
              onChange={(e) => handleFilterChange('pet_type', e.target.value)}
              className="input"
            >
              {PET_TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Фильтр по типу товара */}
          <div className="flex-1">
            <label htmlFor="product_type" className="label">
              Тип продукта
            </label>
            <select
              id="product_type"
              value={filters.product_type}
              onChange={(e) => handleFilterChange('product_type', e.target.value)}
              className="input"
            >
              {PRODUCT_TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Кнопка сброса фильтров */}
          {(filters.pet_type || filters.product_type) && (
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ pet_type: '', product_type: '' })}
                className="btn-secondary"
              >
                Сбросить фильтры
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Состояние загрузки */}
      {isLoading && <PageLoader />}
      
      {/* Состояние ошибки */}
      {error && !isLoading && (
        <div className="card text-center py-12">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={fetchProducts} className="btn-primary">
            Попробовать снова
          </button>
        </div>
      )}
      
      {/* Пустое состояние */}
      {!isLoading && !error && products.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Товары не найдены
          </h2>
          <p className="text-gray-600 mb-4">
            Попробуйте изменить параметры фильтра
          </p>
          <button
            onClick={() => setFilters({ pet_type: '', product_type: '' })}
            className="btn-primary"
          >
            Сбросить фильтры
          </button>
        </div>
      )}
      
      {/* Сетка товаров */}
      {!isLoading && !error && products.length > 0 && (
        <>
          <p className="text-gray-600 mb-4">
            Найдено товаров: {products.length}
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default Shop
