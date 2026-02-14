import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { baseAnimations } from './errorAnimations'
import '../../styles/errors-common.css'

/**
 * Страница ошибки 404 - Страница не найдена
 * 
 * Использует framer-motion для базовых анимаций.
 * Место для будущих сложных анимаций отмечено комментариями.
 */
const Error404 = () => {
  const navigate = useNavigate()

  // Конфигурация страницы
  const config = {
    imageUrl: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=640&q=80',
    imageAlt: 'Пуф Пуфыч',
    homeUrl: '/',
    errorCode: '404',
    title: 'Страница не найдена',
    description: 'К сожалению, страница, которую вы ищете, не существует или была перемещена.'
  }

  // Анимации для разных элементов
  const animations = baseAnimations

  // Анимация букв в заголовке (можно улучшить позже с помощью framer-motion)
  useEffect(() => {
    const title = document.querySelector('.error-404-title')
    if (title) {
      const text = title.textContent
      title.textContent = ''
      text.split('').forEach((char, index) => {
        const span = document.createElement('span')
        span.className = 'letter'
        span.innerHTML = char === ' ' ? '&nbsp;' : char
        span.style.animationDelay = `${0.4 + index * 0.05}s`
        title.appendChild(span)
      })
    }
  }, [])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 relative overflow-hidden">
      {/* Большая цифра ошибки на фоне - с framer-motion */}
      <motion.div 
        className="error-number-bg"
        initial={animations.backgroundNumber.initial}
        animate={animations.backgroundNumber.animate}
        transition={animations.backgroundNumber.transition}
      >
        {config.errorCode}
      </motion.div>

      <div className="text-center max-w-2xl mx-auto relative z-10">
        {/* Изображение - с framer-motion */}
        <motion.div 
          className="mb-12"
          initial={animations.image.initial}
          animate={animations.image.animate}
          transition={animations.image.transition}
        >
          <img 
            src={config.imageUrl} 
            alt={config.imageAlt} 
            className="error-page-image mx-auto"
          />
          
          {/* МЕСТО ДЛЯ БУДУЩЕЙ АНИМАЦИИ ИЗОБРАЖЕНИЯ */}
          {/* Здесь можно добавить:
              - Анимацию покачивания (wiggleAnimation)
              - Пульсацию (pulseAnimation)
              - Эффект "дыхания" (breathingAnimation)
              - Реакцию на наведение (imageHoverAnimation)
              - Комплексную анимацию "живого питомца" (livingPetAnimation) */}
        </motion.div>

        {/* Заголовок - с framer-motion */}
        <motion.h2 
          className="text-3xl font-bold text-gray-900 mb-4 animate-title error-404-title"
          initial={animations.title.initial}
          animate={animations.title.animate}
          transition={animations.title.transition}
        >
          {config.title}
        </motion.h2>

        {/* Текст - с framer-motion */}
        <motion.p 
          className="text-lg text-gray-600 mb-12 max-w-md mx-auto"
          initial={animations.text.initial}
          animate={animations.text.animate}
          transition={animations.text.transition}
        >
          {config.description}
        </motion.p>

        {/* Кнопки - с framer-motion */}
        <motion.div 
          className="flex gap-4 justify-center flex-wrap"
          initial={animations.buttons.initial}
          animate={animations.buttons.animate}
          transition={animations.buttons.transition}
        >
          <motion.button 
            className="btn bg-purple-500 text-white px-8 py-3 rounded-full font-semibold"
            onClick={() => navigate('/')}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            На главную
          </motion.button>
          
          <motion.button 
            className="btn bg-white text-gray-700 px-8 py-3 rounded-full font-semibold border-2 border-gray-200"
            onClick={() => window.history.back()}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            Назад
          </motion.button>
          
          <motion.button 
            className="btn bg-orange-500 text-white px-8 py-3 rounded-full font-semibold"
            onClick={() => alert('Игра скоро появится! 🎮')}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            Сыграть в игру
          </motion.button>
        </motion.div>
      </div>
    </div>
  )
}

export default Error404
