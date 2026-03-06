/**
 * Футер с главной (лендинга) — используется на всех страницах проекта.
 * Ссылки ведут на разделы приложения, соответствующие блокам главной.
 */

import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';

// Сервисы — соответствуют разделам главной (Питомцы, Питание, Здоровье, обучение)
const FOOTER_SERVICES = [
  { to: '/food-recommendation', label: 'Подбор питания' },
  { to: '/coming-soon?name=Подбор+питомца+для+вас', label: 'Подбор питомца для вас' },
  { to: '/courses', label: 'Обучающие курсы' },
  { to: '/pet-id', label: 'Мои питомцы' },
  { to: '/pet-id', label: 'Умный календарь' },
  { to: '/health-diary', label: 'Дневник здоровья' },
];

// Каталог — Магазин на главной
const FOOTER_CATALOG = [
  { to: '/shop', label: 'Корма и добавки' },
  { to: '/shop', label: 'Аксессуары' },
  { to: '/shop', label: 'Уход и гигиена' },
  { to: '/shop', label: 'Игрушки' },
];

// Компания — разделы о проекте (якоря на главной при переходе на /)
const FOOTER_COMPANY = [
  { to: '/#hero', label: 'О нас' },
  { to: '/', label: 'Блог' },
  { to: '/', label: 'Контакты' },
  { to: '/', label: 'Вакансии' },
];

// Документы
const FOOTER_DOCS = [
  { to: '/', label: 'Политика конфиденциальности' },
  { to: '/', label: 'Пользовательское соглашение' },
  { to: '/', label: 'Согласие на получение рекламы' },
  { to: '/', label: 'Согласие на обработку персональных данных' },
  { to: '/', label: 'Партнёрская оферта' },
];

const SOCIAL_LINKS = [
  { href: 'https://vk.com/pitometsplus', label: 'ВКонтакте', icon: VkIcon },
  { href: 'https://t.me/pitometsplus', label: 'Telegram', icon: TelegramIcon },
  { href: 'https://max.ru/', label: 'Макс', icon: MaxIcon },
  { href: 'https://rutube.ru/channel/74217640/', label: 'RuTube', icon: RutubeIcon },
  { href: 'https://www.tiktok.com/@pitometsplus', label: 'TikTok', icon: TikTokIcon },
];

function VkIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4 8.57 4 6.686c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.678.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V6.92c-.034-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.049.17.49-.085.744-.576.744z" />
    </svg>
  );
}

function TelegramIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l-.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.843.466 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z" />
    </svg>
  );
}

function MaxIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path fillRule="evenodd" d="M4 2h14q2 0 2 2v8q0 2-2 2h-4l-4 5v-5H4q-2 0-2-2V4q0-2 2-2zm8 8.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
    </svg>
  );
}

function RutubeIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  );
}

function TikTokIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

function FooterColumn({ title, links }) {
  return (
    <div className="md:col-span-1">
      <h4 className="font-semibold text-white mb-4">{title}</h4>
      <ul className="space-y-2.5 text-sm">
        {links.map(({ to, label }) => (
          <li key={label}>
            <Link
              to={to}
              className="text-white/90 hover:text-white transition-colors"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const [email, setEmail] = useState('');

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setEmail('');
  };

  return (
    <footer className="footer-landing bg-primary-700 text-white rounded-t-3xl overflow-hidden">
      <div className="border-t border-white/20" aria-hidden="true" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-8 md:gap-6">
          <div className="md:col-span-1">
            <p className="text-lg font-semibold text-white mb-3">2025-2026 © ПИТОМЕЦПЛЮС</p>
            <p className="text-sm text-white/80 leading-relaxed">
              Умная экосистема заботы о вашем питомце.
            </p>
          </div>
          <FooterColumn title="Сервисы" links={FOOTER_SERVICES} />
          <FooterColumn title="Каталог" links={FOOTER_CATALOG} />
          <FooterColumn title="Компания" links={FOOTER_COMPANY} />
          <FooterColumn title="Документы" links={FOOTER_DOCS} />

          <div className="md:col-span-2">
            <div className="footer-subscribe">
              <div className="footer-subscribe__text">
                <h4 className="font-semibold text-white mb-4">Подписаться</h4>
                <p className="text-sm mb-2 text-white/85">
                  Получайте новости о новых товарах, акциях и советах по уходу за питомцами.
                </p>
                <p className="text-xs text-white/75">
                  Подписываясь, вы соглашаетесь с нашей{' '}
                  <Link to="/" className="text-white/90 underline hover:text-white">
                    Политикой конфиденциальности
                  </Link>
                </p>
              </div>
              <div className="footer-subscribe__form">
                <form onSubmit={handleSubscribe} className="footer-subscribe__form-row">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Введите вашу эл. почту"
                    className="footer-subscribe__input"
                    aria-label="Email для подписки"
                  />
                  <button type="submit" className="footer-subscribe__btn">
                    Подписаться
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom border-t border-white/20 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {SOCIAL_LINKS.map(({ href, label, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-circle"
                aria-label={label}
                title={label}
              >
                <Icon className="w-6 h-6" />
              </a>
            ))}
            <span className="text-white/85 text-sm font-medium ml-2">@pitometsplus</span>
          </div>
          <button
            type="button"
            className="footer-scroll-top"
            onClick={scrollToTop}
            aria-label="Наверх"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
