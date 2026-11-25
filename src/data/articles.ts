/**
 * Studio field-notes dataset — the blog content model.
 *
 * DEFAULT_ARTICLES is the compiled-in fallback: /notes always renders,
 * even with no backend. The owner overrides everything from the Studio
 * Console (Firestore `platformConfig/articles`, mirrored to localStorage
 * in demo mode) — see src/lib/articles.ts.
 *
 * Copy rules: expert and honest. No invented client stats, no fake
 * results — only verifiable platform mechanics and public facts.
 * `body` is plain text; paragraphs are separated by blank lines, and a
 * short line in ALL CAPS renders as a section heading on the page.
 */

export interface Article {
  id: string; // slug, used in /notes/:id
  title: string;
  excerpt: string;
  body: string;
  tags: string[];
  published: boolean;
  publishedAt: string; // ISO date (yyyy-mm-dd)
  order: number;
}

export const DEFAULT_ARTICLES: Article[] = [
  {
    id: 'why-your-roas-fell',
    title: "Why your ROAS fell — and why it isn't your media buyer's fault",
    excerpt:
      'Spend steady, reported ROAS sliding, CPA creeping up no matter how campaigns are restructured. In almost every stack we audit, the buying is fine — the measurement underneath it is what broke.',
    tags: ['attribution', 'ios & att', 'server-side tracking'],
    published: true,
    publishedAt: '2026-11-10',
    order: 0,
    body: `Somewhere between 2021 and today, most e-commerce brands watched the same chart bend the wrong way: spend steady or rising, reported ROAS sliding, and cost per acquisition creeping up no matter how the campaigns were restructured. The instinct is to blame the media buying. In almost every stack we audit, the media buying is fine. The measurement underneath it is what broke.

WHAT ACTUALLY CHANGED

Three shifts stacked on top of each other. Apple's App Tracking Transparency, shipped with iOS 14.5 in April 2021, made cross-app tracking opt-in — and most users declined; Meta publicly estimated a $10 billion revenue impact from ATT in 2022 alone. Safari's Intelligent Tracking Prevention and Firefox's Enhanced Tracking Protection began capping or blocking the cookies that browser pixels depend on, in some cases deleting them within days. And ad blockers quietly removed the pixel from a meaningful share of sessions before it ever fired.

The result is signal loss: purchases that happen but are never reported back to the ad platform — or are reported late, duplicated, or stripped of the identifiers the platform needs to act on them.

WHY THE PLATFORM CARES MORE THAN YOU DO

Modern ad platforms are optimisation machines. Meta, Google and TikTok don't just report on your conversions — they train on them. Every purchase event you send back teaches the delivery system who to find next. When a slice of those events goes missing, two things happen at once. Your reports understate performance, so good campaigns look mediocre. And the algorithm optimises toward the subset of buyers it can still see, which is rarely a representative sample. Budgets drift toward the measurable, not the profitable.

WHAT SERVER-SIDE TRACKING ACTUALLY FIXES

Server-side tracking moves the source of truth from the visitor's browser to your own server. Instead of relying on a pixel that can be blocked, capped or stripped, your store sends purchase events directly to each platform's Conversions API — Meta CAPI, the TikTok Events API, Google's enhanced conversions and Measurement Protocol — from infrastructure you control.

That restores three things. Completeness: the event fires because your server sends it, not because a browser allowed it. Timing: events arrive in near-real time instead of being delayed or dropped. Identity: each event can carry properly consented, hashed customer identifiers — email, phone, click IDs — which is exactly what match-quality scores are built from.

Deduplication is the discipline that makes it safe: every event carries an event ID shared between the browser pixel and the server copy, so the platform counts each purchase once, not twice.

WHAT IT DOESN'T FIX

Server-side tracking is not a loophole around consent, and it doesn't resurrect tracking that users refused. Events should only be sent with a lawful basis and honoured consent signals — Consent Mode and the platforms' consent flags exist for exactly this. It also doesn't fix a broken offer, weak creative or a leaking checkout. It fixes the measurement layer, which is the layer everything else is judged by.

If your ROAS slid while your product, pricing and creative stayed roughly constant, the honest first step is not a new campaign structure. It's an audit of how many of your conversions your ad platforms actually receive, and how good the data attached to them is. That's a knowable number, and it's where we start every engagement.`,
  },
  {
    id: 'emq-explained',
    title: 'EMQ explained: the score that decides how hard your data works',
    excerpt:
      'Every server-side event you send to Meta carries a score you didn\'t set: Event Match Quality, 0 to 10. It is the platform\'s own verdict on whether your customer data is good enough to match against real people.',
    tags: ['event match quality', 'meta capi', 'data quality'],
    published: true,
    publishedAt: '2026-10-27',
    order: 1,
    body: `Every server-side event you send to Meta carries a score you didn't set: Event Match Quality — EMQ. It runs from 0 to 10, it sits in Events Manager next to every event, and most advertisers never look at it. That's a mistake. EMQ is the platform's own verdict on whether the customer data attached to your events is good enough to match against real people.

WHAT EMQ ACTUALLY MEASURES

When your server sends a purchase event, it can attach customer information parameters: email address, phone number, first and last name, city, postcode, country, date of birth, gender, and platform identifiers like the click ID (fbc), the browser ID (fbp) and your own external ID. Meta expects these values hashed — SHA-256, applied on your side before sending — and compares them against its own records. EMQ reflects how many of those parameters you sent and how successfully they matched a Meta account.

A purchase event with no customer data scores near the bottom: the platform knows a purchase happened, but not who bought. The same event with a hashed email, phone, fbc and fbp can score far higher, because Meta can tie it to a person with confidence.

WHY MATCHING IS THE WHOLE GAME

Matched events do three jobs. They attribute the conversion to the right ad, so reporting reflects reality. They feed the delivery algorithm high-quality training signals. And they build audiences — website custom audiences and lookalikes are only as good as the identities underneath them. A low-EMQ setup doesn't just under-report; it teaches the platform from a blurry picture of your buyers.

WHAT RAISES EMQ — AND WHAT DOESN'T

The biggest gains come from capturing identifiers at the moment they exist. Email and phone collected at checkout, sent hashed and correctly formatted — phone numbers in international format, emails lowercased and trimmed before hashing, exactly as the platform's specification requires. Formatting errors are silent killers: the event is accepted, the parameter just never matches.

Click and browser IDs matter just as much. The fbc parameter is built from the fbclid that arrives when someone clicks your ad; if your stack doesn't persist it — in a first-party cookie or your own storage — until the purchase happens, the server event loses its strongest link back to the click. First-party cookies set from your own domain, including via a custom subdomain for your tagging server, survive far longer than third-party ones.

More parameters help only when they're real. Stuffing events with guessed or stale data doesn't raise match rates, and sending data you have no right to send is a compliance problem, not a growth tactic. EMQ rewards accurate, consented data — which is why the score is such a useful audit signal in the first place.

HOW TO READ YOUR OWN SCORE

Open Events Manager, pick your pixel or dataset, and look at the EMQ shown per event. Purchase is the event that matters most. Scores are directional, not absolute: they vary by region, by how much of your traffic is logged in, and by checkout design — a guest checkout with an email field will always out-match a one-tap wallet flow that shares nothing. What you're looking for is a gap. Browser events and server events scoring very differently, or a Purchase score far below your other events, both point at fixable plumbing, not at your product.

EMQ is not a vanity metric. It's the shortest summary of whether your server-side setup is doing its job — and it's the first number we check, because everything downstream of it — attribution, optimisation, audiences — inherits its quality.`,
  },
];
