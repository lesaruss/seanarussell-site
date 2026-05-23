import { sarMediaKitConfig } from '@/config/media-kit.config';
import { Hero } from '@/components/media-kit/hero';
import { Stats } from '@/components/media-kit/stats';
import { ValuePropositions } from '@/components/media-kit/value-propositions';
import { CaseStudies } from '@/components/media-kit/case-studies';
import { Experience } from '@/components/media-kit/experience';
import { Skills } from '@/components/media-kit/skills';
import { ConnectedBrands } from '@/components/media-kit/connected-brands';
import { ContactSidebar } from '@/components/media-kit/contact-sidebar';
import { MediaAssets } from '@/components/media-kit/media-assets';
import { InquiryForm } from '@/components/media-kit/inquiry-form';
import '@/styles/media-kit.css';

export const metadata = {
  title: `${sarMediaKitConfig.hero.name} | Media Kit`,
  description: 'Professional media kit and collaboration information',
};

export default function MediaKitPage() {
  return (
    <main className="media-kit-container">
      <Hero config={sarMediaKitConfig.hero} />
      <Stats stats={sarMediaKitConfig.stats} />
      <ValuePropositions propositions={sarMediaKitConfig.valuePropositions} />
      <CaseStudies studies={sarMediaKitConfig.caseStudies} />
      <Experience periods={sarMediaKitConfig.experience} />
      <Skills categories={sarMediaKitConfig.skills} />
      <ConnectedBrands brands={sarMediaKitConfig.connectedTo} />
      
      <aside className="contact-sidebar">
        <ContactSidebar contact={sarMediaKitConfig.contact} />
      </aside>
      
      <section className="media-section">
        <h2>Media Assets</h2>
        <MediaAssets media={sarMediaKitConfig.media} />
      </section>
      
      <section className="inquiry-section">
        <h2>Collaboration Inquiry</h2>
        <InquiryForm config={sarMediaKitConfig.form} />
      </section>
    </main>
  );
}
