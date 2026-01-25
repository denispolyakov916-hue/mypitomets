/**
 * Компонент страницы настроек пользователя
 * 
 * Позволяет редактировать:
 * - Email (с подтверждением)
 * - Имя и фамилию
 * - Телефон
 * - Адрес доставки по умолчанию
 */

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { PageLoader, ButtonLoader } from '../../components/Loader'
import api from '../../api/client'

/**
 * Компонент страницы Settings
 */
function Settings() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()
  
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    default_address: ''
  })
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  
  /**
   * Загрузка данных пользователя
   */
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    fetchUserData()
  }, [isAuthenticated])
  
  /**
   * Загрузка данных из API
   */
  const fetchUserData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await api.get('/users/profile/')
      const userData = response.user
      setFormData({
        email: userData.email || '',
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        phone: userData.phone || '',
        default_address: userData.default_address || ''
      })
    } catch (err) {
      setError(err.message || 'Не удалось загрузить данные')
    } finally {
      setIsLoading(false)
    }
  }
  
  /**
   * Обработчик изменения поля
   */
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setSuccess(false)
  }
  
  /**
   * Обработчик сохранения
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    setSuccess(false)
    
    try {
      await api.put('/users/profile/', formData)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message || 'Не удалось сохранить изменения')
    } finally {
      setIsSaving(false)
    }
  }
  
  if (isLoading) {
    return <PageLoader />
  }
  
  return (
    <div className="page-container animate-fadeIn">
      <div className="max-w-2xl mx-auto">
        {/* Ссылка назад */}
        <Link 
          to="/profile" 
          className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-6"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Назад в профиль
        </Link>
        
        {/* Заголовок */}
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Настройки профиля
        </h1>
        
        {/* Сообщения */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-600">
            Изменения успешно сохранены!
          </div>
        )}
        
        {/* Форма */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Учетная запись
            </h2>
            <div>
              <label htmlFor="email" className="label">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input"
                required
                disabled={isSaving}
              />
              <p className="text-xs text-gray-500 mt-1">
                Изменение email потребует подтверждения
              </p>
            </div>
          </div>
          
          {/* Персональные данные */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Персональные данные
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="first_name" className="label">
                    Имя
                  </label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    className="input"
                    placeholder="Ваше имя"
                    disabled={isSaving}
                  />
                </div>
                
                <div>
                  <label htmlFor="last_name" className="label">
                    Фамилия
                  </label>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    className="input"
                    placeholder="Ваша фамилия"
                    disabled={isSaving}
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="phone" className="label">
                  Телефон
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input"
                  placeholder="+7 (999) 123-45-67"
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>
          
          {/* Адрес доставки */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Адрес доставки по умолчанию
            </h2>
            
            <div>
              <label htmlFor="default_address" className="label">
                Адрес
              </label>
              <textarea
                id="default_address"
                name="default_address"
                value={formData.default_address}
                onChange={handleChange}
                className="input min-h-[100px]"
                placeholder="Город, улица, дом, квартира"
                disabled={isSaving}
              />
              <p className="text-xs text-gray-500 mt-1">
                Этот адрес будет использоваться по умолчанию при оформлении заказов
              </p>
            </div>
          </div>
          
          {/* Кнопки */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <ButtonLoader />
                  Сохранение...
                </>
              ) : (
                'Сохранить изменения'
              )}
            </button>
            
            <Link
              to="/profile"
              className="btn-secondary py-3 px-6"
            >
              Отмена
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Settings

