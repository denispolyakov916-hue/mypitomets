/**
 * Коллекция готовых анимаций для страниц ошибок
 * Используйте эти анимации, когда будете готовы их добавить
 */

// 1. Анимация "дыхания" для изображения питомца
export const breathingAnimation = {
  animate: {
    scale: [1, 1.05, 1],
  },
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut"
  }
}

// 2. Анимация покачивания (wiggle)
export const wiggleAnimation = {
  animate: {
    rotate: [0, -10, 10, -10, 10, 0],
  },
  transition: {
    duration: 0.5,
    repeat: Infinity,
    repeatDelay: 2,
    ease: "easeInOut"
  }
}

// 3. Анимация пульсации
export const pulseAnimation = {
  animate: {
    opacity: [0.5, 1, 0.5],
    scale: [1, 1.1, 1],
  },
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut"
  }
}

// 4. Анимация "появления из ниоткуда" для изображения
export const appearFromCenter = {
  initial: { 
    opacity: 0, 
    scale: 0,
    rotate: -180
  },
  animate: { 
    opacity: 1, 
    scale: 1,
    rotate: 0
  },
  transition: {
    type: "spring",
    stiffness: 200,
    damping: 15,
    duration: 0.8
  }
}

// 5. Анимация "волны" для фонового числа
export const waveNumberAnimation = {
  animate: {
    scale: [1, 1.1, 1],
    opacity: [0.08, 0.12, 0.08],
  },
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: "easeInOut"
  }
}

// 6. Анимация "летящих букв" для заголовка
export const flyingLetters = (index) => ({
  initial: { 
    opacity: 0, 
    y: -50,
    rotate: -180,
    scale: 0
  },
  animate: { 
    opacity: 1, 
    y: 0,
    rotate: 0,
    scale: 1
  },
  transition: {
    delay: index * 0.05,
    type: "spring",
    stiffness: 200,
    damping: 15
  }
})

// 7. Анимация "каскадного появления" для кнопок
export const cascadeButtons = (index) => ({
  initial: { 
    opacity: 0, 
    y: 30,
    scale: 0.8
  },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1
  },
  transition: {
    delay: 1.3 + (index * 0.1),
    type: "spring",
    stiffness: 200,
    damping: 15
  }
})

// 8. Анимация "реакции на наведение" для изображения
export const imageHoverAnimation = {
  whileHover: {
    scale: 1.1,
    rotate: [0, -5, 5, -5, 0],
    transition: {
      rotate: {
        duration: 0.5,
        repeat: Infinity,
        repeatType: "reverse"
      }
    }
  },
  whileTap: {
    scale: 0.95
  }
}

// 9. Комплексная анимация "живого питомца"
export const livingPetAnimation = {
  initial: { 
    opacity: 0, 
    scale: 0.5,
    rotate: -45
  },
  animate: { 
    opacity: 1, 
    scale: 1,
    rotate: 0,
    // Непрерывная анимация "дыхания"
    y: [0, -10, 0],
  },
  transition: {
    // Появление
    opacity: { duration: 0.8 },
    scale: { 
      type: "spring",
      stiffness: 200,
      damping: 15
    },
    rotate: { duration: 0.6 },
    // Дыхание (бесконечное)
    y: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
}

// 10. Базовые анимации для элементов страницы ошибки
export const baseAnimations = {
  // Анимация появления фонового числа
  backgroundNumber: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 0.08, scale: 1 },
    transition: { duration: 0.8, delay: 0.2, ease: "easeOut" }
  },
  
  // Анимация изображения
  image: {
    initial: { opacity: 0, scale: 0.8, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    transition: { duration: 0.8, ease: "easeOut" }
  },
  
  // Анимация заголовка
  title: {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay: 0.4, ease: "easeOut" }
  },
  
  // Анимация текста
  text: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay: 1.1, ease: "easeOut" }
  },
  
  // Анимация кнопок
  buttons: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay: 1.3, ease: "easeOut" }
  }
}
