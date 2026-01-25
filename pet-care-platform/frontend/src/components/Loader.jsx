/**
 * Компонент Loader
 * 
 * Спиннер загрузки для асинхронных операций.
 * Настраиваемый размер и цвет.
 * 
 * Props:
 *   size: 'sm' | 'md' | 'lg' (по умолчанию: 'md')
 *   className: Дополнительные CSS классы
 *   fullScreen: Если true, центрируется во viewport с оверлеем
 */

import PropTypes from 'prop-types'

/**
 * Компонент Loader с анимацией спиннера
 * 
 * Использует CSS анимацию для плавного вращения.
 * Может использоваться инлайн или как полноэкранный оверлей.
 */
function Loader({ size = 'md', className = '', fullScreen = false }) {
  // Маппинг классов размеров
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4'
  }
  
  const spinnerClass = `
    ${sizeClasses[size]}
    border-gray-200 
    border-t-primary-500 
    rounded-full 
    animate-spin
    ${className}
  `
  
  // Полноэкранный лоадер с оверлеем
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className={spinnerClass} />
      </div>
    )
  }
  
  // Инлайн лоадер
  return <div className={spinnerClass} />
}

/**
 * Компонент PageLoader
 * 
 * Центрированный лоадер для состояний загрузки страницы.
 * Занимает всю доступную высоту.
 */
export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader size="lg" />
    </div>
  )
}

/**
 * Компонент ButtonLoader
 * 
 * Маленький лоадер для состояний загрузки кнопок.
 * Обычно используется внутри кнопок.
 */
export function ButtonLoader() {
  return <Loader size="sm" className="border-white border-t-transparent" />
}

Loader.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
  fullScreen: PropTypes.bool,
}

export default Loader
