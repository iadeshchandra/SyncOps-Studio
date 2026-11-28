/**
 * Post-build meta prerendering.
 *
 * The app is a client-rendered SPA: the raw HTML for every route is the
 * same small shell, so crawlers that do not run JavaScript (Bing, social
 * scrapers, AI search) would see the homepage's title and description on
 * every page. This script clones the built shell into per-route folders
 * (dist/<route>.html — Firebase Hosting serves the exact static file
 * at the clean URL, no redirect, before the SPA rewrite) with that route's real title, description,
 * canonical and social tags baked in, plus JSON-LD structured data
 * (BreadcrumbList everywhere, Article on field notes, Service on service
 * pages). The app itself is untouched and renders exactly as before.
 *
 * The route table mirrors the usePageMeta strings in src/pages and the
 * data in src/data (services, articles, products). If a page's meta
 * changes, change it here too.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ORIGIN = 'https://syncopsstudio.web.app';
const dist = new URL('../dist/', import.meta.url).pathname;
const shell = readFileSync(join(dist, 'index.html'), 'utf8');

const ORG = {
  '@type': 'Organization',
  name: 'SyncOps Studio',
  url: ORIGIN + '/',
  logo: ORIGIN + '/og-image.png',
  email: 'iadeshchandra@gmail.com',
  sameAs: ['https://www.fiverr.com/adesh_chandra'],
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => esc(s).replace(/"/g, '&quot;');

function render(route) {
  const url = ORIGIN + route.path;
  let html = shell;
  const swap = (pattern, replacement, label) => {
    if (!pattern.test(html)) throw new Error(`prerender: anchor missing for ${label} (${route.path})`);
    html = html.replace(pattern, replacement);
  };
  swap(/<title>.*?<\/title>/, `<title>${esc(route.title)}</title>`, 'title');
  swap(/<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${escAttr(route.description)}" />`, 'description');
  swap(/<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${url}" />`, 'canonical');
  swap(/<meta property="og:title" content="[^"]*" \/>/,
    `<meta property="og:title" content="${escAttr(route.title)}" />`, 'og:title');
  swap(/<meta property="og:description" content="[^"]*" \/>/,
    `<meta property="og:description" content="${escAttr(route.description)}" />`, 'og:description');
  swap(/<meta property="og:url" content="[^"]*" \/>/,
    `<meta property="og:url" content="${url}" />`, 'og:url');
  swap(/<meta name="twitter:title" content="[^"]*" \/>/,
    `<meta name="twitter:title" content="${escAttr(route.title)}" />`, 'twitter:title');
  swap(/<meta name="twitter:description" content="[^"]*" \/>/,
    `<meta name="twitter:description" content="${escAttr(route.description)}" />`, 'twitter:description');

  const crumbs = [{ '@type': 'ListItem', position: 1, name: 'Home', item: ORIGIN + '/' }];
  if (route.crumbParent) {
    crumbs.push({ '@type': 'ListItem', position: 2, name: route.crumbParent.name, item: ORIGIN + route.crumbParent.path });
  }
  crumbs.push({ '@type': 'ListItem', position: crumbs.length + 1, name: route.crumbName, item: url });
  const graphs = [{ '@type': 'BreadcrumbList', itemListElement: crumbs }];
  if (route.article) {
    graphs.push({
      '@type': 'Article',
      headline: route.article.headline,
      description: route.description,
      datePublished: route.article.date,
      author: ORG,
      publisher: ORG,
      mainEntityOfPage: url,
    });
  }
  if (route.service) {
    graphs.push({
      '@type': 'Service',
      name: route.service,
      description: route.description,
      provider: ORG,
      url,
    });
  }
  const ld = graphs
    .map((g) => `    <script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', ...g })}</script>`)
    .join('\n');
  html = html.replace('  </head>', ld + '\n  </head>');
  const out = join(dist, route.path.replace(/^\//, '') + '.html');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  console.log('prerendered', route.path);
}

const P = (path, title, description, extra = {}) => ({ path, title, description, crumbName: title.replace(/ — SyncOps Studio$/, ''), ...extra });

const routes = [
  P('/status', 'System Status — SyncOps Studio', 'SyncOps Studio infrastructure: uptime design targets, the telemetry model, an edge-stream demonstration and incident-response drills.'),
  P('/labs', 'SyncOps Labs — SyncOps Studio', 'SyncOps Labs: a live Conversions API payload workbench, a first-party DNS generator and server-side tracking masterclasses — the tooling our architects use on client engagements.'),
  P('/work', 'Work — SyncOps Studio', 'The SyncOps Studio portfolio: real products engineered and shipped by the studio — the same team and process we bring to client builds.'),
  P('/compare', 'Compare — SyncOps Studio vs Stape vs PixelFly', 'An honest comparison of SyncOps Studio with Stape and PixelFly: what each tool really does, where each one stops, and what a hands-on studio adds.'),
  P('/terms', 'Terms & Refunds — SyncOps Studio', 'How a SyncOps Studio engagement works: fixed scope, direct payments, the refund policy, revision rounds, timelines and your data rights.'),
  P('/privacy', 'Privacy Policy — SyncOps Studio', 'What data SyncOps Studio collects and why, cookies and Google AdSense advertising, who processes data, and your export and deletion rights.'),
  P('/about', 'About — SyncOps Studio', 'SyncOps Studio is a one-architect measurement studio: server-side tracking and CAPI infrastructure, practised since 2019, 322 Fiverr reviews at 4.9/5, 240+ businesses tracked.'),
  P('/contact', 'Contact — SyncOps Studio', 'Contact SyncOps Studio: email the architect directly, use live chat, or order through Fiverr. What happens after you write, step by step.'),
  P('/case-studies', 'Case Studies — SyncOps Studio', "Documented repairs from real engagements: the problem, the diagnosis, the fix, and how it was proven. Plus the studio's public, verifiable review record."),
  P('/faq', 'FAQ — SyncOps Studio', 'Straight answers about server-side tracking with SyncOps Studio: ownership, pricing, timelines, migration, payments, refunds and privacy.'),
  P('/process', 'How We Work — SyncOps Studio', 'The SyncOps engagement process: architecture call and free audit, fixed-scope proposal, access checklist and start gate, build, verification on real traffic, and a handover with the keys.'),
  P('/for-agencies', 'For Agencies — SyncOps Studio', "White-label server-side tracking delivery for agencies: fixed published prices you can mark up, deliverables under your brand, everything built in your client's own accounts."),
  P('/pricing', 'Pricing — SyncOps Studio', 'Every SyncOps Studio package and price, in one place: fixed-scope, one-time engineering fees across CAPI infrastructure, analytics setup, app builds and ChatGPT Ads measurement.'),
  P('/reviews', 'Reviews — SyncOps Studio', 'What clients say about SyncOps Studio: a public 4.9/5 record across 322 Fiverr reviews, plus reviews from completed studio engagements.'),
  P('/notes', 'Field Notes — SyncOps Studio', 'Field notes from real tracking engagements: what broke, how it was diagnosed, and what fixed it — Meta CAPI, TikTok Events API, Microsoft Ads and more.'),
  P('/services/capi', 'CAPI Infrastructure — SyncOps Studio', 'Server-side tagging and Conversions API infrastructure for 7–9 figure e-commerce brands.', { service: 'CAPI Infrastructure' }),
  P('/services/analytics', 'Analytics & Pixel Setup — SyncOps Studio', 'Web analytics and tracking-pixel setup across the major ad platforms.', { service: 'Analytics & Pixel Setup' }),
  P('/services/appdev', 'AI-Accelerated App Builds — SyncOps Studio', 'We build any app on demand to your requirements using AI-accelerated engineering.', { service: 'AI-Accelerated App Builds' }),
  P('/services/chatgpt-ads', 'ChatGPT Ads Measurement — SyncOps Studio', "ChatGPT Ads measurement for advertisers on OpenAI's new channel: the Measurement Pixel and server-side signal setup.", { service: 'ChatGPT Ads Measurement' }),
  P('/work/sanatani-bandhan', 'Sanatani Bandhan — SyncOps Studio', 'The operating system for Dharmic institutions — a SyncOps Studio product.', { crumbParent: { name: 'Work', path: '/work' } }),
  P('/work/xtrivo', 'XTRIVO — SyncOps Studio', 'One download engine, every platform — a SyncOps Studio product.', { crumbParent: { name: 'Work', path: '/work' } }),
  P('/work/prooflist', 'ProofList — SyncOps Studio', 'Leads you can actually email — a SyncOps Studio product.', { crumbParent: { name: 'Work', path: '/work' } }),
];

const notes = [
  ['why-your-roas-fell', "Why your ROAS fell — and why it isn't your media buyer's fault", 'Spend steady, reported ROAS sliding, CPA creeping up no matter how campaigns are restructured. In almost every stack we audit, the buying is fine.', '2026-11-10'],
  ['emq-explained', 'EMQ explained: the score that decides how hard your data works', 'Every server-side event you send to Meta carries a score — the Event Match Quality score — and it decides how hard your data works.', '2026-10-27'],
  ['tiktok-purchase-that-never-fired', 'The Purchase event that never fired: a TikTok Events API repair', 'A live store, real orders every day — and TikTok had not recorded a single Purchase in three days. The pixel was installed correctly.', '2026-11-20'],
  ['microsoft-ads-account-reinstated', 'Suspended on Monday, reinstated in a day: a Microsoft Ads appeal, documented', 'A suspended Microsoft Advertising account is not always the end of the road. This one came back in about one business day.', '2026-11-25'],
  ['deduplication-explained', 'One purchase, counted once: deduplication, explained honestly', 'Run a browser pixel and a server API together and every purchase arrives twice. Deduplication is the discipline that merges them into one event.', '2026-11-28'],
];
for (const [slug, title, description, date] of notes) {
  routes.push(P(`/notes/${slug}`, `${title} — SyncOps Studio`, description, {
    crumbParent: { name: 'Field Notes', path: '/notes' },
    crumbName: title,
    article: { headline: title, date },
  }));
}

for (const r of routes) render(r);
console.log(`prerender-meta: ${routes.length} routes done`);
