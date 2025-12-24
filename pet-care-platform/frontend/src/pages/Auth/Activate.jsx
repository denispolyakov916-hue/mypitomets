/**
 * Страница активации аккаунта по ссылке из email
 * 
 * Обрабатывает редирект с параметром auth_code и обменивает его на токены
 */

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import * as authApi from '../../api/auth'

/**
 * Страница активации аккаунта по ссылке из email
 * 
 * Обрабатывает редирект с параметром auth_code и обменивает его на токены
 */
function Activate() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setUser } = useAuthStore()
  const [status, setStatus] = useState('loading') // loading, success, error
  const [error, setError] = useState(null)

  useEffect(() => {
    const authCode = searchParams.get('auth_code')
    const activationError = searchParams.get('activation_error')
    const activationSuccess = searchParams.get('activation_success')

    if (activationError) {
      setStatus('error')
      setError('Ошибка активации. Попробуйте использовать код из письма.')
      return
    }

    if (activationSuccess && authCode) {
      // Обмениваем код на токены
      authApi.exchangeAuthCode(authCode)
        .then((response) => {
          setUser(response.user)
          setStatus('success')
          setTimeout(() => {
            navigate('/pets', { replace: true })
          }, 2000)
        })
        .catch((err) => {
          setStatus('error')
          setError(err.message || 'Ошибка получения токенов')
        })
    } else if (activationSuccess) {
      // Активация прошла, но кода нет (не должно случаться)
      setStatus('error')
      setError('Код активации не найден. Попробуйте войти в систему.')
    } else {
      // Нет параметров активации
      setStatus('error')
      setError('Некорректная ссылка активации')
    }
  }, [searchParams, navigate, setUser])

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Активация аккаунта...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-green-600 text-5xl mb-4">✓</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Аккаунт успешно активирован!
            </h1>
            <p className="text-gray-600">Перенаправление...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-red-600 text-5xl mb-4">✗</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Ошибка активации
            </h1>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => navigate('/login')}
              className="btn-primary"
            >
              Перейти к входу
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default Activate









