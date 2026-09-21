import { useState, type ImgHTMLAttributes } from 'react'
import type { SeriesCard } from '../data/series1Cards'

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> & {
  card: Pick<SeriesCard, 'id' | 'name' | 'kind' | 'image'>
  alt?: string
}

export function CardArt({ card, alt, className, ...rest }: Props) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className={`card-art-fallback ${className ?? ''}`.trim()} role="img" aria-label={`${card.id} ${card.name}`}>
        <span className="card-art-fallback-crown">♛</span>
        <span className="card-art-fallback-id">{card.id}</span>
        <strong className="card-art-fallback-name">{card.name}</strong>
        <span className="card-art-fallback-kind">{card.kind}</span>
        <span className="card-art-fallback-note">ART COMING SOON</span>
      </div>
    )
  }

  return (
    <img
      {...rest}
      className={className}
      src={card.image}
      alt={alt ?? `${card.id} ${card.name}`}
      onError={() => setFailed(true)}
    />
  )
}
