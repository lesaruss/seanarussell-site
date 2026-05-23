import type { MediaKitConfig } from '@/types/media-kit'

interface SkillsProps {
  config: MediaKitConfig
}

export function Skills({ config }: SkillsProps) {
  return (
    <section className="skills">
      {config.skills.map((skillGroup, idx) => (
        <div key={idx} className="skill-group">
          <h3>{skillGroup.category}</h3>
          <div className="skill-items">
            {skillGroup.items.map((item, itemIdx) => (
              <span key={itemIdx} className="skill-tag">{item}</span>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
