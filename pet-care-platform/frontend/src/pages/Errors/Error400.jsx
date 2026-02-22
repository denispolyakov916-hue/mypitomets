import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { baseAnimations } from './errorAnimations'

/**
 * Страница ошибки 400 - Неверный запрос
 */
const Error400 = () => {
  const navigate = useNavigate()

  const config = {
    imageUrl: 'https://images.unsplash.com/photo-1426287658398-5a912ce1ed0a?w=640&q=80',
    imageAlt: 'Озадаченный питомец',
    homeUrl: '/',
    errorCode: '400',
    title: 'Неверный запрос',
    description: 'Сервер не смог понять ваш запрос. Проверьте правильность введённых данных и попробуйте снова.'
  }

  const animations = baseAnimations

  useEffect(() => {
    const title = document.querySelector('.error-400-title')
    if (title) {
      const text = title.textContent
      title.textContent = ''
      text.split('').forEach((char, index) => {
        const span = document.createElement('span')
        span.className = 'inline-block opacity-0 animate-letterFadeIn'
        span.innerHTML = char === ' ' ? '&nbsp;' : char
        span.style.animationDelay = `${0.4 + index * 0.05}s`
        title.appendChild(span)
      })
    }
  }, [])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 relative overflow-hidden font-[Nunito,sans-serif]">
      <motion.div 
        className="fixed inset-0 flex items-center justify-center text-[40vw] font-extrabold text-primary-500 z-0 leading-none pointer-events-none"
        initial={animations.backgroundNumber.initial}
        animate={animations.backgroundNumber.animate}
        transition={animations.backgroundNumber.transition}
      >
        {config.errorCode}
      </motion.div>

      <div className="text-center max-w-2xl mx-auto relative z-10">
        <motion.div 
          className="mb-12"
          initial={animations.image.initial}
          animate={animations.image.animate}
          transition={animations.image.transition}
        >
          <img 
            src={config.imageUrl} 
            alt={config.imageAlt} 
            className="w-64 h-64 object-cover rounded-full mx-auto border-4 border-gray-100"
          />
        </motion.div>

        <motion.h2 
          className="text-3xl font-bold text-gray-900 mb-4 inline-block error-400-title"
          initial={animations.title.initial}
          animate={animations.title.animate}
          transition={animations.title.transition}
        >
          {config.title}
        </motion.h2>

        <motion.p 
          className="text-lg text-gray-600 mb-12 max-w-md mx-auto"
          initial={animations.text.initial}
          animate={animations.text.animate}
          transition={animations.text.transition}
        >
          {config.description}
        </motion.p>

        <motion.div 
          className="flex gap-4 justify-center flex-wrap"
          initial={animations.buttons.initial}
          animate={animations.buttons.animate}
          transition={animations.buttons.transition}
        >
          <motion.button 
            className="transition-all duration-200 bg-primary-500 text-white px-8 py-3 rounded-full font-semibold"
            onClick={() => navigate('/')}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            На главную
          </motion.button>
          
          <motion.button 
            className="transition-all duration-200 bg-white text-gray-700 px-8 py-3 rounded-full font-semibold border-2 border-gray-200"
            onClick={() => window.history.back()}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            Назад
          </motion.button>
          
          <motion.button 
            className="transition-all duration-200 bg-accent-500 text-white px-8 py-3 rounded-full font-semibold"
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

export default Error400
