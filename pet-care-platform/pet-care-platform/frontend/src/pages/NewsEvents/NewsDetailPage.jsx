/**
 * Деталь новости (/news-events/news/:slug).
 */

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { BrandSection, BrandButton } from '../../components/brand'
import { getNewsBySlug, formatEventDate } from '../../api/events'

export default function NewsDetailPage() {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [state, setState] = useState('loading') // loading | ready | notfound

  useEffect(() => {
    let alive = true
    setState('loading')
    getNewsBySlug(slug)
      .then((r) => { if (alive) { setPost(r?.data || null); setState(r?.data ? 'ready' : 'notfound') } })
      .catch(() => { if (alive) setState('notfound') })
    return () => { alive = false }
  }, [slug])

  if (state === 'loading') {
    return <BrandSection><div className="flex justify-center py-16 text-primary-400"><Loader2 className="h-8 w-8 animate-spin" /></div></BrandSection>
  }
  if (state === 'notfound') {
    return (
      <BrandSection title="Новость не найдена">
        <BrandButton as={Link} to="/news-events" variant="outline" leftIcon={<ArrowLeft className="h-5 w-5" />}>К новостям</BrandButton>
      </BrandSection>
    )
  }

  return (
    <BrandSection bg="milk">
      <Link to="/news-events" className="mb-6 inline-flex items-center gap-1.5 text-sm text-primary-500 hover:text-primary-700">
        <ArrowLeft className="h-4 w-4" /> Все новости
      </Link>
      <article className="mx-auto max-w-3xl overflow-hidden rounded-3xl bg-white shadow-card">
        {post.cover_image_url && (
          <div className="aspect-[21/9] w-full overflow-hidden bg-primary-50">
            <img src={post.cover_image_url} alt={post.title} className="h-full w-full object-cover" />
          </div>
        )}
        <div className="flex flex-col gap-4 p-6 md:p-8">
          {post.category && <span className="text-sm font-medium text-primary-400">{post.category}</span>}
          <h1 className="font-heading text-2xl font-bold text-primary-900 md:text-3xl">{post.title}</h1>
          {post.published_at && <span className="text-sm text-primary-400">{formatEventDate(post.published_at, false)}</span>}
          {post.body && <div className="whitespace-pre-line leading-relaxed text-primary-700">{post.body}</div>}
          {post.related_event_slug && (
            <Link to={`/news-events/events/${post.related_event_slug}`} className="text-violet-500 hover:underline">
              → Связанное мероприятие
            </Link>
          )}
        </div>
      </article>
    </BrandSection>
  )
}
