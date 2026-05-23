/**
 * SAR Media Kit Configuration
 *
 * This is the single source of truth for all media kit content.
 * Update values here and they propagate through all sections automatically.
 */

export const sarMediaKitConfig = {
  brand: {
    name: 'Sean A. Russell',
    colors: {
      primary: '#1A1A1A',
      accent: '#F69820',
      neutral: '#555555',
      light: '#F5F5F5',
    },
  },

  hero: {
    name: 'Sean A. Russell',
    titles: ['Brand Strategist', 'Founder, LESARUSS', 'Entrepreneur'],
    tagline: 'Building systems that build systems. Helping visionary founders scale their impact.',
    portraitUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
  },

  stats: [
    { label: 'Years Building', value: '15+' },
    { label: 'Founders Guided', value: '100+' },
    { label: 'Ventures Led', value: '8' },
  ],

  valuePropositions: [
    {
      title: 'Strategic Direction',
      description: 'Clear roadmap from vision to market. I help you navigate the complexity of building and scaling.',
    },
    {
      title: 'Systems Thinking',
      description: 'Not just tactics. I build repeatable systems that scale without burning out your team.',
    },
    {
      title: 'Founder Experience',
      description: 'Built 8 brands in the LESARUSS universe. I know what works and what doesn\'t.',
    },
    {
      title: 'Execution Focus',
      description: 'Plans don\'t matter without execution. I hold myself and teams accountable to results.',
    },
    {
      title: 'Multi-Brand Expertise',
      description: 'From product to positioning, from launch to scale. Generalist operator, not specialist consultant.',
    },
    {
      title: 'Community First',
      description: 'Build with your audience, not at them. Community becomes your moat.',
    },
  ],

  caseStudies: [
    {
      title: 'LESARUSS Project',
      description: 'Launched a full brand-building operating system with DIY, Guided, and Done For You tiers.',
      metrics: [
        { label: 'Launch', value: 'May 2026' },
        { label: 'Tiers', value: '3' },
        { label: 'Status', value: 'Active Growth' },
      ],
    },
    {
      title: 'Vegans Explore',
      description: 'Community-first platform connecting plant-based entrepreneurs across cities.',
      metrics: [
        { label: 'Members', value: '10K+' },
        { label: 'Cities', value: '8' },
        { label: 'Monthly Revenue', value: '$25K+' },
      ],
    },
    {
      title: 'ADA Unlocked',
      description: 'Accessibility education platform for schools and districts.',
      metrics: [
        { label: 'Students Reached', value: '5K+' },
        { label: 'Districts', value: '12+' },
        { label: 'Impact', value: 'Growing' },
      ],
    },
    {
      title: 'K12 Unlocked',
      description: 'Educational tech platform serving students, teachers, and districts.',
      metrics: [
        { label: 'Schools', value: '30+' },
        { label: 'Teachers', value: '500+' },
        { label: 'Students', value: '15K+' },
      ],
    },
  ],

  experience: [
    {
      period: '2023—Present',
      title: 'Founder, LESARUSS',
      description: 'Building the LESARUSS universe: brand-building system, multiple sub-brands, community platform, and academy.',
    },
    {
      period: '2020—2023',
      title: 'Founder, Vegans Explore',
      description: 'Launched and scaled a community platform connecting plant-based entrepreneurs and individuals.',
    },
    {
      period: '2018—2020',
      title: 'Senior Digital Strategist',
      description: 'Led digital transformation for multiple B2B and B2C brands.',
    },
  ],

  skills: [
    {
      category: 'Strategy',
      items: ['Brand positioning', 'Market analysis', 'Product strategy', 'Growth planning'],
    },
    {
      category: 'Operations',
      items: ['Systems design', 'Team building', 'Process automation', 'Scaling playbooks'],
    },
    {
      category: 'Technology',
      items: ['Full-stack development', 'No-code tools', 'Data analysis', 'AI integration'],
    },
  ],

  connectedTo: [
    {
      name: 'Vegans Explore',
      logo: 'https://images.unsplash.com/photo-1557804506-669714d2e66e',
    },
    {
      name: 'K12 Unlocked',
      logo: 'https://images.unsplash.com/photo-1516321318423-f06f70f504de',
    },
    {
      name: 'ADA Unlocked',
      logo: 'https://images.unsplash.com/photo-1552664730-d307ca884978',
    },
    {
      name: 'GeekFon Society',
      logo: 'https://images.unsplash.com/photo-1511379938547-c1f69b13d835',
    },
  ],

  media: {
    photos: [
      {
        src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
        alt: 'Sean A. Russell portrait',
        title: 'Founder Portrait',
      },
      {
        src: 'https://images.unsplash.com/photo-1552664730-d307ca884978',
        alt: 'Speaking engagement',
        title: 'Speaking at Industry Event',
      },
      {
        src: 'https://images.unsplash.com/photo-1552664949-5ddc6df55c65',
        alt: 'Team collaboration',
        title: 'Team Building Workshop',
      },
      {
        src: 'https://images.unsplash.com/photo-1552664730-30bcae1a65b7',
        alt: 'Conference keynote',
        title: 'Keynote Address',
      },
      {
        src: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f',
        alt: 'Product launch event',
        title: 'Product Launch Event',
      },
      {
        src: 'https://images.unsplash.com/photo-1552664730-30bcae1a65b8',
        alt: 'Community gathering',
        title: 'Community Gathering',
      },
      {
        src: 'https://images.unsplash.com/photo-1552664730-30bcae1a65b9',
        alt: 'Workshop facilitation',
        title: 'Workshop Facilitation',
      },
      {
        src: 'https://images.unsplash.com/photo-1552664730-30bcae1a65ba',
        alt: 'Panel discussion',
        title: 'Panel Discussion',
      },
    ],
    videos: [
      {
        src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        title: 'Founder Journey: From Idea to Scale',
      },
      {
        src: 'https://www.youtube.com/embed/jNQXAC9IVRw',
        title: 'Building Systems That Scale',
      },
      {
        src: 'https://www.youtube.com/embed/9bZkp7q19f0',
        title: 'Community-First Go-to-Market',
      },
    ],
    press: [
      {
        publication: 'TechCrunch',
        headline: 'LESARUSS Launches Operating System for Brand Builders',
        date: 'May 2026',
        url: '#',
      },
      {
        publication: 'Fast Company',
        headline: 'How Sean Russell Built 8 Brands in 111 Days',
        date: 'April 2026',
        url: '#',
      },
      {
        publication: 'Entrepreneur',
        headline: 'The Future of Community-First Business Models',
        date: 'March 2026',
        url: '#',
      },
    ],
  },

  contact: {
    email: 'contact@lesaruss.com',
    phone: '+1 (305) 555-0100',
    location: 'Miami, FL',
    disciplines: ['Brand Strategy', 'Founder Guidance', 'Operations', 'Growth'],
    availability: ['Speaking Engagements', 'Advisory Board', 'Strategic Partnerships', 'Consulting'],
  },

  form: {
    opportunityTypes: [
      'Speaking Engagement',
      'Advisory Board',
      'Strategic Partnership',
      'Consulting Project',
      'Investment Opportunity',
      'Media Interview',
      'Collaboration',
      'Other',
    ],
  },
}
