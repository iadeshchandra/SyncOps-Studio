import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, isDemoMode } from './firebase';

/**
 * Client profiles — one document per account at users/{uid}.
 *
 * The phone rule (owner directive, 2026-11-29): one phone number belongs to
 * exactly one client account. Firestore has no unique constraints, so the
 * number is CLAIMED in a registry collection — phoneRegistry/{+E164} — in
 * the same transaction that saves the profile. Registry writes are blind
 * (the client never reads the registry): the security rules classify a
 * write to an existing doc as an update, updates are denied, so a claim on
 * a taken number fails the whole save and the UI explains why. The profile
 * rule independently requires (getAfter) that a saved phone has a registry
 * claim in the saver's name, so a profile can never point at a number the
 * saver has not claimed.
 *
 * Verification honesty: real SMS OTP is not viable on the free plan, so a
 * claimed number starts UNVERIFIED (phoneVerified=false — the rules refuse
 * any client write that sets it true). The owner marks it verified after
 * confirming the number with the client humanly (first engagement).
 */

export interface ClientProfile {
  fullName: string;
  email: string;
  /** E.164 (+8801…) or '' when unset. */
  phone: string;
  /** E.164 or '' — may differ from the voice number. */
  whatsapp: string;
  businessName: string;
  website: string;
  country: string;
  timezone: string;
  phoneVerified: boolean;
  createdAt: number;
  updatedAt: number;
}

export const EMPTY_PROFILE: ClientProfile = {
  fullName: '',
  email: '',
  phone: '',
  whatsapp: '',
  businessName: '',
  website: '',
  country: '',
  timezone: '',
  phoneVerified: false,
  createdAt: 0,
  updatedAt: 0,
};

/* ------------------------------------------------------------------ */
/* Countries + dial codes (the markets this studio actually serves,   */
/* plus the long tail of English-speaking and Gulf/South-Asian trade) */
/* ------------------------------------------------------------------ */

export interface Country {
  name: string;
  dial: string; // without '+'
}

export const COUNTRIES: Country[] = [
  { name: 'Bangladesh', dial: '880' },
  { name: 'India', dial: '91' },
  { name: 'United States', dial: '1' },
  { name: 'United Kingdom', dial: '44' },
  { name: 'United Arab Emirates', dial: '971' },
  { name: 'Saudi Arabia', dial: '966' },
  { name: 'Pakistan', dial: '92' },
  { name: 'Nepal', dial: '977' },
  { name: 'Sri Lanka', dial: '94' },
  { name: 'Malaysia', dial: '60' },
  { name: 'Singapore', dial: '65' },
  { name: 'Indonesia', dial: '62' },
  { name: 'Philippines', dial: '63' },
  { name: 'Vietnam', dial: '84' },
  { name: 'Thailand', dial: '66' },
  { name: 'Australia', dial: '61' },
  { name: 'Canada', dial: '1' },
  { name: 'Ireland', dial: '353' },
  { name: 'Germany', dial: '49' },
  { name: 'France', dial: '33' },
  { name: 'Spain', dial: '34' },
  { name: 'Italy', dial: '39' },
  { name: 'Netherlands', dial: '31' },
  { name: 'Poland', dial: '48' },
  { name: 'Ukraine', dial: '380' },
  { name: 'Hungary', dial: '36' },
  { name: 'Slovenia', dial: '386' },
  { name: 'Bulgaria', dial: '359' },
  { name: 'South Africa', dial: '27' },
  { name: 'Nigeria', dial: '234' },
  { name: 'Kenya', dial: '254' },
  { name: 'Egypt', dial: '20' },
  { name: 'Turkey', dial: '90' },
  { name: 'Qatar', dial: '974' },
  { name: 'Kuwait', dial: '965' },
  { name: 'Oman', dial: '968' },
  { name: 'Bahrain', dial: '973' },
  { name: 'Maldives', dial: '960' },
  { name: 'Bhutan', dial: '975' },
  { name: 'Myanmar', dial: '95' },
  { name: 'Cambodia', dial: '855' },
  { name: 'Japan', dial: '81' },
  { name: 'South Korea', dial: '82' },
  { name: 'China', dial: '86' },
  { name: 'Hong Kong', dial: '852' },
  { name: 'New Zealand', dial: '64' },
  { name: 'Brazil', dial: '55' },
  { name: 'Mexico', dial: '52' },
  { name: 'Uruguay', dial: '598' },
];

