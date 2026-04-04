/**
 * Компонент уведомления/алерта
 *
 * Отображает блочное сообщение с иконкой и опциональным закрытием.
 *
 * @example
 * <Alert variant="error" title="Ошибка">
 *   Не удалось загрузить данные
 * </Alert>
 *
 * <Alert variant="success" dismissible onDismiss={handleClose}>
 *   Данные сохранены
 * </Alert>
 */

import { forwardRef, useState } from 'react'
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react'

const variantConfig = {
  error: {
    container: 'bg-red-50 border-red-200 text-red-800',
    icon: AlertCircle,
    iconColor: 'text-red-500',
  },
  success: {
    container: 'bg-green-50 border-green-200 text-green-800',
    icon: CheckCircle,
    iconColor: 'text-green-500',
  },
  warning: {
    container: 'bg-secondary-50 border-secondary-200 text-secondary-800',
    icon: AlertTriangle,
    iconColor: 'text-secondary-500',
  },
  info: {
    container: 'bg-primary-50 border-primary-200 text-primary-800',
    icon: Info,
    iconColor: 'text-primary-500',
  },
}

const Alert = forwardRef(({
  children,
  variant = 'info',
  title,
  dismissible = false,
  onDismiss,
  icon: CustomIcon,
  className = '',
  ...props
}, ref) => {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const config = variantConfig[variant] || variantConfig.info
  const IconComponent = CustomIcon || config.icon

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  return (
    <div
      ref={ref}
      role="alert"
      className={`flex gap-3 p-4 border rounded-lg ${config.container} ${className}`}
      {...props}
    >
      <IconComponent
        className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconColor}`}
        aria-hidden="true"
      />

      <div className="flex-1 min-w-0">
        {title && (
          <h4 className="font-semibold text-sm mb-1">{title}</h4>
        )}
        {children && (
          <div className="text-sm">{children}</div>
        )}
      </div>

      {dismissible && (
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 rounded-md hover:bg-black/5 transition-colors"
          aria-label="Закрыть"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
})

Alert.displayName = 'Alert'

export { Alert }
export default Alert
