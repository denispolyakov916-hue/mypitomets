/**
 * Skeleton компонент для карточки товара
 * 
 * Показывается во время загрузки для улучшения perceived performance.
 * Имитирует структуру реальной карточки товара.
 */

function ProductCardSkeleton() {
  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-sm border border-white/20 flex flex-col h-full overflow-hidden animate-pulse">
      {/* Изображение товара - скелетон */}
      <div className="aspect-square bg-gradient-to-br from-primary-100 to-accent-100 relative">
        {/* Бейдж животного - скелетон */}
        <div className="absolute top-2 left-2 w-20 h-6 bg-white/70 rounded-lg" />
      </div>
      
      {/* Информация о товаре - скелетон */}
      <div className="flex-1 flex flex-col p-4">
        {/* Бренд */}
        <div className="h-3 w-16 bg-primary-100 rounded mb-2" />
        
        {/* Название - 2 строки */}
        <div className="h-4 w-full bg-gray-200 rounded mb-1" />
        <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
        
        {/* Категория */}
        <div className="h-3 w-20 bg-primary-50 rounded mb-2" />
        
        {/* Рейтинг */}
        <div className="flex gap-1 mb-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-4 h-4 bg-gray-200 rounded" />
          ))}
          <div className="h-4 w-8 bg-gray-100 rounded ml-2" />
        </div>
        
        {/* Цена и кнопка */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-primary-100/50">
          <div className="flex flex-col gap-1">
            <div className="h-6 w-20 bg-gray-200 rounded" />
          </div>
          <div className="h-9 w-24 bg-primary-100 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

/**
 * Сетка skeleton карточек
 * 
 * @param {number} count - Количество skeleton карточек
 */
export function ProductGridSkeleton({ count = 20 }) {
  return (
    <div className="grid responsive-grid gap-4">
      {[...Array(count)].map((_, index) => (
        <div
          key={index}
          style={{ 
            animationDelay: `${index * 0.05}s`,
            opacity: 0,
            animation: `fadeIn 0.3s ease-out ${index * 0.05}s forwards`
          }}
        >
          <ProductCardSkeleton />
        </div>
      ))}
    </div>
  )
}

export default ProductCardSkeleton
