import type { MediaKitConfig } from '@/types/media-kit'

interface ExperienceProps {
  config: MediaKitConfig
}

export function Experience({ config }: ExperienceProps) {
  return (
    <section className="experience">
      <div className="timeline">
        {config.experience.map((exp, idx) => (
          <div key={idx} className="timeline-item">
            <div className="timeline-period">{exp.period}</div>
            <div className="timeline-content">
              <h3>{exp.title}</h3>
              <p>{exp.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
