import LegalHtmlPage from './LegalHtmlPage'
import html from './content/cookie.html?raw'

export default function CookieConsent() {
  return (
    <LegalHtmlPage
      title="Согласие на обработку данных с использованием cookie и веб-аналитики"
      kicker="Cookie и аналитика"
      ghost="◉"
      html={html}
      related={[
        { to: '/privacy', label: 'Политика конфиденциальности' },
        { to: '/consent', label: 'Согласие на обработку ПДн' },
        { to: '/marketing-consent', label: 'Согласие на рекламные сообщения' },
        { to: '/terms', label: 'Пользовательское соглашение' },
      ]}
    />
  )
}
