/**
 * Главная страница - Landing Page
 * 
 * Концепция: Комплексная забота о здоровье питомцев через аналитику
 * 
 * Структура:
 * 1. Hero - Clear value proposition
 * 2. Проблема - Почему это важно
 * 3. 5 доменов благополучия питомца
 * 4. Функции платформы
 * 5. Статистика и факты
 * 6. CTA
 */

import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import PersonalRecommendations from '../components/PersonalRecommendations'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'

/**
 * 5 доменов благополучия питомца
 */
const welfareDomains = [
  {
    id: 1,
    icon: '🍽️',
    title: 'Питание',
    subtitle: 'Правильный рацион',
    color: 'from-emerald-500 to-teal-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    description: 'Питание — фундамент здоровья. 70% проблем со здоровьем связаны с неправильным кормлением.',
    features: [
      'Персональный расчёт нормы калорий',
      'Анализ состава корма',
      'Учёт аллергий и ограничений',
      'Рекомендации по возрасту и породе'
    ],
    stat: '70%',
    statLabel: 'проблем связано с питанием'
  },
  {
    id: 2,
    icon: '🏥',
    title: 'Здоровье',
    subtitle: 'Мониторинг и профилактика',
    color: 'from-rose-500 to-pink-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    description: 'Ранняя диагностика спасает жизни. Отслеживание изменений позволяет предотвратить критические состояния.',
    features: [
      'Дневник здоровья и веса',
      'Напоминания о прививках',
      'График посещений ветеринара',
      'Анализ динамики показателей'
    ],
    stat: '85%',
    statLabel: 'болезней можно предотвратить'
  },
  {
    id: 3,
    icon: '🏠',
    title: 'Среда обитания',
    subtitle: 'Комфортные условия',
    color: 'from-sky-500 to-blue-600',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200',
    description: 'Окружающая среда влияет на физическое и психическое здоровье питомца каждый день.',
    features: [
      'Рекомендации по обустройству',
      'Безопасность в доме',
      'Оптимальные условия содержания',
      'Сезонные советы по уходу'
    ],
    stat: '40%',
    statLabel: 'стресса от неправильных условий'
  },
  {
    id: 4,
    icon: '🎾',
    title: 'Активность',
    subtitle: 'Физическая нагрузка',
    color: 'from-amber-500 to-orange-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    description: 'Физическая активность критична для поддержания здорового веса и профилактики заболеваний.',
    features: [
      'Норма активности по породе',
      'Трекинг прогулок',
      'Игры и упражнения',
      'Курсы дрессировки'
    ],
    stat: '60%',
    statLabel: 'питомцев страдают от гиподинамии'
  },
  {
    id: 5,
    icon: '🧠',
    title: 'Ментальное здоровье',
    subtitle: 'Психологическое благополучие',
    color: 'from-violet-500 to-purple-600',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    description: 'Психическое здоровье так же важно, как физическое. Стресс ведёт к болезням и поведенческим проблемам.',
    features: [
      'Распознавание стресса',
      'Социализация и обучение',
      'Ментальная стимуляция',
      'Связь с поведением'
    ],
    stat: '45%',
    statLabel: 'проблем поведения от стресса'
  }
]

/**
 * Основные функции платформы
 */
const platformFeatures = [
  {
    icon: '🪪',
    title: 'Цифровой паспорт PetID',
    description: 'Полный профиль питомца с историей здоровья, прививками, аллергиями и особенностями в одном месте.',
    link: '/pet-id',
    color: 'purple'
  },
  {
    icon: '📊',
    title: 'Аналитика здоровья',
    description: 'Отслеживайте вес, питание, активность. Графики и тренды покажут отклонения раньше, чем появятся симптомы.',
    link: '/health-diary',
    color: 'rose'
  },
  {
    icon: '🍽️',
    title: 'Умный подбор корма',
    description: 'Персональные рекомендации на основе породы, возраста, веса и особенностей здоровья вашего питомца.',
    link: '/food-recommendation',
    color: 'emerald'
  },
  {
    icon: '🛒',
    title: 'Магазин с экспертизой',
    description: 'Только проверенные товары. Каждый продукт содержит полную информацию о составе и подходящих питомцах.',
    link: '/shop',
    color: 'amber'
  },
  {
    icon: '📚',
    title: 'Курсы от профессионалов',
    description: 'Обучение уходу, дрессировке и воспитанию от ветеринаров и кинологов в удобном видеоформате.',
    link: '/courses',
    color: 'sky'
  },
  {
    icon: '📅',
    title: 'Умный календарь',
    description: 'Напоминания о прививках, обработках, визитах к ветеринару. Никогда не пропустите важное.',
    link: '/calendar',
    color: 'violet'
  }
]

