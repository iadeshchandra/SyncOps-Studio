/** Marketing + product content for the SyncOps Studio landing experience. */

export interface Package {
  id: string;
  name: string;
  tagline: string;
  price: number;
  priceNote: string;
  features: string[];
  cta: string;
}

export const PACKAGES: Package[] = [
  {
    id: 'single-capi-node',
    name: 'Single CAPI Node',
    tagline: 'One network, fully server-side. The fastest path to honest attribution.',
    price: 2400,
    priceNote: 'One-time · per brand',
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
    cta: 'Deploy Single Node',
  },
  {
    id: 'omnichannel-stack',
    name: 'Omnichannel Server Stack',
    tagline: 'Every network, one dedup core. Built for brands spending $50k+/mo.',
    price: 5800,
    priceNote: 'One-time · per brand',
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
    cta: 'Deploy This Stack',
  },
  {
    id: 'enterprise-cloud-run',
    name: 'Enterprise Cloud Run',
    tagline: 'Dedicated infrastructure for 8–9 figure portfolios and agencies.',
    price: 12000,
    priceNote: 'One-time · per organization',
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
    cta: 'Talk to Architecture',
  },
];

export interface CaseStudy {
  brand: string;
  vertical: string;
  adSpend: number;
  roasBefore: number;
  roasAfter: number;
  emq: number;
  quote: string;
  author: string;
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    brand: 'Aurelle & Co.',
    vertical: 'Fashion & Apparel · Shopify Plus',
    adSpend: 120000,
    roasBefore: 2.4,
    roasAfter: 3.9,
    emq: 9.4,
    quote:
      'SyncOps recovered attribution we had written off as iOS noise. Our reported ROAS jumped before we spent a dollar more on media.',
    author: 'Elena Marsh, CMO',
  },
  {
    brand: 'Forge Athletics',
    vertical: 'DTC Fitness · Headless',
    adSpend: 310000,
    roasBefore: 1.8,
    roasAfter: 2.9,
    emq: 9.1,
    quote:
      'Ad blockers were eating a third of our purchase events. The server stack caught every one of them — deduplicated, verified, dispatched.',
    author: 'Marcus Cole, Founder',
  },
  {
    brand: 'Lumen Skincare',
    vertical: 'Beauty · WooCommerce',
    adSpend: 85000,
    roasBefore: 3.1,
    roasAfter: 4.6,
    emq: 9.6,
    quote:
      'The audit alone paid for itself. Safari ITP had quietly cut our cookie window to a day; the first-party proxy fixed it in a week.',
    author: 'Priya Raman, Head of Growth',
  },
  {
    brand: 'Northwind Home',
    vertical: 'Home Goods · Shopify Plus',
    adSpend: 240000,
    roasBefore: 2.0,
    roasAfter: 3.2,
    emq: 9.2,
    quote:
      'We stopped double-counting conversions on day one. Media buyers finally trust the dashboard again — budgets follow the signal.',
    author: 'Daniel Okafor, Media Director',
  },
];

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'The most rigorous tracking engineers we have worked with. They treated our event pipeline like flight-control software.',
    author: 'Elena Marsh',
    role: 'CMO, Aurelle & Co.',
  },
  {
    quote:
      'Handover was surgical — container JSONs, DNS guides, test logs. Our team owned the stack within days.',
    author: 'Marcus Cole',
    role: 'Founder, Forge Athletics',
  },
  {
    quote:
      'EMQ 9.6 and holding for six months. SyncOps is now a permanent line item in our growth budget.',
    author: 'Priya Raman',
    role: 'Head of Growth, Lumen Skincare',
  },
];

export interface PipelineStep {
  title: string;
  desc: string;
  mono: string;
}

export const PIPELINE_STEPS: PipelineStep[] = [
  {
    title: 'First-Party Proxy Edge',
    desc: 'Every pixel request is cloaked behind your own subdomain, restoring first-party cookie context on Safari, Firefox and iOS.',
    mono: 'ss.brand.com → edge PoP · 12ms',
  },
  {
    title: 'Server Container (Cloud Run / Stape)',
    desc: 'A hardened GTM server container queues, validates and enriches every event — no browser dependency, no ad-blocker kill switch.',
    mono: 'gtm.server.js · auto-scaled nodes',
  },
  {
    title: 'Event Deduplication Core',
    desc: 'Browser and server payloads join on a deterministic event_id. The network receives exactly one event — EMQ 9.0+ guaranteed.',
    mono: 'dedup_key = sha256(event_id)',
  },
  {
    title: 'Graph API Dispatch',
    desc: 'Normalized, hashed, consent-aware payloads dispatch to Meta Graph API v21.0, TikTok Events and Pinterest CAPI in parallel.',
    mono: 'POST /v21.0/<pixel>/events · 200 OK',
  },
];
