/** Studio service lines — the three ways clients can work with SyncOps Studio.
 * Each line carries fixed-scope, fixed-price packages (same transparent-pricing
 * playbook as the CAPI tiers). CAPI packages mirror src/data/content.ts PACKAGES. */

export interface ServicePackage {
  id: string;
  name: string;
  price: string; // formatted label, e.g. '$2,400' or 'Custom'
  blurb: string;
  features: string[];
}

export interface ServiceLine {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string; // lucide icon name — mapped by components
  packages: ServicePackage[];
}

export const SERVICE_LINES: ServiceLine[] = [
  {
    id: 'capi',
    name: 'CAPI Infrastructure',
    tagline: 'Server-side tracking that survives signal loss',
    description:
      'Server-side tagging and Conversions API infrastructure for 7–9 figure e-commerce brands. ' +
      'Deterministic deduplication, first-party data pipelines, and SLA-backed handovers — ' +
      'attribution your media buying can finally trust.',
    icon: 'Satellite',
    packages: [
      {
        id: 'single-capi-node',
        name: 'Single CAPI Node',
        price: '$2,400',
        blurb: 'One network, fully server-side. The fastest path to honest attribution.',
        features: [
          'Meta CAPI on Cloud Run / Stape container',
          'Deterministic event_id deduplication core',
          'SHA-256 advanced matching for all PII fields',
          '9.0+ Event Match Quality guarantee',
          'CNAME first-party proxy setup guide',
          'GTM server container JSON export',
          'Test event logs + QA verification pass',
          '7-day architecture handover SLA',
        ],
      },
      {
        id: 'omnichannel-stack',
        name: 'Omnichannel Server Stack',
        price: '$5,800',
        blurb: 'Every network, one dedup core. Built for brands spending $50k+/mo.',
        features: [
          'Everything in Single CAPI Node',
          'TikTok Events API + Pinterest CAPI relays',
          'GA4 Measurement Protocol validation node',
          'Google Ads Enhanced Conversions',
          'Multi-destination deduplication engine',
          'Consent Mode v2 wiring (ad_storage / ad_user_data)',
          '30-day post-handover monitoring',
          'Priority Lead Architect channel',
        ],
      },
      {
        id: 'enterprise-cloud-run',
        name: 'Enterprise Cloud Run',
        price: '$12,000',
        blurb: 'Dedicated infrastructure for 8–9 figure portfolios and agencies.',
        features: [
          'Everything in Omnichannel Server Stack',
          'Dedicated regional Cloud Run cluster',
          'Multi-brand / multi-pixel architecture',
          'Custom data warehouse event export',
          '99.99% uptime SLA with live status page',
          'Dedicated Lead Architect line',
          'Quarterly EMQ + signal health audits',
          'White-glove migration from existing stack',
        ],
      },
    ],
  },
  {
    id: 'analytics',
    name: 'Analytics & Pixel Setup',
    tagline: 'Every platform, measured right',
    description:
      'Web analytics and tracking-pixel setup across the major ad platforms. ' +
      'GTM architecture, consent-mode compliance, and event QA — so every dollar of ' +
      'spend is measured once, correctly, everywhere.',
    icon: 'Radar',
    packages: [
      {
        id: 'pixel-foundation',
        name: 'Pixel Foundation',
        price: '$590',
        blurb: 'Core tracking done right — Meta + GA4 wired cleanly through GTM.',
        features: [
          'Meta Pixel + GA4 via Google Tag Manager',
          'Consent-mode basics (GDPR / DMA ready)',
          'Standard events mapped to your funnel',
          'QA checklist with test traffic verification',
          'Handover doc + 7-day support window',
        ],
      },
      {
        id: 'full-funnel-tracking',
        name: 'Full-Funnel Tracking',
        price: '$1,490',
        blurb: 'Every network, one source of truth — pixels plus server-side CAPI lite.',
        features: [
          'Meta + Google Ads + TikTok + Pinterest pixels',
          'Server-side CAPI lite relay for key events',
          'Full consent-mode implementation',
          'Custom event architecture for your funnel',
          'Event QA pass across all destinations',
        ],
      },
      {
        id: 'measurement-partner',
        name: 'Measurement Partner',
        price: '$2,900',
        blurb: 'Tracking as a managed capability — dashboards, reviews, priority support.',
        features: [
          'Everything in Full-Funnel Tracking',
          'Custom analytics dashboards',
          'Monthly measurement health review',
          'Priority support channel',
          'Quarterly tracking roadmap session',
        ],
      },
    ],
  },
  {
    id: 'appdev',
    name: 'AI-Accelerated App Builds',
    tagline: 'Custom software in weeks, not quarters',
    description:
      'We build any app on demand to your requirements using AI-accelerated engineering — ' +
      'human-architected, shipped fast, and maintained after launch. Every product in our ' +
      'portfolio was built this way.',
    icon: 'AppWindow',
    packages: [
      {
        id: 'mvp-sprint',
        name: 'MVP Sprint',
        price: '$4,900',
        blurb: 'A scoped, working MVP in 2 weeks — real software, real users.',
        features: [
          'Scoped MVP delivered in 2 weeks',
          'Production web app, deployed + hosted',
          'Admin basics and content management',
          'Launch support and handover docs',
          'You own 100% of the code',
        ],
      },
      {
        id: 'product-build',
        name: 'Product Build',
        price: '$12,000',
        blurb: 'A full product in 4–6 weeks — auth, payments, admin, QA, handover.',
        features: [
          'Full product build, 4–6 weeks',
          'Auth, payments, and admin console',
          'QA pass + architecture handover',
          'Analytics and tracking wired in',
          '30-day post-launch fix window',
        ],
      },
      {
        id: 'studio-partner',
        name: 'Studio Partner',
        price: 'Custom',
        blurb: 'Dedicated build-and-operate partnership with a monthly care plan.',
        features: [
          'Dedicated build + operate engagement',
          'Monthly care plan (hosting, updates, monitoring)',
          'Product roadmap co-ownership',
          'Priority build queue',
          'Quarterly architecture reviews',
        ],
      },
    ],
  },
];

export function getServiceLine(id: string): ServiceLine {
  return SERVICE_LINES.find((l) => l.id === id) ?? SERVICE_LINES[0];
}