/**
 * Статистика
 */
const statistics = [
  { value: '70%', label: 'проблем со здоровьем связаны с питанием', icon: '🍽️' },
  { value: '85%', label: 'заболеваний можно предотвратить', icon: '🛡️' },
  { value: '3x', label: 'быстрее выявление отклонений', icon: '⚡' },
  { value: '24/7', label: 'доступ к данным о питомце', icon: '📱' }
]

/**
 * Анимированная волна для фона
 */
const AnimatedWave = ({ className, delay = 0 }) => (
  <motion.div
    className={className}
    animate={{ y: [0, -30, 0] }}
    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay }}
  >
    <svg width="100%" height="120" viewBox="0 0 1920 120" fill="none" preserveAspectRatio="none">
      <path
        d="M0,60 Q480,20 960,60 T1920,60"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity="0.1"
      />
    </svg>
  </motion.div>
)

/**
 * Карточка домена благополучия
 */
const DomainCard = ({ domain, index, isExpanded, onToggle }) => (
  <motion.div
    className={`relative overflow-hidden rounded-3xl border-2 ${domain.borderColor} ${domain.bgColor} cursor-pointer transition-all duration-500`}
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay: index * 0.1 }}
    viewport={{ once: true }}
    onClick={onToggle}
    whileHover={{ scale: 1.02, y: -5 }}
  >
    {/* Gradient overlay */}
    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${domain.color} opacity-10 rounded-full -translate-y-1/2 translate-x-1/2`} />
    
    <div className="p-6 sm:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${domain.color} flex items-center justify-center text-3xl shadow-lg`}>
            {domain.icon}
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Домен {domain.id}</span>
            <h3 className="text-xl font-bold text-gray-900">{domain.title}</h3>
            <p className="text-sm text-gray-500">{domain.subtitle}</p>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-black bg-gradient-to-br ${domain.color} bg-clip-text text-transparent`}>
            {domain.stat}
          </div>
          <p className="text-xs text-gray-500 max-w-[100px]">{domain.statLabel}</p>
        </div>
      </div>
      
      {/* Description */}
      <p className="text-gray-600 mb-4 leading-relaxed">{domain.description}</p>
      
      {/* Features */}
      <div className="grid grid-cols-2 gap-2">
        {domain.features.map((feature, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
            <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${domain.color}`} />
            {feature}
          </div>
        ))}
      </div>
    </div>
  </motion.div>
)

/**
 * Карточка функции платформы
 */
const FeatureCard = ({ feature, index }) => {
  const colorClasses = {
    purple: 'from-purple-500 to-purple-600 bg-purple-50 border-purple-200',
    rose: 'from-rose-500 to-rose-600 bg-rose-50 border-rose-200',
    emerald: 'from-emerald-500 to-emerald-600 bg-emerald-50 border-emerald-200',
    amber: 'from-amber-500 to-amber-600 bg-amber-50 border-amber-200',
    sky: 'from-sky-500 to-sky-600 bg-sky-50 border-sky-200',
    violet: 'from-violet-500 to-violet-600 bg-violet-50 border-violet-200'
  }
  
  const [gradient, bg, border] = colorClasses[feature.color].split(' ')
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true }}
    >
      <Link to={feature.link} className="block h-full">
        <motion.div
          className={`h-full p-6 rounded-2xl border ${border} ${bg} hover:shadow-xl transition-all duration-300 group`}
          whileHover={{ scale: 1.03, y: -5 }}
        >
          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
            {feature.icon}
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
            {feature.title}
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            {feature.description}
          </p>
          <div className="mt-4 flex items-center text-purple-600 font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
            Подробнее →
          </div>
        </motion.div>
      </Link>
    </motion.div>
  )
}

