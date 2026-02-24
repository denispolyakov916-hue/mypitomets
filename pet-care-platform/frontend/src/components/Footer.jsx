import { Facebook, Instagram, Plane } from 'lucide-react';
import { motion } from 'framer-motion';

export function Footer() {
  return (
    <footer className="bg-white border-t border-primary-100 relative overflow-hidden">
      {/* Floating decorative elements - dots and lines */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Dots */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={`dot-footer-${i}`}
            className={`absolute w-1.5 h-1.5 rounded-full ${
              i % 3 === 0 ? 'bg-primary-200' : i % 3 === 1 ? 'bg-accent-200' : 'bg-primary-100'
            }`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}

        {/* Floating wave lines */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={`line-footer-${i}`}
            className="absolute left-0 right-0"
            style={{
              top: `${15 + i * 25}%`,
            }}
            animate={{
              y: [0, -30, 0],
            }}
            transition={{
              duration: 20 + Math.random() * 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 5,
            }}
          >
            <svg
              width="100%"
              height="100"
              viewBox="0 0 1920 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
              style={{ overflow: 'visible' }}
            >
              <motion.path
                d="M0,50 Q240,20 480,50 T960,50 Q1200,20 1440,50 T1920,50"
                stroke={i % 2 === 0 ? 'url(#gradient-purple-footer)' : 'url(#gradient-orange-footer)'}
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                animate={{
                  opacity: [0.15, 0.3, 0.15],
                }}
                transition={{
                  duration: 5 + Math.random() * 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <defs>
                <linearGradient id="gradient-purple-footer" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#d9bfff" stopOpacity="1" />
                  <stop offset="50%" stopColor="#d9bfff" stopOpacity="1" />
                  <stop offset="100%" stopColor="#d9bfff" stopOpacity="1" />
                </linearGradient>
                <linearGradient id="gradient-orange-footer" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#F0EB93" stopOpacity="1" />
                  <stop offset="50%" stopColor="#F0EB93" stopOpacity="1" />
                  <stop offset="100%" stopColor="#F0EB93" stopOpacity="1" />
                </linearGradient>
              </defs>
            </svg>
          </motion.div>
        ))}
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8  py-16 relative z-10">
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-12">
          {/* Logo and Description */}
          <div className="lg:col-span-3">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-gradient-to-br from-primary-500 to-accent-500 p-2 rounded-xl shadow-lg">
                <span className="text-2xl">🐾</span>
              </div>
              <span className="text-2xl bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent font-bold">
                Питомец+
              </span>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              Полный спектр услуг для заботы о ваших питомцах. Профессиональный уход, качественные товары и забота с любовью.
            </p>
          </div>

          {/* Services Column */}
          <div className="lg:col-span-2">
            <h3 className="text-gray-900 mb-4 font-semibold">Сервисы</h3>
            <ul className="space-y-3">
              <li>
                <a href="#courses" className="text-gray-600 hover:text-primary-600 transition-colors duration-200 text-sm">
                  Обучающие курсы
                </a>
              </li>
              <li>
                <a href="#pets" className="text-gray-600 hover:text-primary-600 transition-colors duration-200 text-sm">
                  Мои питомцы
                </a>
              </li>
              <li>
                <a href="#health-diary" className="text-gray-600 hover:text-primary-600 transition-colors duration-200 text-sm">
                  Дневник здоровья
                </a>
              </li>
            </ul>
          </div>

          {/* Catalog Column */}
          <div className="lg:col-span-2">
            <h3 className="text-gray-900 mb-4 font-semibold">Каталог</h3>
            <ul className="space-y-3">
              <li>
                <a href="#shop" className="text-gray-600 hover:text-primary-600 transition-colors duration-200 text-sm">
                  Корма и добавки
                </a>
              </li>
              <li>
                <a href="#shop" className="text-gray-600 hover:text-primary-600 transition-colors duration-200 text-sm">
                  Аксессуары
                </a>
              </li>
              <li>
                <a href="#shop" className="text-gray-600 hover:text-primary-600 transition-colors duration-200 text-sm">
                  Уход и гигиена
                </a>
              </li>
              <li>
                <a href="#shop" className="text-gray-600 hover:text-primary-600 transition-colors duration-200 text-sm">
                  Игрушки
                </a>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div className="lg:col-span-2">
            <h3 className="text-gray-900 mb-4 font-semibold">Компания</h3>
            <ul className="space-y-3">
              <li>
                <a href="#about" className="text-gray-600 hover:text-primary-600 transition-colors duration-200 text-sm">
                  О нас
                </a>
              </li>
              <li>
                <a href="#blog" className="text-gray-600 hover:text-primary-600 transition-colors duration-200 text-sm">
                  Блог
                </a>
              </li>
              <li>
                <a href="#contacts" className="text-gray-600 hover:text-primary-600 transition-colors duration-200 text-sm">
                  Контакты
                </a>
              </li>
              <li>
                <a href="#careers" className="text-gray-600 hover:text-primary-600 transition-colors duration-200 text-sm">
                  Вакансии
                </a>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="lg:col-span-3">
            <h3 className="text-gray-900 mb-2 font-semibold">Подписаться</h3>
            <p className="text-gray-600 text-sm mb-4">
              Получайте новости о новых товарах, акциях и советах по уходу за питомцами.
            </p>
            <div className="flex flex-col gap-3">
              <input
                type="email"
                placeholder="Введите ваш email"
                className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-sm"
              />
              <button className="bg-gradient-to-r from-primary-500 to-accent-500 text-white px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-primary-500/30 transition-all duration-200 font-semibold">
                Подписаться
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Подписываясь, вы соглашаетесь с нашей{' '}
              <a href="#privacy" className="underline hover:text-primary-600">
                Политикой конфиденциальности
              </a>
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary-300 to-transparent mb-8" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Copyright and Links */}
          <div className="flex flex-col md:flex-row items-center gap-4 text-sm text-gray-600">
            <p>© 2024 Питомец+. Все права защищены.</p>
            <div className="flex gap-4">
              <a href="#privacy" className="hover:text-primary-600 transition-colors duration-200 underline">
                Конфиденциальность
              </a>
              <a href="#terms" className="hover:text-primary-600 transition-colors duration-200 underline">
                Условия
              </a>
              <a href="#cookies" className="hover:text-primary-600 transition-colors duration-200 underline">
                Cookies
              </a>
            </div>
          </div>

          {/* Social Links */}
          <div className="flex gap-3">
            <a
              href="https://t.me"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-white border border-primary-200 flex items-center justify-center hover:bg-gradient-to-r hover:from-primary-500 hover:to-accent-500 hover:border-transparent group transition-all duration-300 hover:shadow-lg"
            >
              <Plane size={20} className="group-hover:text-white transition-colors" />
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-white border border-primary-200 flex items-center justify-center hover:bg-gradient-to-r hover:from-primary-500 hover:to-accent-500 hover:border-transparent group transition-all duration-300 hover:shadow-lg"
            >
              <Instagram size={20} className="group-hover:text-white transition-colors" />
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-white border border-primary-200 flex items-center justify-center hover:bg-gradient-to-r hover:from-primary-500 hover:to-accent-500 hover:border-transparent group transition-all duration-300 hover:shadow-lg"
            >
              <Facebook size={20} className="group-hover:text-white transition-colors" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
