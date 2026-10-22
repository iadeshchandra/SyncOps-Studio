/**
 * Studio products dataset — the SaaS marketing engine.
 *
 * DEFAULT_PRODUCTS is the compiled-in fallback: the showcase always renders,
 * even with no backend. The owner overrides everything from the Studio
 * Console (Firestore `platformConfig/products`, mirrored to localStorage in
 * demo mode) — see src/lib/products.ts.
 *
 * Copy rules: metrics are REAL or omitted, never invented. Testimonials stay
 * empty until the owner supplies real ones. Product pages link out to the
 * apps' own pricing — never duplicated here.
 */

export type ProductStatus = 'live' | 'beta' | 'building';

export type ProductAccent = 'emerald' | 'cyan' | 'amber' | 'rose' | 'indigo';

export interface ProductFeature {
  title: string;
  description: string;
}

export interface ProductBenefit {
  title: string;
  description: string;
}

export interface ProductMetric {
  value: string;
  label: string;
}

export interface ProductTestimonial {
  quote: string;
  author: string;
  role: string;
}

export interface ProductFaq {
  q: string;
  a: string;
}

export interface ProductLink {
  label: string;
  url: string;
}

export interface Product {
  id: string;
  name: string;
  tagline: string;
  status: ProductStatus;
  description: string;
  heroHeadline: string;
  heroSubcopy: string;
  heroCtaLabel: string;
  heroCtaUrl: string;
  whyTitle: string;
  whyPoints: string[];
  features: ProductFeature[];
  benefits: ProductBenefit[];
  metrics: ProductMetric[];
  stack: string[];
  testimonials: ProductTestimonial[];
  faqs: ProductFaq[];
  links: ProductLink[];
  accent: ProductAccent;
  featured?: boolean;
  published: boolean;
  order: number;
}

export const STATUS_LABELS: Record<ProductStatus, string> = {
  live: 'LIVE',
  beta: 'BETA',
  building: 'BUILDING',
};

/**
 * Accent → fixed Tailwind class strings. Never interpolate accent keys into
 * class names — Tailwind's compiler must see the full literal.
 */
export interface AccentStyles {
  badge: string;
  bar: string;
  text: string;
  chip: string;
  glow: string;
}

