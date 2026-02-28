import { Link } from 'react-router-dom';
import { Plane, Instagram } from 'lucide-react';
import { useState } from 'react';

import { Button } from './ui/Button';
import Input from './ui/Input';
import { useToastStore } from '../store/toastStore';

const FOOTER_LINKS = {
  shop: [{ to: '/shop', label: 'Магазин' }],
  learning: [
    { to: '/courses', label: 'Курсы' },
    { to: '/breeds', label: 'Породы' },
  ],
  account: [
    { to: '/pet-id', label: 'Мои питомцы' },
    { to: '/health-diary', label: 'Дневник здоровья' },
    { to: '/profile', label: 'Профиль' },
    { to: '/cart', label: 'Корзина' },
  ],
};

const SOCIAL_LINKS = [
  { href: 'https://t.me/pitomets_plus', icon: Plane, label: 'Telegram' },
  { href: 'https://instagram.com', icon: Instagram, label: 'Instagram' },
];

export function Footer() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const showToast = useToastStore(s => s.showToast);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast('Введите email для подписки', 'warning');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast('Введите корректный email', 'warning');
      return;
    }
    setIsSubmitting(true);
    showToast('Спасибо за подписку! Будем присылать новости и акции.', 'success');
    setEmail('');
    setIsSubmitting(false);
  };

  return (
    <footer className="bg-slate-50 border-t border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Лого и описание */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2 mb-3">
              <span className="text-2xl">🐾</span>
              <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">
                Питомец+
              </span>
            </Link>
            <p className="text-slate-600 text-sm leading-relaxed">
              Забота о питомцах: товары, курсы, породы и здоровье.
            </p>
          </div>

          {/* Магазин */}
          <div>
            <h3 className="text-slate-900 font-semibold text-sm mb-3">Магазин</h3>
            <ul className="space-y-2">
              {FOOTER_LINKS.shop.map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-slate-600 hover:text-primary-600 text-sm transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Обучение */}
          <div>
            <h3 className="text-slate-900 font-semibold text-sm mb-3">Обучение</h3>
            <ul className="space-y-2">
              {FOOTER_LINKS.learning.map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-slate-600 hover:text-primary-600 text-sm transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Личный кабинет */}
          <div>
            <h3 className="text-slate-900 font-semibold text-sm mb-3">Личный кабинет</h3>
            <ul className="space-y-2">
              {FOOTER_LINKS.account.map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-slate-600 hover:text-primary-600 text-sm transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Подписка */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <h3 className="text-slate-900 font-semibold text-sm mb-2">Новости и акции</h3>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <Input
                type="email"
                placeholder="Ваш email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-sm"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting}
              >
                Подписаться
              </Button>
            </form>
          </div>
        </div>

        {/* Нижняя строка */}
        <div className="mt-10 pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-xs">
            © {new Date().getFullYear()} Питомец+. Все права защищены.
          </p>
          <div className="flex items-center gap-4">
            {SOCIAL_LINKS.map(({ href, icon: Icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-primary-600 hover:border-primary-200 hover:bg-primary-50 transition-all"
                aria-label={label}
              >
                <Icon size={18} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
