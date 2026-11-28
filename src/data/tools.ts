/**
 * Studio Tools — the one editable data file for every free tool.
 *
 * Assumptions, presets and signature-style tables live here (never inside
 * page components) so a number can be corrected in one place. Date-stamp
 * every change: tool pages print TOOLS_UPDATED so visitors — and the
 * studio — can see how fresh the assumptions are.
 */

export const TOOLS_UPDATED = '2026-11-29';
export const TOOLS_UPDATED_LABEL = 'November 2026';

export interface ToolMeta {
  slug: string;
  name: string;
  blurb: string;
  status: 'live' | 'soon';
  phase: string;
}

export const TOOLS: ToolMeta[] = [
  {
    slug: 'lost-conversions-calculator',
    name: 'Lost-Conversions Calculator',
    blurb:
      'Estimate how many conversions your ad platforms never see — and what recovering a conservative share of them is worth each month.',
    status: 'live',
    phase: 'Free · no sign-up',
  },
  {
    slug: 'utm-builder',
    name: 'UTM Builder for Ecommerce',
    blurb:
      'Campaign URLs with Shopify, Meta, Google and TikTok presets, lowercase enforcement, bulk mode and CSV export.',
    status: 'live',
    phase: 'Free · no sign-up',
  },
  {
    slug: 'datalayer-validator',
    name: 'GA4 dataLayer Validator',
    blurb: 'Paste a dataLayer event and check it against the GA4 ecommerce specification.',
    status: 'soon',
    phase: 'Coming next',
  },
  {
    slug: 'tracking-checker',
    name: 'Website Tracking Checker — Lite',
    blurb:
      'A scan of your homepage’s publicly visible code and published GTM container for tracking signatures — with the evidence shown.',
    status: 'soon',
    phase: 'In build',
  },
  {
    slug: 'consent-mode-checker',
    name: 'Consent Mode v2 Checker & Generator',
    blurb: 'Check the four Consent Mode v2 signals in your snippet — and generate a correct default snippet to copy.',
    status: 'soon',
    phase: 'Planned',
  },
  {
    slug: 'sgtm-cost-estimator',
    name: 'Server-Side GTM Cost Estimator',
    blurb: 'Sessions and events in, an honest monthly hosting-cost range out — before anyone sells you a server.',
    status: 'soon',
    phase: 'Planned',
  },
];

/* ------------------------------------------------------------------ */
/* Lost-conversions calculator                                         */
/* ------------------------------------------------------------------ */

/**
 * The model, deliberately conservative and shown on the page:
 *
 *   missed conversions      = monthly orders × missed share
 *   recoverable conversions = missed × recovery band (30–50%)
 *   recoverable revenue     = recoverable conversions × average order value
 *
 * "Missed share" is the portion of real conversions ad platforms fail to
 * record because of Safari/Firefox tracking prevention, ad blockers and
 * consent refusals under browser-only (pixel) tracking. The platform
 * presets below are starting points inside the commonly reported
 * 10–30% range — the visitor can move the slider; nothing is hidden.
 * The recovery band is NOT 100%: server-side tracking recovers a share
 * of the missed events, never all of them.
 */
export const RECOVERY_BAND = { low: 0.3, high: 0.5 } as const;

export interface PlatformPreset {
  id: string;
  label: string;
  missedShare: number; // 0–1
  note: string;
}

export const PLATFORM_PRESETS: PlatformPreset[] = [
  {
    id: 'meta',
    label: 'Meta (Facebook / Instagram)',
    missedShare: 0.25,
    note: 'iOS and Safari weigh heaviest here — Apple’s tracking prevention hits Meta’s browser pixel hardest.',
  },
  {
    id: 'google',
    label: 'Google Ads',
    missedShare: 0.15,
    note: 'Google’s own signals and signed-in users soften the loss; blockers and consent refusals still bite.',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    missedShare: 0.2,
    note: 'A young, mobile-first audience — mostly in-app browsers and Safari, where browser pixels lose the most.',
  },
  {
    id: 'mixed',
    label: 'A mix of platforms',
    missedShare: 0.2,
    note: 'A blended starting point across Meta, Google and TikTok traffic.',
  },
];

/* ------------------------------------------------------------------ */
/* UTM builder                                                         */
/* ------------------------------------------------------------------ */

export interface UtmPreset {
  id: string;
  label: string;
  source: string;
  medium: string;
  hint: string;
}

export const UTM_PRESETS: UtmPreset[] = [
  { id: 'meta-feed', label: 'Meta — Feed / Stories', source: 'facebook', medium: 'paid_social', hint: 'Use instagram as the source for Instagram-only placements.' },
  { id: 'meta-ig', label: 'Meta — Instagram', source: 'instagram', medium: 'paid_social', hint: 'Keep the campaign name identical to the Meta campaign for clean GA4 matching.' },
  { id: 'google-search', label: 'Google Ads — Search', source: 'google', medium: 'cpc', hint: 'GA4 expects medium cpc for paid search; do not invent variants.' },
  { id: 'google-pmax', label: 'Google Ads — Performance Max', source: 'google', medium: 'cpc', hint: 'PMax auto-tagging covers most cases; UTMs help inside GA4 reports.' },
  { id: 'tiktok', label: 'TikTok Ads', source: 'tiktok', medium: 'paid_social', hint: 'Mirror the TikTok campaign name so platform and GA4 numbers reconcile.' },
  { id: 'pinterest', label: 'Pinterest Ads', source: 'pinterest', medium: 'paid_social', hint: 'Same paid_social medium as Meta/TikTok keeps channel grouping tidy.' },
  { id: 'klaviyo', label: 'Klaviyo — Campaign', source: 'klaviyo', medium: 'email', hint: 'Use the flow/campaign name as utm_campaign, e.g. bfcm_hero_send.' },
  { id: 'klaviyo-flow', label: 'Klaviyo — Flow', source: 'klaviyo', medium: 'email', hint: 'Name flows once (welcome_series, abandoned_cart) and never rename them.' },
  { id: 'organic-social', label: 'Organic social post', source: 'facebook', medium: 'social', hint: 'Swap the source per network; medium social separates it from paid.' },
];
