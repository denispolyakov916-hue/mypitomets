const escapeXml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const normalizeText = (value, fallback) => {
  const text = String(value || fallback || '').trim()
  return text.length > 0 ? text : String(fallback || '')
}

export const getCardPlaceholderImage = ({
  title,
  subtitle,
  emoji = '🐾',
  accent = '#f97316',
  bgStart = '#fff7ed',
  bgEnd = '#fffbeb',
}) => {
  const safeTitle = escapeXml(normalizeText(title, 'Нет фото')).slice(0, 32)
  const safeSubtitle = escapeXml(normalizeText(subtitle, 'Скоро появится')).slice(0, 36)
  const safeEmoji = escapeXml(normalizeText(emoji, '🐾')).slice(0, 4)

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${bgStart}" />
          <stop offset="100%" stop-color="${bgEnd}" />
        </linearGradient>
        <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${accent}" stop-opacity="0.18" />
          <stop offset="100%" stop-color="${accent}" stop-opacity="0.36" />
        </linearGradient>
      </defs>
      <rect width="600" height="600" rx="40" fill="url(#bg)" />
      <circle cx="120" cy="110" r="80" fill="url(#accent)" />
      <circle cx="520" cy="470" r="120" fill="url(#accent)" />
      <rect x="140" y="170" width="320" height="260" rx="28" fill="#ffffff" fill-opacity="0.9" stroke="${accent}" stroke-opacity="0.18" />
      <text x="300" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-size="64">${safeEmoji}</text>
      <text x="300" y="382" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" fill="#374151">${safeTitle}</text>
      <text x="300" y="418" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#6b7280">${safeSubtitle}</text>
    </svg>
  `

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