/**
 * Главный компонент страницы
 */
function Home() {
  const { isAuthenticated } = useAuthStore()
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  })
  
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95])

  return (
    <div className="overflow-hidden">
      {/* ========== HERO SECTION ========== */}
      <section 
        ref={heroRef}
        className="relative min-h-[90vh] flex items-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 text-white overflow-hidden"
      >
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Gradient orbs */}
          <motion.div
            className="absolute top-20 left-[10%] w-96 h-96 bg-purple-500/30 rounded-full blur-3xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-20 right-[10%] w-80 h-80 bg-orange-500/20 rounded-full blur-3xl"
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 10, repeat: Infinity, delay: 2 }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-3xl"
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          />
          
          {/* Grid pattern */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}
          />
          
          {/* Floating particles */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white/40 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -100, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 5 + Math.random() * 5,
                repeat: Infinity,
                delay: Math.random() * 5,
              }}
            />
          ))}
        </div>

        <motion.div 
          className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-20"
          style={{ opacity: heroOpacity, scale: heroScale }}
        >
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              {/* Badge */}
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-sm text-purple-200">Комплексная платформа для здоровья питомцев</span>
              </motion.div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-6 leading-tight">
                <span className="block">Здоровье питомца</span>
                <span className="block bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent">
                  под контролем
                </span>
              </h1>
              
              <p className="text-lg sm:text-xl text-purple-200 mb-8 leading-relaxed max-w-xl">
                Мы создаём нечто большее, чем сервис. Питомец+ — это персональный цифровой помощник, который станет вашим надёжным проводником в вопросах здоровья, питания и комфорта вашего друга.
              </p>
              
              {/* Key benefits */}
              <div className="flex flex-wrap gap-4 mb-10">
                {[
                  { icon: '📊', text: 'Аналитика здоровья' },
                  { icon: '🍽️', text: 'Умный подбор питания' },
                  { icon: '⏰', text: 'Экономия времени' }
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                  >
                    <span>{item.icon}</span>
                    <span className="text-sm font-medium">{item.text}</span>
                  </motion.div>
                ))}
              </div>
              
              {/* CTA Buttons */}
              <motion.div
                className="flex flex-col sm:flex-row gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                {isAuthenticated ? (
                  <>
                    <Link
                      to="/pet-id"
                      className="group px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl font-bold text-lg hover:shadow-2xl hover:shadow-orange-500/30 transition-all duration-300 text-center"
                    >
                      Мои питомцы
                      <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
                    </Link>
                    <Link
                      to="/health-diary"
                      className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl font-bold text-lg hover:bg-white/20 transition-all duration-300 text-center"
                    >
                      Дневник здоровья
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/register"
                      className="group px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl font-bold text-lg hover:shadow-2xl hover:shadow-orange-500/30 transition-all duration-300 text-center"
                    >
                      Начать бесплатно
                      <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
                    </Link>
                    <Link
                      to="/login"
                      className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl font-bold text-lg hover:bg-white/20 transition-all duration-300 text-center"
                    >
                      Войти в аккаунт
                    </Link>
                  </>
                )}
              </motion.div>
            </motion.div>
            
            {/* Right visual */}
            <motion.div
              className="relative hidden lg:block"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              {/* Placeholder for future animation - reserved space */}
              <div className="relative">
                <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 overflow-hidden" style={{ minHeight: '426px' }}>
                  {/* Image placeholder - cropped to object level */}
                  <img 
                    src="/purple-monster.png" 
                    alt="Pet character"
                    className="w-full h-full object-cover rounded-2xl"
                    style={{ 
                      width: '100%', 
                      height: '426px',
                      objectFit: 'cover',
                      objectPosition: 'center'
                    }}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
        
        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-white/30 flex justify-center pt-2">
            <motion.div
              className="w-1.5 h-1.5 bg-white rounded-full"
              animate={{ y: [0, 12, 0], opacity: [1, 0, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      {/* ========== 5 DOMAINS SECTION ========== */}
      <section className="py-24 bg-gradient-to-b from-gray-50 to-white relative">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center max-w-3xl mx-auto mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-block px-4 py-1 rounded-full bg-purple-100 text-purple-600 text-sm font-medium mb-4">
              Наш подход
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent">
                5 доменов благополучия
              </span>
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Комплексный научный подход к здоровью питомца. Каждый домен важен — 
              вместе они обеспечивают долгую и счастливую жизнь вашего любимца.
            </p>
          </motion.div>
          
          {/* Domains grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {welfareDomains.map((domain, index) => (
              <DomainCard key={domain.id} domain={domain} index={index} />
            ))}
            
            {/* Summary card */}
            <motion.div
              className="md:col-span-2 lg:col-span-1 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-8 text-white"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              viewport={{ once: true }}
            >
              <div className="text-5xl mb-4">🎯</div>
              <h3 className="text-2xl font-bold mb-4">Комплексный подход</h3>
              <p className="text-purple-200 mb-6 leading-relaxed">
                Питомец+ объединяет все 5 доменов в единую экосистему. Мы помогаем вам заботиться 
                о питомце системно, а не хаотично.
              </p>
              <Link
                to={isAuthenticated ? "/pet-id" : "/register"}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-600 rounded-xl font-bold hover:shadow-xl transition-all"
              >
                {isAuthenticated ? "Создать профиль питомца" : "Начать бесплатно"}
                <span>→</span>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ========== FEATURES SECTION ========== */}
      <section className="py-24 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center max-w-3xl mx-auto mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-block px-4 py-1 rounded-full bg-amber-100 text-amber-600 text-sm font-medium mb-4">
              Возможности
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              Всё необходимое в <span className="text-purple-600">одном месте</span>
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Цифровая экосистема, которая экономит ваше время и заботится о здоровье питомца 24/7
            </p>
          </motion.div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {platformFeatures.map((feature, index) => (
              <FeatureCard key={index} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* ========== PERSONAL RECOMMENDATIONS (for authenticated) ========== */}
      {isAuthenticated && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <PersonalRecommendations />
          </div>
        </section>
      )}

      {/* ========== FINAL CTA SECTION ========== */}
      <section className="py-24 bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 text-white relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl"
            animate={{ scale: [1, 1.3, 1], x: [0, 50, 0] }}
            transition={{ duration: 10, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl"
            animate={{ scale: [1.2, 1, 1.2], y: [0, -50, 0] }}
            transition={{ duration: 12, repeat: Infinity, delay: 2 }}
          />
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-3 mb-8">
              <span className="text-6xl">🐕</span>
              <span className="text-4xl">❤️</span>
              <span className="text-6xl">🐱</span>
            </div>
            
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              Здоровье питомца —<br />
              <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
                ваше спокойствие
              </span>
            </h2>
            
            <p className="text-xl text-purple-200 mb-10 max-w-2xl mx-auto leading-relaxed">
              Начните отслеживать здоровье вашего питомца сегодня. 
              Регистрация бесплатна, а первые результаты вы увидите уже через неделю.
            </p>
            
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              viewport={{ once: true }}
            >
              {isAuthenticated ? (
                <>
                  <Link
                    to="/pet-id"
                    className="group px-10 py-5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl font-bold text-xl hover:shadow-2xl hover:shadow-orange-500/30 transition-all"
                  >
                    Перейти к питомцам
                    <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
                  </Link>
                  <Link
                    to="/shop"
                    className="px-10 py-5 bg-white/10 backdrop-blur-sm border border-white/30 rounded-2xl font-bold text-xl hover:bg-white/20 transition-all"
                  >
                    Открыть магазин
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="group px-10 py-5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl font-bold text-xl hover:shadow-2xl hover:shadow-orange-500/30 transition-all"
                  >
                    Создать аккаунт бесплатно
                    <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
                  </Link>
                  <Link
                    to="/login"
                    className="px-10 py-5 bg-white/10 backdrop-blur-sm border border-white/30 rounded-2xl font-bold text-xl hover:bg-white/20 transition-all"
                  >
                    Уже есть аккаунт
                  </Link>
                </>
              )}
            </motion.div>
            
            <p className="mt-8 text-purple-300 text-sm">
              ✓ Бесплатная регистрация &nbsp;•&nbsp; ✓ Без скрытых платежей &nbsp;•&nbsp; ✓ Отмена в любое время
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

export default Home
