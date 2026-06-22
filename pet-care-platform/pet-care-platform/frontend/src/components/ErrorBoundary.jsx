/**
 * ErrorBoundary — перехватывает ошибки рендеринга и показывает безопасный
 * брендовый fallback (без хрупких зависимостей). В dev — детали ошибки.
 */
import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })
    // TODO: отправка в систему мониторинга (Sentry/LogRocket) в production
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV
    return (
      <div className="flex min-h-screen items-center justify-center bg-milk px-4">
        <div className="w-full max-w-md rounded-3xl border border-primary-100 bg-white p-8 text-center shadow-card">
          <h1 className="font-heading text-2xl font-bold text-primary-800">Что-то пошло не так</h1>
          <p className="mt-2 text-primary-500">Попробуйте обновить страницу или вернуться на главную.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => { this.handleReset(); window.location.href = '/' }}
              className="rounded-full bg-gold-400 px-6 py-2.5 font-heading font-semibold text-primary-800 shadow-gold-glow transition hover:brightness-105"
            >
              На главную
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full border-2 border-primary-300 px-6 py-2.5 font-heading font-semibold text-primary-700 transition hover:bg-primary-50"
            >
              Обновить страницу
            </button>
          </div>
          {isDev && this.state.error ? (
            <pre className="mt-6 max-h-56 overflow-auto rounded-xl bg-primary-50 p-3 text-left text-xs text-primary-700">
              {String(this.state.error?.stack || this.state.error)}
            </pre>
          ) : null}
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
