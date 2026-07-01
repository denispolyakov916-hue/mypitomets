import LegalHtmlPage from './LegalHtmlPage'
import html from './content/sellers.html?raw'

export default function Sellers() {
  return (
    <LegalHtmlPage
      title="Информация о продавцах и партнёрах-продавцах"
      kicker="Продавцы и партнёры"
      ghost="⚖"
      updatedAt="25 мая 2026"
      html={html}
      related={[
        { to: '/offer', label: 'Публичная оферта' },
        { to: '/terms', label: 'Пользовательское соглашение' },
        { to: '/privacy', label: 'Политика конфиденциальности' },
      ]}
    />
  )
}
