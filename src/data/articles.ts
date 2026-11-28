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
  /** Cover image (WebP data URL from the console vault). */
  coverDataUrl?: string;
  /** Structured case-study fields — filled for 'case study' notes. */
  client?: string;
  problem?: string;
  fix?: string;
  result?: string;
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
  {
    id: 'tiktok-purchase-that-never-fired',
    title: 'The Purchase event that never fired: a TikTok Events API repair',
    excerpt:
      'A live store, real orders every day — and TikTok had not recorded a single Purchase in three days. The pixel was installed correctly. The event was wired to a page your customers never actually reach.',
    tags: ['tiktok events api', 'case study', 'deduplication'],
    published: false,
    publishedAt: '2026-11-20',
    order: 2,
    body: `This is a real repair from our studio practice, shared with the client's details removed. An online academy selling courses through its own store had the full TikTok setup on paper: the pixel installed through Google Tag Manager, a Purchase event configured on the order-confirmation page, and a server-side Events API connection alongside it. Orders were coming in. TikTok's data showed no purchases at all.

THREE DAYS, ZERO PURCHASES

The first step in any repair is to stop guessing and watch real traffic. Over three days of live orders, the browser Purchase event never fired once. Not intermittently — never. The thank-you page was the problem: between payment gateways returning customers to different screens, redirects, and confirmation pages that many buyers simply never land on, an event that depends on a specific page loading in a specific browser is an event designed to go missing.

This is the most common server-side failure we see, and it is invisible from inside the ad account. The campaigns keep spending. The platform optimises on whatever weaker signals it can find. The advertiser blames the targeting.

THE FIX: FIRE FROM THE ORDER, NOT THE PAGE

We rebuilt the event at the one moment that is always true: the order itself. When an order is paid, the store generates the Purchase event from the order data — value, currency, contents — and sends it to TikTok's Events API directly. No page needs to load. No browser needs to cooperate. If the order exists and is paid, the event fires.

Two disciplines made it safe. First, deduplication: the remaining browser-side Purchase tags in the tag manager were paused, so the order-based event is the single source — one purchase, counted once. Second, naming: TikTok renamed its checkout event from CompletePayment to Purchase, and events sent under mismatched names never deduplicate and never train delivery properly. Every source now speaks the same event name.

HOW IT WAS PROVEN

Not with a dashboard screenshot — with real orders. A paid order of 120 SAR was placed and watched arriving in TikTok's Test Events, fired by the order, with the correct value. Then the test configuration was removed and a second real order, 99 SAR, flowed into the live data and was accepted by the Events API. Both events existed because money had actually moved, which is the only proof that matters for a Purchase event.

THE LESSON

If your conversion event lives on a thank-you page, you do not have conversion tracking — you have a hope. Anchor revenue events to the transaction system that records the money, send them server-side, keep exactly one source per event, and prove the repair with a real order before you call it done.`,
  },
  {
    id: 'microsoft-ads-account-reinstated',
    title: 'Suspended on Monday, reinstated in a day: a Microsoft Ads appeal, documented',
    excerpt:
      'A suspended Microsoft Advertising account is not always the end of the road. This one came back in about one business day — because the appeal treated the review like what it is: a documentation check, not an argument.',
    tags: ['microsoft ads', 'case study', 'account recovery'],
    published: false,
    publishedAt: '2026-11-25',
    order: 3,
    body: `Another real case from the studio, anonymised. A US home-services company opened Microsoft Advertising to find the account suspended — campaigns dead, no warning email that explained anything actionable, and a support trail that mostly led in circles. Account suspensions feel personal. To the platform, they are paperwork: an automated system flagged something, and a human reviewer will reverse it only if the file in front of them answers their questions before they ask them.

WHAT A WORKING APPEAL ACTUALLY CONTAINS

Reviewers do not reinstate accounts because a message is polite or urgent. They reinstate when the business is verifiably real and the flagged risk is explained. The appeal we prepared was built as a small evidence pack: the business's legal identity and how it operates, what it advertises and why that complies with Microsoft's policies, and a clear account of the activity that likely triggered the flag, addressed point by point rather than denied in general terms.

No templates, no mass-submitted wording. Appeals written for one account, with that account's facts, read differently to a reviewer than the copied text they see a hundred times a day — and they are decided differently.

THE TIMELINE, HONESTLY

The expectation we set with the client was a decision window of several business days, possibly longer. The reinstatement came through in about one business day: verification approved, appeal approved, account live again, with the client back inside Microsoft Advertising looking at the campaign-creation screen. That speed is not a promise we make anyone — review queues are the platform's, not ours. What is ours is the quality of the file the reviewer opens.

WHAT HAPPENS AFTER THE DOOR REOPENS

A reinstated account with no measurement is a second chance spent blind. The follow-on work — and we are transparent that this is the phase now in progress for this client — is the UET tag installed on the store, a properly defined Purchase conversion goal, and a short watch period to confirm real conversions are being recorded before budgets scale again. Reinstatement gets you back in the room. Tracking is what makes being in the room worth paying for.

THE LESSON

Treat a suspension as a documentation problem first and a catastrophe second. Keep your business records reachable, write the appeal to the reviewer's checklist rather than to your own frustration, and set honest timelines. Accounts come back when the evidence is boring, complete and true.`,
  },
  {
    id: 'deduplication-explained',
    title: 'One purchase, counted once: deduplication, explained honestly',
    excerpt:
      'Run a browser pixel and a server API together and every purchase arrives twice. Deduplication is the discipline that merges them into one event — and the first thing that silently breaks when it is done casually.',
    tags: ['deduplication', 'meta capi', 'server-side tracking'],
    published: true,
    publishedAt: '2026-11-28',
    order: 4,
    body: `The moment a store adds server-side tracking alongside its browser pixel — which is exactly what we recommend — it creates a new problem: every purchase now arrives at the ad platform twice. Once from the customer's browser, once from the server. If the platform counted both, your conversion numbers would double overnight, your ROAS would look miraculous, and your campaigns would optimise toward fiction. Deduplication is what stands between that outcome and the truth.

HOW THE PLATFORMS MERGE TWO EVENTS INTO ONE

Meta, TikTok and the others solve this the same way: identity by name and number. When the browser event and the server event carry the same event name and the same event ID, the platform treats them as two reports of one happening and merges them — keeping the richer of the two. Meta's window for that merge is 48 hours; the pair must match on the event name and the event_id (for web events, within the same pixel or dataset). TikTok's Events API works the same way with its own event_id. No shared ID, no merge: two events, counted twice, and no warning anywhere in the interface that it happened.

This is why the event ID has to be born in one place. In a sound setup, a single ID is generated per real-world action — per order, per lead, per signup — and handed to both the browser tag and the server payload. The moment the browser invents one ID and the server invents another, deduplication is already lost, and everything downstream inherits the double count.

WHAT BREAKS IT IN PRACTICE

Three failure modes cover almost every broken stack we audit. First, mismatched names: the browser sends one event name while the server sends another — TikTok's rename of its checkout event from CompletePayment to Purchase stranded exactly this kind of pair, two halves of the same purchase speaking different languages. Second, regenerated IDs: a thank-you page that mints a fresh ID on every load will deduplicate against nothing, and a page refresh becomes a second conversion. Third, double sources: two server integrations, or a native platform app plus a custom setup, both sending the same event with different IDs — each one individually correct, together a double count.

The mirror-image failure exists too, and it is quieter: events that never fire at all, because the browser half depended on a page the customer never reached. Deduplication discipline and source discipline are the same discipline — one event, one source of truth, one ID.

HOW TO CHECK YOUR OWN STACK

You do not need to take anyone's word for any of this; the platforms show their work. In Meta's Events Manager, open your dataset and look at a single event: a healthy setup shows browser and server events arriving and being deduplicated, with the deduplicated share visible in the event details. Test Events tells the same story live — fire one purchase and watch whether it lands once, marked as deduplicated, or twice as strangers. On TikTok, Test Events shows the same merge for Events API traffic.

If you see two unmerged purchases for one order, your campaigns are training on inflated numbers and every optimisation decision since then has been slightly wrong. If you see one clean, deduplicated event with a strong match score, your measurement layer is doing its job. The difference between those two states is rarely money. It is almost always just care about IDs.`,
  },
];