export const ACCENT_STYLES: Record<ProductAccent, AccentStyles> = {
  emerald: {
    badge: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
    bar: 'bg-emerald-500',
    text: 'text-emerald-300',
    chip: 'border-emerald-700/60 bg-emerald-950/40 text-emerald-300',
    glow: 'hover:shadow-[0_0_32px_rgba(52,211,153,0.12)]',
  },
  cyan: {
    badge: 'border-cyan-500/30 bg-cyan-500/15 text-cyan-300',
    bar: 'bg-cyan-500',
    text: 'text-cyan-300',
    chip: 'border-cyan-700/60 bg-cyan-950/40 text-cyan-300',
    glow: 'hover:shadow-[0_0_32px_rgba(34,211,238,0.12)]',
  },
  amber: {
    badge: 'border-amber-500/30 bg-amber-500/15 text-amber-300',
    bar: 'bg-amber-500',
    text: 'text-amber-300',
    chip: 'border-amber-700/60 bg-amber-950/40 text-amber-300',
    glow: 'hover:shadow-[0_0_32px_rgba(245,158,11,0.12)]',
  },
  rose: {
    badge: 'border-rose-500/30 bg-rose-500/15 text-rose-300',
    bar: 'bg-rose-500',
    text: 'text-rose-300',
    chip: 'border-rose-700/60 bg-rose-950/40 text-rose-300',
    glow: 'hover:shadow-[0_0_32px_rgba(251,113,133,0.12)]',
  },
  indigo: {
    badge: 'border-indigo-500/30 bg-indigo-500/15 text-indigo-300',
    bar: 'bg-indigo-500',
    text: 'text-indigo-300',
    chip: 'border-indigo-700/60 bg-indigo-950/40 text-indigo-300',
    glow: 'hover:shadow-[0_0_32px_rgba(129,140,248,0.12)]',
  },
};

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'sanatani-bandhan',
    name: 'Sanatani Bandhan',
    tagline: 'The operating system for Dharmic institutions',
    status: 'live',
    description:
      'Offline-first ERP + super-app for 17 kinds of Sanatana Dharma institutions — Mandir, Goshala, Ashram, Gurukul, Tirth, trusts and sanghas — bridged by one universal Sanatani ID.',
    heroHeadline: 'Salesforce for Dharmic institutions',
    heroSubcopy:
      'One offline-first platform runs the treasury, devotees, sevas, assets and community of temples, goshalas, ashrams, gurukuls and sanghas — with institutional dignity in every screen.',
    heroCtaLabel: 'Visit live app',
    heroCtaUrl: 'https://sanatanibandhan.web.app',
    whyTitle: 'Why temples still run on paper — and what it costs them',
    whyPoints: [
      'Registers and WhatsApp groups lose donations, devotees and institutional memory',
      'Money moves without an audit trail — trust erodes the moment questions arise',
      'Every department keeps its own silo; nobody sees the whole institution',
      'Rural connectivity kills cloud-only software on the days it matters most',
    ],
    features: [
      {
        title: 'Zero-Internet protocol',
        description:
          'IndexedDB-first with an offline sync queue. Registers, treasury entries and seva bookings work with zero connectivity and sync when the network returns.',
      },
      {
        title: 'Treasury & dual wallets',
        description:
          'Platform wallet for top-ups, marketplace and commission; personal wallet as a private ledger. Geo top-ups via Bangla QR, UPI, Payoneer and Wise.',
      },
      {
        title: 'Panchang-driven supply chain',
        description:
          'Festival-aware predictive stock for bhandar and goshala, driven by the Hindu calendar — supply arrives before the crowd does.',
      },
      {
        title: 'Tamper-proof audit & transparency',
        description:
          'Every action across the institution is appended to a SHA-256 hash-chained audit history — who did what, verifiable in one tap, editable by no one. Trustees can publish monthly accounts on a public Transparency Board: totals and categories, never donor names.',
      },
      {
        title: 'Multi-org RBAC',
        description:
          'All 17 organisation types — Mandir, Goshala, Ashram, Gurukul, Vidyalaya, Sangha, Samaj, Satsang, Yoga, Tirth, trusts and more — plus Solo Sanatani for individuals, each with role-based access from SuperAdmin to Devotee.',
      },
      {
        title: '10-language i18n',
        description:
          'English, Hindi, Bengali, Sanskrit, Tamil, Telugu, Marathi, Gujarati, Kannada and Malayalam. Sacred terms are never translated; lakh/crore formatting throughout.',
      },
      {
        title: 'Marketplace & commissions',
        description:
          'Community sevas free forever; verified providers with configurable commission rails, dual-rail payments and bypass defenses.',
      },
      {
        title: '14 flagship suites',
        description:
          'Goshala One, Pathshala One, Matha One, Ashram One, Annakshetra One, Utsav One, Tirth One, Yoga One, Satsang One, Sabha One, Nyas One, Samskara One (16 samskaras), Purohit One and Jyotish One — plus the Sangam community layer and Seva Bazar marketplace, one ID across all of it.',
      },
    ],
    benefits: [
      {
        title: 'Works without internet',
        description:
          'Full operations on zero connectivity. The software never becomes the reason a donation goes unrecorded.',
      },
      {
        title: 'Institutional dignity',
        description:
          'Every screen, receipt and message carries the gravitas of a place of worship — never corporate-cold.',
      },
      {
        title: 'Money traceability',
        description:
          'Every rupee traceable from donation to treasury posting, with role-based approvals and owner oversight.',
      },
      {
        title: 'One identity, whole community',
        description:
          'A single Sanatani ID connects devotees to every institution they serve — no re-registration, no fragmentation.',
      },
    ],
    metrics: [
      { value: '10', label: 'Languages' },
      { value: '17', label: 'Organisation types' },
      { value: '14', label: 'Flagship suites' },
    ],
    stack: ['React', 'TypeScript', 'Firebase', 'IndexedDB', 'PWA', 'i18n × 10'],
    testimonials: [],
    faqs: [
      {
        q: 'Does it work without internet?',
        a: 'Yes. Sanatani Bandhan is offline-first: registers, treasury entries and seva bookings work with zero connectivity and sync to the cloud when the network returns.',
      },
      {
        q: 'How is our institution\u2019s money protected?',
        a: 'Every treasury movement posts to an append-only ledger with SHA-256 chained audit records, role-based approvals and owner oversight — no silent edits, ever.',
      },
      {
        q: 'What does Sanatani Bandhan cost?',
        a: 'Seva is free forever. Standard is ₹499 / ৳700 / $6 a month (₹4,999 / ৳7,000 / $60 a year); Premium is ₹1,999 / ৳2,800 / $24 a month (₹19,999 / ৳28,000 / $240 a year); Purohit/Jyotishi Pro is ₹199 / ৳280 / $2.50 a month. Full published facts: https://sanatanibandhan.web.app/llms.txt',
      },
    ],
    links: [
      { label: 'Live app', url: 'https://sanatanibandhan.web.app' },
      { label: 'AI facts (llms.txt)', url: 'https://sanatanibandhan.web.app/llms.txt' },
    ],
    accent: 'amber',
    featured: true,
    published: true,
    order: 1,
  },
  {
    id: 'xtrivo',
    name: 'XTRIVO',
    tagline: 'One download engine, every platform',
    status: 'building',
    description:
      'A cross-platform download manager ecosystem — native Android, Chrome extension, desktop and web — built to beat IDM on speed and legitimacy.',
    heroHeadline: 'Downloads at the speed of the modern web',
    heroSubcopy:
      'XTRIVO is a download manager rebuilt for every screen you own: segmented multi-connection acceleration, one account, and a browser extension that captures what you actually want.',
    heroCtaLabel: 'Follow the build',
    heroCtaUrl: 'https://github.com/iadeshchandra/Xtrivo',
    whyTitle: 'Why downloads still feel like 2009',
    whyPoints: [
      'The best download manager on earth is Windows-only',
      'Mobile downloaders live in legal grey zones and sideloaded APKs',
      'Your downloads don\u2019t follow you across devices',
      'Browser-native downloading is slow, single-threaded and dumb',
    ],
    features: [
      {
        title: 'Segmented multi-connection engine',
        description:
          'IDM-class acceleration: files are split into parallel segments across connections and reassembled at full throughput.',
      },
      {
        title: 'Four platforms, one account',
        description:
          'Native Android, Chrome MV3 extension, Electron desktop and Astro web — queues and progress sync everywhere.',
      },
      {
        title: 'Browser capture',
        description:
          'The extension detects downloadable media and hands it to the engine in one click — no copy-pasting URLs.',
      },
      {
        title: 'Legal by design',
        description:
          'No DRM circumvention, no paywall bypass, no ripping. Legitimacy is the distribution strategy — official stores only.',
      },
    ],
    benefits: [
      {
        title: 'Speed without sketchiness',
        description:
          'IDM-class throughput from software you can install from official app stores.',
      },
      {
        title: 'Start anywhere, finish anywhere',
        description: 'Queue on desktop, complete on your phone. Your library follows you.',
      },
      {
        title: 'Trust as a feature',
        description: 'Privacy-respecting, store-distributed and auditable — in the open on GitHub.',
      },
    ],
    metrics: [{ value: '4', label: 'Platforms' }],
    stack: ['Kotlin', 'TypeScript', 'Electron', 'Chrome MV3', 'Astro'],
    testimonials: [],
    faqs: [
      {
        q: 'When does it launch?',
        a: 'XTRIVO is in active development. The Android app and browser extension lead; desktop and web follow. Follow the public repo for milestones.',
      },
      {
        q: 'Is it legal?',
        a: 'Yes — by design. XTRIVO never circumvents DRM or paywalls. That constraint is exactly what lets it ship in official app stores.',
      },
    ],
    links: [{ label: 'GitHub', url: 'https://github.com/iadeshchandra/Xtrivo' }],
    accent: 'cyan',
    published: true,
    order: 2,
  },
  {
    id: 'prooflist',
    name: 'ProofList',
    tagline: 'Leads you can actually email',
    status: 'building',
    description:
      'B2B lead generation rebuilt around the one metric that matters: verified, reachable emails — cloud-first with an API, priced pay-as-you-go.',
    heroHeadline: 'Stop paying for dead leads',
    heroSubcopy:
      'ProofList verifies every email before it counts, filters before you extract, and charges only for what you use. Built to out-verify the lifetime-deal tools.',
    heroCtaLabel: 'Request early access',
    heroCtaUrl: 'mailto:hello@syncops.studio?subject=ProofList%20early%20access',
    whyTitle: 'Why lead lists rot before you use them',
    whyPoints: [
      'Most lead tools sell volume — 40%+ of the emails bounce',
      'You pay per seat or per month whether the data works or not',
      'No API means the data dies in a CSV on someone\u2019s laptop',
      'Filters come after extraction, so you pay for junk you never wanted',
    ],
    features: [
      {
        title: 'Verified emails',
        description:
          'Every address is verified before it counts as a lead. Bounces are our problem, not yours.',
      },
      {
        title: 'Pre-extraction filters',
        description:
          'Filter by role, industry, geography and tech stack before a single credit is spent.',
      },
      {
        title: 'Cloud-first + API',
        description:
          'Your lists live in the cloud and flow into your stack over API — no CSV purgatory.',
      },
      {
        title: 'Pay-as-you-go',
        description: 'No seats, no subscriptions. Pay for verified leads, nothing else.',
      },
    ],
    benefits: [
      {
        title: 'Email with confidence',
        description: 'Campaigns land in inboxes, not bounce folders.',
      },
      {
        title: 'Spend on signal',
        description: 'Credits burn only on leads that pass every filter you set.',
      },
      {
        title: 'Plugs into your stack',
        description: 'API-first means leads flow where your team already works.',
      },
    ],
    metrics: [],
    stack: ['TypeScript', 'Cloud API', 'Email verification'],
    testimonials: [],
    faqs: [
      {
        q: 'How is ProofList different from list scrapers?',
        a: 'Scrapers sell volume; ProofList sells verified reachability. Every email is verified, filters run before extraction, and you pay per verified lead — not per seat.',
      },
      {
        q: 'When is it available?',
        a: 'ProofList is in development. Request early access and we\u2019ll notify you when the first verification credits go live.',
      },
    ],
    links: [],
    accent: 'emerald',
    published: true,
    order: 3,
  },
];
