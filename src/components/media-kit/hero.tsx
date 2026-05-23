import Image from 'next/image'
import type { MediaKitConfig } from '@/types/media-kit'

interface HeroProps {
  config: MediaKitConfig
}

export function Hero({ config }: HeroProps) {
  return (
    <section className="hero">
      <div className="hero-content">
        <div className="hero-text">
          <h1>{config.hero.name}</h1>
          <div className="hero-titles">
            {config.hero.titles.join(' • ')}
          </div>
          <p className="hero-tagline">{config.hero.tagline}</p>
        </div>
        <div className="hero-image">
          <img
            src={config.hero.portraitUrl}
            alt={config.hero.name}
            width={400}
            height={500}
          />
        </div>
      </div>
    </section>
  )
}
