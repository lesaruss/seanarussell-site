import type { MediaKitConfig } from '@/types/media-kit'

interface StatsProps {
  config: MediaKitConfig
}

export function Stats({ config }: StatsProps) {
  return (
    <section className="stats-grid">
      {config.stats.map((stat, idx) => (
        <div key={idx} className="stat">
          <div className="stat-value">{stat.value}</div>
          <div className="stat-label">{stat.label}</div>
        </div>
      ))}
    </section>
  )
}