export function dialForCountry(name: string): string {
  return COUNTRIES.find((c) => c.name === name)?.dial ?? '';
}

/** Country whose dial code prefixes this E.164 number (longest match). */
export function countryForE164(e164: string): Country | null {
  const digits = e164.replace(/^\+/, '');
  let best: Country | null = null;
  for (const c of COUNTRIES) {
    if (digits.startsWith(c.dial) && (!best || c.dial.length > best.dial.length)) best = c;
  }
  return best;
}

/**
 * Build an E.164 number from a country dial code + the national number the
 * client typed. Tolerates spaces, dashes, a leading trunk 0 and an already
 * international input. Returns '' when the result is not a plausible E.164.
 */
export function toE164(dial: string, raw: string): string {
  let s = (raw ?? '').replace(/[\s\-().]/g, '');
  if (!s) return '';
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  if (s.startsWith('+')) {
    return /^\+[1-9]\d{6,14}$/.test(s) ? s : '';
  }
  s = s.replace(/^0+/, ''); // trunk zero(s)
  if (!dial) return '';
  if (s.startsWith(dial) && s.length > dial.length + 6) {
    // Already carries the country code without the '+'.
    const full = `+${s}`;
    return /^\+[1-9]\d{6,14}$/.test(full) ? full : '';
  }
  const full = `+${dial}${s}`;
  return /^\+[1-9]\d{6,14}$/.test(full) ? full : '';
}

export function isE164(s: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(s);
}

/** Split an E.164 number back into (dial, national) for the form. */
export function splitE164(e164: string): { dial: string; national: string } {
  if (!e164) return { dial: '880', national: '' };
  const c = countryForE164(e164);
  if (!c) return { dial: '', national: e164.replace(/^\+/, '') };
  return { dial: c.dial, national: e164.replace(/^\+/, '').slice(c.dial.length) };
}

/* ------------------------------------------------------------------ */
/* Completeness — the 5 fields that make a profile "complete"         */
/* ------------------------------------------------------------------ */

export interface ProfileGap {
  id: 'fullName' | 'phone' | 'businessName' | 'country' | 'timezone';
  label: string;
}

export function profileProgress(p: ClientProfile | null): {
  done: number;
  total: number;
  gaps: ProfileGap[];
} {
  const gaps: ProfileGap[] = [];
  if (!p?.fullName.trim()) gaps.push({ id: 'fullName', label: 'Your name' });
  if (!p?.phone) gaps.push({ id: 'phone', label: 'Phone number' });
  if (!p?.businessName.trim()) gaps.push({ id: 'businessName', label: 'Business name' });
  if (!p?.country) gaps.push({ id: 'country', label: 'Country' });
  if (!p?.timezone) gaps.push({ id: 'timezone', label: 'Timezone' });
  return { done: 5 - gaps.length, total: 5, gaps };
}

/* ------------------------------------------------------------------ */
/* Storage                                                            */
/* ------------------------------------------------------------------ */

const DEMO_PROFILE_KEY = 'syncops_profile';
const DEMO_REGISTRY_KEY = 'syncops_phone_registry';

function demoRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function demoWrite(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

function parseProfile(raw: Record<string, unknown> | undefined): ClientProfile {
  if (!raw) return { ...EMPTY_PROFILE };
  return {
    fullName: String(raw.fullName ?? ''),
    email: String(raw.email ?? ''),
    phone: String(raw.phone ?? ''),
    whatsapp: String(raw.whatsapp ?? ''),
    businessName: String(raw.businessName ?? ''),
    website: String(raw.website ?? ''),
    country: String(raw.country ?? ''),
    timezone: String(raw.timezone ?? ''),
    phoneVerified: raw.phoneVerified === true,
    createdAt: Number(raw.createdAt ?? 0),
    updatedAt: Number(raw.updatedAt ?? 0),
  };
}

export async function loadProfile(uid: string): Promise<ClientProfile | null> {
  if (isDemoMode || !db) {
    const all = demoRead<Record<string, ClientProfile>>(DEMO_PROFILE_KEY, {});
    return all[uid] ?? null;
  }
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? parseProfile(snap.data() as Record<string, unknown>) : null;
}

/** Owner-side lookup by email (console Clients tab). */
export async function loadProfileByEmail(
  email: string,
): Promise<{ uid: string; profile: ClientProfile } | null> {
  if (isDemoMode || !db) return null;
  const q = query(
    collection(db, 'users'),
    where('email', '==', email.trim().toLowerCase()),
  );
  const snaps = await getDocs(q);
  const first = snaps.docs[0];
  return first
    ? { uid: first.id, profile: parseProfile(first.data() as Record<string, unknown>) }
    : null;
}

export class PhoneTakenError extends Error {
  constructor() {
    super(
      'This phone number is already registered to another account. If it is yours, sign in to that account — or contact the studio and we will sort it out.',
    );
    this.name = 'PhoneTakenError';
  }
}

/**
 * Save the profile, claiming/releasing phone registry entries in the same
 * transaction. Throws PhoneTakenError when the number belongs to another
 * account. `previous` is the profile as last loaded (for the old number).
 */
export async function saveProfile(
  uid: string,
  email: string,
  next: ClientProfile,
  previous: ClientProfile | null,
): Promise<ClientProfile> {
  const now = Date.now();
  const clean: ClientProfile = {
    ...next,
    fullName: next.fullName.trim(),
    email: email.trim().toLowerCase(),
    businessName: next.businessName.trim(),
    website: next.website.trim(),
    // A client write can never verify a number, and changing the number
    // resets verification — the rules enforce the same on their side.
    phoneVerified: previous && previous.phone === next.phone ? previous.phoneVerified : false,
    createdAt: previous?.createdAt || next.createdAt || now,
    updatedAt: now,
  };

  if (isDemoMode || !db) {
    const registry = demoRead<Record<string, string>>(DEMO_REGISTRY_KEY, {});
    if (clean.phone) {
      const holder = registry[clean.phone];
      if (holder && holder !== uid) throw new PhoneTakenError();
    }
    if (previous?.phone && previous.phone !== clean.phone && registry[previous.phone] === uid) {
      delete registry[previous.phone];
    }
    if (clean.phone) registry[clean.phone] = uid;
    demoWrite(DEMO_REGISTRY_KEY, registry);
    const all = demoRead<Record<string, ClientProfile>>(DEMO_PROFILE_KEY, {});
    all[uid] = clean;
    demoWrite(DEMO_PROFILE_KEY, all);
    return clean;
  }

  const liveDb = db;
  const userRef = doc(liveDb, 'users', uid);
  const newPhone = clean.phone;
  const oldPhone = previous?.phone ?? '';
  try {
    await runTransaction(liveDb, async (tx) => {
      if (oldPhone && oldPhone !== newPhone) {
        tx.delete(doc(liveDb, 'phoneRegistry', oldPhone));
      }
      if (newPhone && newPhone !== oldPhone) {
        // Blind claim: if this doc already exists the rules treat the
        // write as an update, updates are denied, and the transaction
        // fails — that failure IS the uniqueness guarantee.
        tx.set(doc(liveDb, 'phoneRegistry', newPhone), { uid, claimedAt: now });
      }
      tx.set(userRef, { ...clean });
    });
  } catch (err) {
    const code = (err as { code?: string } | null)?.code ?? '';
    if (newPhone && newPhone !== oldPhone && code.includes('permission-denied')) {
      throw new PhoneTakenError();
    }
    throw err;
  }
  return clean;
}

/** Release the phone claim + delete the profile (account deletion, step 1). */
export async function releaseProfileAndPhone(uid: string, phone: string): Promise<void> {
  if (isDemoMode || !db) {
    const registry = demoRead<Record<string, string>>(DEMO_REGISTRY_KEY, {});
    if (phone && registry[phone] === uid) delete registry[phone];
    demoWrite(DEMO_REGISTRY_KEY, registry);
    const all = demoRead<Record<string, ClientProfile>>(DEMO_PROFILE_KEY, {});
    delete all[uid];
    demoWrite(DEMO_PROFILE_KEY, all);
    return;
  }
  const liveDb = db;
  await runTransaction(liveDb, async (tx) => {
    if (phone) tx.delete(doc(liveDb, 'phoneRegistry', phone));
    tx.delete(doc(liveDb, 'users', uid));
  });
}

/** Owner action: mark a client's phone verified/unverified (console). */
export async function setPhoneVerified(uid: string, verified: boolean): Promise<void> {
  if (isDemoMode || !db) return;
  await updateDoc(doc(db, 'users', uid), { phoneVerified: verified, updatedAt: Date.now() });
}
