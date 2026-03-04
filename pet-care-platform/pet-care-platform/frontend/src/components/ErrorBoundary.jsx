/**
 * Компонент Error Boundary
 * 
 * Перехватывает ошибки рендеринга в дочерних компонентах
 * и отображает fallback UI вместо белого экрана.
 * 
 * Использование:
 *   <ErrorBoundary>
 *     <YourComponent />
 *   </ErrorBoundary>
 */

import React from 'react'
import Error500 from '../pages/Errors/Error500'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    // Обновляем состояние для отображения fallback UI
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // Логируем ошибку для отладки
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // В продакшене можно отправлять ошибки в систему мониторинга
    if (process.env.NODE_ENV === 'production') {
      // TODO: Отправка ошибки в систему мониторинга (Sentry, LogRocket и т.д.)
      // Example: Sentry.captureException(error, { contexts: { react: errorInfo } })
    }
    
    this.setState({
      error,
      errorInfo
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      // Используем кастомную страницу ошибки 500
      // В режиме разработки показываем детали ошибки
      if (process.env.NODE_ENV === 'development' && this.state.error) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="text-6xl mb-4">😕</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Что-то пошло не так
              </h1>
              <p className="text-gray-600 mb-6">
                Произошла ошибка при загрузке страницы. Попробуйте обновить страницу.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={this.handleReset}
                  className="btn-primary"
                >
                  Попробовать снова
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="btn-secondary"
                >
                  На главную
                </button>
              </div>
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 mb-2">
                  Детали ошибки (только в режиме разработки)
                </summary>
                <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-48">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            </div>
          </div>
        )
      }
      
      // В продакшене используем красивую страницу ошибки
      return <Error500 />
    }

    return this.props.children
  }
}

export default ErrorBoundary

