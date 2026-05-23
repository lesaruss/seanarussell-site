import type { MediaKitConfig } from '@/types/media-kit'

interface ContactSidebarProps {
  config: MediaKitConfig
}

export function ContactSidebar({ config }: ContactSidebarProps) {
  return (
    <aside className="contact-sidebar">
      <div className="contact-item">
        <label className="contact-label">Email</label>
        <a href={`mailto:${config.contact.email}`} className="contact-value">
          {config.contact.email}
        </a>
      </div>
      <div className="contact-item">
        <label className="contact-label">Phone</label>
        <a href={`tel:${config.contact.phone}`} className="contact-value">
          {config.contact.phone}
        </a>
      </div>
      <div className="contact-item">
        <label className="contact-label">Location</label>
        <p className="contact-value">{config.contact.location}</p>
      </div>
      <div className="contact-item">
        <label className="contact-label">Disciplines</label>
        <div className="contact-disciplines">
          {config.contact.disciplines.map((d, idx) => (
            <span key={idx} className="discipline-tag">{d}</span>
          ))}
        </div>
      </div>
      <div className="contact-item">
        <label className="contact-label">Available For</label>
        <div className="contact-availability">
          {config.contact.availability.map((a, idx) => (
            <span key={idx} className="availability-tag">{a}</span>
          ))}
        </div>
      </div>
    </aside>
  )
}
