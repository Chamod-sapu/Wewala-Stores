// Configuration file for the About Us page.
// All copy, stats, team members, and images can be easily edited here.

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  imageUrl: string;
}

export interface ValueItem {
  iconName: 'leaf' | 'shield-check' | 'truck' | 'heart' | 'award' | 'users';
  title: string;
  description: string;
}

export interface StatItem {
  value: string;
  label: string;
  description?: string;
}

export interface AboutContent {
  hero: {
    badge: string;
    title: string;
    highlight: string;
    subtitle: string;
  };
  story: {
    badge: string;
    heading: string;
    paragraphs: string[];
    highlightQuote: string;
    imageUrl: string;
    imageCaption: string;
  };
  missionVision: {
    missionTitle: string;
    missionText: string;
    visionTitle: string;
    visionText: string;
  };
  stats: StatItem[];
  values: ValueItem[];
  team: {
    badge: string;
    heading: string;
    subheading: string;
    members: TeamMember[];
  };
  cta: {
    title: string;
    subtitle: string;
    primaryButtonText: string;
    primaryButtonLink: string;
    secondaryButtonText: string;
    secondaryButtonLink: string;
  };
}

export const aboutContent: AboutContent = {
  hero: {
    badge: 'Our Journey & Heritage',
    title: 'Connecting Sri Lankan Households to',
    highlight: 'Pure, Fresh Essentials',
    subtitle:
      'From humble roots as a family village grocery in Wewala to a modern e-commerce platform delivering genuine farm produce, Ceylon teas, and daily pantry staples nationwide.',
  },

  story: {
    badge: 'Our Story',
    heading: 'Born from a Passion for Honest, Direct Groceries',
    paragraphs: [
      'Wewala Stores was established with a singular vision: eliminate middlemen markups and bring the freshest harvests from smallholder Sri Lankan cultivators straight to community dining tables.',
      'What began as a neighbourhood store in Wewala, Piliyandala has grown into an island-wide digital marketplace. Throughout our expansion, our foundational commitment has never wavered—authenticity, transparent pricing, and zero compromise on food freshness.',
      'By pairing traditional agricultural relationships with cutting-edge serverless technology, we ensure guaranteed live inventory, rapid doorstep dispatch, and dignified livelihoods for our partner farming families.',
    ],
    highlightQuote:
      '"Every basket we pack carries the devotion of Sri Lankan farmers and the promise of pure, nutritious food for your family."',
    imageUrl:
      'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
    imageCaption: 'Daily fresh produce intake at our Wewala distribution facility',
  },

  missionVision: {
    missionTitle: 'Our Mission',
    missionText:
      'To provide healthy, ethically sourced groceries and Ceylon specialty products at transparent prices, while championing local farming communities and sustainable packaging practices.',
    visionTitle: 'Our Vision',
    visionText:
      'To become Sri Lanka’s most trusted household e-commerce platform, celebrated for uncompromising product quality, technological integrity, and social responsibility.',
  },

  stats: [
    {
      value: '25,000+',
      label: 'Delighted Households',
      description: 'Regular customers across all nine provinces',
    },
    {
      value: '180+',
      label: 'Direct Partner Farmers',
      description: 'Cultivators from Nuwara Eliya, Dambulla & Matale',
    },
    {
      value: '99.8%',
      label: 'On-Time Doorstep Delivery',
      description: 'Carefully packaged with temperature preservation',
    },
    {
      value: '100%',
      label: 'Guaranteed Stock Integrity',
      description: 'Zero phantom orders via atomic database reservations',
    },
  ],

  values: [
    {
      iconName: 'leaf',
      title: 'Farm-to-Table Freshness',
      description:
        'Produce harvested in the morning reaches your kitchen within 24 to 36 hours, preserving natural nutrients and flavor.',
    },
    {
      iconName: 'shield-check',
      title: 'Guaranteed Live Inventory',
      description:
        'Our database guarantees what you see is in stock with atomic concurrency locks—no disappointing cancellations.',
    },
    {
      iconName: 'truck',
      title: 'Fast Island-Wide Logistics',
      description:
        'Free doorstep delivery for orders over Rs. 5,000, supported by experienced couriers who treat your groceries with care.',
    },
    {
      iconName: 'heart',
      title: 'Fair Wages for Farmers',
      description:
        'We practice direct procurement at transparent, premium farm-gate prices, empowering rural agricultural livelihoods.',
    },
    {
      iconName: 'award',
      title: 'Single-Origin Ceylon Teas',
      description:
        'Authentic Pekoe, BOPF, and artisanal teas sourced straight from certified high-altitude hill country estates.',
    },
    {
      iconName: 'users',
      title: 'Human-First Customer Support',
      description:
        'Our Colombo-based support team is available 7 days a week via phone, WhatsApp, and email to resolve any request.',
    },
  ],

  team: {
    badge: 'Leadership & Team',
    heading: 'The People Behind Wewala Stores',
    subheading:
      'Passionate food lovers, agricultural supply chain specialists, and software engineers dedicated to redefining Sri Lankan online retail.',
    members: [
      {
        name: 'Dinesh Wickramasinghe',
        role: 'Co-Founder & Managing Director',
        bio: '20+ years of retail and logistics experience. Champion of transparent farm-gate pricing in the Western Province.',
        imageUrl:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      },
      {
        name: 'Amali Perera',
        role: 'Head of Quality & Agricultural Sourcing',
        bio: 'Agricultural sciences graduate specializing in post-harvest preservation and smallholder cooperative partnerships.',
        imageUrl:
          'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
      },
      {
        name: 'Kasun Jayawardena',
        role: 'Chief Technology Officer',
        bio: 'Architect behind our transactional e-commerce engine, cloud integrations, and mobile checkout experience.',
        imageUrl:
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
      },
      {
        name: 'Dilini Senanayake',
        role: 'Customer Experience Lead',
        bio: 'Ensures every customer inquiry is resolved promptly and every delivery reaches you in peak condition.',
        imageUrl:
          'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
      },
    ],
  },

  cta: {
    title: 'Experience Fresh Groceries Delivered to Your Doorstep',
    subtitle:
      'Join thousands of families enjoying farm-fresh vegetables, Ceylon spices, and daily household essentials.',
    primaryButtonText: 'Explore Store Products',
    primaryButtonLink: '/products',
    secondaryButtonText: 'Contact Store Team',
    secondaryButtonLink: '/contact',
  },
};

