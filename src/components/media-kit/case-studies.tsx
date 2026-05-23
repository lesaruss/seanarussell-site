import type { MediaKitConfig } from '@/types/media-kit'

interface CaseStudiesProps {
  config: MediaKitConfig
}

export function CaseStudies({ config }: CaseStudiesProps) {
  return (
    <section className="case-studies">
      {config.caseStudies.map((study, idx) => (
        <div key={idx} className="case-study">
          <h3>{study.title}</h3>
          <p>{study.description}</p>
          <div className="metrics">
            {study.metrics.map((m, midx) => (
              <div key={midx} className="metric">
                <span className="metric-value">{m.value}</span>
                <span className="metric-label">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
