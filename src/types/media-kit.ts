export interface HeroSection {
  name: string;
  titles: string[];
  tagline: string;
  portraitUrl: string;
}

export interface Stat {
  value: string;
  label: string;
}

export interface ValueProposition {
  front: string;
  back: string;
}

export interface CaseStudy {
  title: string;
  description: string;
  metrics: Array<{
    label: string;
    value: string;
  }>;
}

export interface ExperiencePeriod {
  period: string;
  title: string;
  description: string;
}

export interface SkillCategory {
  category: string;
  items: string[];
}

export interface ConnectedBrand {
  name: string;
  logoUrl: string;
}

export interface MediaAsset {
  title: string;
  url: string;
}

export interface VideoAsset extends MediaAsset {
  embedUrl: string;
}

export interface PressItem {
  publication: string;
  url: string;
}

export interface ContactInfo {
  email: string;
  phone: string;
  location: string;
  disciplines: string[];
  availability: string;
}

export interface OpportunityType {
  value: string;
  label: string;
}

export interface FormConfig {
  opportunityTypes: OpportunityType[];
}

export interface MediaKitConfig {
  hero: HeroSection;
  stats: Stat[];
  valuePropositions: ValueProposition[];
  caseStudies: CaseStudy[];
  experience: ExperiencePeriod[];
  skills: SkillCategory[];
  connectedTo: ConnectedBrand[];
  media: {
    photos: MediaAsset[];
    videos: VideoAsset[];
    press: PressItem[];
  };
  contact: ContactInfo;
  form: FormConfig;
}
