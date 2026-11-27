import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  setDoc,
  runTransaction,
  query,
  orderBy,
} from 'firebase/firestore';
import { auth, db, isDemoMode } from './firebase';
import { updateOrder, appendActivity, type Order } from './portal';

/**
 * Payments are COORDINATION, never custody (the Sanatani Bandhan law):
 * clients pay the studio directly — bKash Send Money, Wise, Payoneer —
 * then claim the payment in the portal. The owner verifies (TrxID) and
 * approves, and only then is the order's ledger credited.
 */

export interface PaymentSettings {
  bkashNumber: string;
  bkashQrDataUrl: string;
  wiseNote: string;
  payoneerNote: string;
  /** Geo payment methods — the Sanatani Bandhan system (see below). */
  methods: PaymentMethodConfig[];
}

/* ------------------------------------------------------------------ */
/* Geo payment methods — ported from Sanatani Bandhan's system:        */
/* regions (BD / IN / INTL) each carry owner-configured methods with   */
/* QR images, account details and step-by-step instructions. The       */
/* client portal auto-detects the visitor's region (lib/geo.ts) and    */
/* shows that region's methods first; the client can always switch.    */
/* The four legacy fields above are mirrors of the matching methods,   */
/* kept so older reads keep working.                                   */
/* ------------------------------------------------------------------ */

export type PayRegionId = 'BD' | 'IN' | 'INTL';

export interface PayRegion {
  id: PayRegionId;
  name: string;
  flag: string;
  currency: 'BDT' | 'INR' | 'USD';
  currencySymbol: string;
}

export const PAY_REGIONS: PayRegion[] = [
  { id: 'BD', name: 'Bangladesh', flag: '🇧🇩', currency: 'BDT', currencySymbol: '৳' },
  { id: 'IN', name: 'India', flag: '🇮🇳', currency: 'INR', currencySymbol: '₹' },
  { id: 'INTL', name: 'International', flag: '🌍', currency: 'USD', currencySymbol: '$' },
];

export type PaymentMethodType = 'bangla_qr' | 'mobile' | 'upi' | 'wise' | 'payoneer';

export interface PaymentMethodConfig {
  id: string;
  region: PayRegionId;
  type: PaymentMethodType;
  /** The name the client sees, and the value stored on claims. */
  label: string;
  enabled: boolean;
  /** Mobile number (bKash/Nagad) or UPI id. */
  number?: string;
  /** Wise / Payoneer account details text. */
  details?: string;
  /** A payment link (Wise / Payoneer / bank pay-link) — clients get a
   *  real "Pay via link" button in the portal. */
  link?: string;
  /** QR image as a vault data URL. */
  qrDataUrl?: string;
  /** Payment steps, shown numbered to the client. */
  instructions: string[];
}

/** The studio's method catalogue — the owner edits details in the console. */
export function seedMethods(legacy: {
  bkashNumber: string;
  bkashQrDataUrl: string;
  wiseNote: string;
  payoneerNote: string;
}): PaymentMethodConfig[] {
  return [
    {
      id: 'bd_bangla_qr',
      region: 'BD',
      type: 'bangla_qr',
      label: 'Bangla QR',
      enabled: Boolean(legacy.bkashQrDataUrl),
      qrDataUrl: legacy.bkashQrDataUrl || undefined,
      instructions: [
        'Open bKash, Nagad or any banking app',
        'Tap QR Scan and scan the code',
        'Enter the amount and confirm with your PIN',
        'Copy the Transaction ID and submit your claim below',
      ],
    },
    {
      id: 'bd_bkash',
      region: 'BD',
      type: 'mobile',
      label: 'bKash',
      enabled: true,
      number: legacy.bkashNumber || undefined,
      instructions: [
        'Use the Send Money option in your bKash app',
        'Copy the Transaction ID and submit your claim below',
      ],
    },
    {
      id: 'bd_nagad',
      region: 'BD',
      type: 'mobile',
      label: 'Nagad',
      enabled: false,
      instructions: [
        'Use the Send Money option in your Nagad app',
        'Copy the Transaction ID and submit your claim below',
      ],
    },
    {
      id: 'in_upi',
      region: 'IN',
      type: 'upi',
      label: 'UPI',
      enabled: false,
      instructions: [
        'Pay to the UPI ID from any UPI app (GPay, PhonePe, Paytm)',
        'Copy the UPI Ref / UTR number and submit your claim below',
      ],
    },
    {
      id: 'intl_wise',
      region: 'INTL',
      type: 'wise',
      label: 'Wise',
      enabled: true,
      details: legacy.wiseNote || undefined,
      instructions: [
        'Send to the Wise details above',
        'Copy the transfer reference and submit your claim below',
      ],
    },
    {
      id: 'intl_payoneer',
      region: 'INTL',
      type: 'payoneer',
      label: 'Payoneer',
      enabled: true,
      details: legacy.payoneerNote || undefined,
      instructions: [
        'Send to the Payoneer details above',
        'Copy the transaction ID and submit your claim below',
      ],
    },
  ];
}

function parseMethods(raw: unknown, legacy: {
  bkashNumber: string;
  bkashQrDataUrl: string;
  wiseNote: string;
  payoneerNote: string;
}): PaymentMethodConfig[] {
  if (!Array.isArray(raw) || raw.length === 0) return seedMethods(legacy);
  const byId = new Map(seedMethods(legacy).map((m) => [m.id, m]));
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const d = item as Record<string, unknown>;
    const base = byId.get(String(d.id ?? ''));
    if (!base) continue;
    byId.set(base.id, {
      ...base,
      label: typeof d.label === 'string' && d.label ? d.label : base.label,
      enabled: typeof d.enabled === 'boolean' ? d.enabled : base.enabled,
      number: typeof d.number === 'string' ? d.number : undefined,
      details: typeof d.details === 'string' ? d.details : undefined,
      link: typeof d.link === 'string' ? d.link : undefined,
      qrDataUrl: typeof d.qrDataUrl === 'string' ? d.qrDataUrl : undefined,
      instructions: Array.isArray(d.instructions)
        ? d.instructions.map(String).filter(Boolean)
        : base.instructions,
    });
  }
  return [...byId.values()];
}

/** Keep the legacy mirror fields in step with the method catalogue. */
function withMirrors(s: PaymentSettings): PaymentSettings {
  const get = (id: string) => s.methods.find((m) => m.id === id);
  return {
    ...s,
    bkashNumber: get('bd_bkash')?.number ?? '',
    bkashQrDataUrl: get('bd_bangla_qr')?.qrDataUrl ?? '',
    wiseNote: get('intl_wise')?.details ?? '',
    payoneerNote: get('intl_payoneer')?.details ?? '',
  };
}

const EMPTY_SETTINGS: PaymentSettings = {
  bkashNumber: '',
  bkashQrDataUrl: '',
  wiseNote: '',
  payoneerNote: '',
  methods: seedMethods({ bkashNumber: '', bkashQrDataUrl: '', wiseNote: '', payoneerNote: '' }),
};

export async function getPaymentSettings(): Promise<PaymentSettings> {
  if (!isDemoMode && db) {
    const snap = await getDoc(doc(db, 'platformConfig', 'payment'));
    if (!snap.exists()) return EMPTY_SETTINGS;
    const d = snap.data();
    const legacy = {
      bkashNumber: String(d.bkashNumber ?? ''),
      bkashQrDataUrl: String(d.bkashQrDataUrl ?? ''),
      wiseNote: String(d.wiseNote ?? ''),
      payoneerNote: String(d.payoneerNote ?? ''),
    };
    return { ...legacy, methods: parseMethods(d.methods, legacy) };
  }
  try {
    const stored = JSON.parse(
      localStorage.getItem('syncops_payment_settings') ?? '{}',
    ) as Partial<PaymentSettings>;
    const legacy = {
      bkashNumber: stored.bkashNumber ?? '',
      bkashQrDataUrl: stored.bkashQrDataUrl ?? '',
      wiseNote: stored.wiseNote ?? '',
      payoneerNote: stored.payoneerNote ?? '',
    };
    return { ...legacy, methods: parseMethods(stored.methods, legacy) };
  } catch {
    return EMPTY_SETTINGS;
  }
}

export async function savePaymentSettings(input: PaymentSettings): Promise<void> {
  // Firestore rejects `undefined` field values outright — and the method
  // catalogue legitimately carries empty slots (a method with no QR yet,
  // no number yet). A JSON round-trip drops undefined keys at every depth
  // before the write. (This is why the first live save failed while demo
  // mode, which stores JSON anyway, silently worked.)
  const s = JSON.parse(JSON.stringify(withMirrors(input))) as PaymentSettings;
  if (!isDemoMode && db) {
    await setDoc(doc(db, 'platformConfig', 'payment'), { ...s });
    return;
  }
  try {
    localStorage.setItem('syncops_payment_settings', JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}

/* ------------------------------------------------------------------ */
/* Payment-method change history — append-only. Every save that        */
/* changes a method files a full snapshot of that method (number,      */
/* details, link, QR, instructions, on/off) plus the list of fields    */
/* that changed and who saved it. Entries are never edited or          */
/* deleted (the security rules forbid it), so the console can show     */
/* the complete history of every number / QR / link the studio has     */
/* ever published, and restore any past version in one click.          */
/* ------------------------------------------------------------------ */

export interface PaymentMethodHistoryEntry {
  id: string;
  methodId: string;
  at: number;
  by: string;
  changedFields: string[];
  /** The method exactly as this change saved it. */
  snapshot: PaymentMethodConfig;
  /** False when the QR image was too large to archive (see below). */
  qrArchived: boolean;
}

const FIELD_LABELS: [keyof PaymentMethodConfig, string][] = [
  ['label', 'name'],
  ['enabled', 'on/off'],
  ['number', 'number'],
  ['details', 'account details'],
  ['link', 'payment link'],
  ['qrDataUrl', 'QR image'],
  ['instructions', 'instructions'],
];

export function methodChangedFields(a: PaymentMethodConfig, b: PaymentMethodConfig): string[] {
  return FIELD_LABELS.filter(
    ([k]) => JSON.stringify(a[k] ?? null) !== JSON.stringify(b[k] ?? null),
  ).map(([, label]) => label);
}

const HISTORY_KEY = 'syncops_payment_history';

function readLocalHistory(): PaymentMethodHistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as PaymentMethodHistoryEntry[];
  } catch {
    return [];
  }
}

function coerceMethod(raw: unknown): PaymentMethodConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  if (typeof d.id !== 'string') return null;
  return {
    id: d.id,
    region: (d.region === 'IN' || d.region === 'INTL' ? d.region : 'BD') as PayRegionId,
    type: (typeof d.type === 'string' ? d.type : 'mobile') as PaymentMethodType,
    label: String(d.label ?? d.id),
    enabled: d.enabled === true,
    number: typeof d.number === 'string' ? d.number : undefined,
    details: typeof d.details === 'string' ? d.details : undefined,
    link: typeof d.link === 'string' ? d.link : undefined,
    qrDataUrl: typeof d.qrDataUrl === 'string' ? d.qrDataUrl : undefined,
    instructions: Array.isArray(d.instructions) ? d.instructions.map(String) : [],
  };
}

function mapHistoryEntry(id: string, d: Record<string, unknown>): PaymentMethodHistoryEntry | null {
  const snapshot = coerceMethod(d.snapshot);
  if (!snapshot) return null;
  return {
    id,
    methodId: String(d.methodId ?? snapshot.id),
    at: Number(d.at ?? 0),
    by: String(d.by ?? 'owner'),
    changedFields: Array.isArray(d.changedFields) ? d.changedFields.map(String) : [],
    snapshot,
    qrArchived: d.qrArchived !== false,
  };
}

export async function listMethodHistory(methodId: string): Promise<PaymentMethodHistoryEntry[]> {
  if (!isDemoMode && db) {
    const snap = await getDocs(
      query(collection(db, 'platformConfig', 'payment', 'history'), orderBy('at', 'desc')),
    );
    return snap.docs
      .map((d) => mapHistoryEntry(d.id, d.data()))
      .filter((e): e is PaymentMethodHistoryEntry => e !== null && e.methodId === methodId);
  }
  return readLocalHistory()
    .filter((e) => e.methodId === methodId)
    .sort((a, b) => b.at - a.at);
}

/**
 * The console's save path: writes the settings AND files a history
 * snapshot for every method that actually changed. (Plain
 * savePaymentSettings stays for non-console writers.)
 */
export async function savePaymentSettingsWithHistory(input: PaymentSettings): Promise<void> {
  const prev = await getPaymentSettings();
  const next = JSON.parse(JSON.stringify(withMirrors(input))) as PaymentSettings;
  const by = auth?.currentUser?.email ?? 'owner';
  const at = Date.now();
  const entries: PaymentMethodHistoryEntry[] = [];
  for (const m of next.methods) {
    const before = prev.methods.find((x) => x.id === m.id);
    const changed = before ? methodChangedFields(before, m) : ['first recorded version'];
    if (changed.length === 0) continue;
    // Firestore's 1 MiB document cap: a snapshot carries one QR image.
    // If one ever grows too large, archive everything except the image
    // and say so honestly (qrArchived=false) instead of failing the save.
    let snapshot = m;
    let qrArchived = Boolean(m.qrDataUrl);
    if (JSON.stringify(m).length > 900_000) {
      snapshot = { ...m, qrDataUrl: undefined };
      qrArchived = false;
    }
    entries.push({
      id: `h-${at.toString(36)}-${m.id}`,
      methodId: m.id,
      at,
      by,
      changedFields: changed,
      snapshot,
      qrArchived,
    });
  }
  await savePaymentSettings(next);
  if (entries.length === 0) return;
  if (!isDemoMode && db) {
    for (const e of entries) {
      const { id: _id, ...data } = e;
      void _id;
      await addDoc(
        collection(db, 'platformConfig', 'payment', 'history'),
        JSON.parse(JSON.stringify(data)) as Record<string, unknown>,
      );
    }
    return;
  }
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([...entries, ...readLocalHistory()]));
  } catch {
    /* storage unavailable */
  }
}

export interface PaymentClaim {
  id: string;
  amount: number;
  currency: 'BDT' | 'INR' | 'USD';
  method: string;
  trxId: string;
  sender: string;
  note: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  decidedAt?: number;
  creditedUsd?: number;
  /** Owner's note on the decision — shown to the client (F-10). */
  decisionNote?: string;
}

function mapClaim(id: string, d: Record<string, unknown>): PaymentClaim {
  return {
    id,
    amount: Number(d.amount ?? 0),
    currency: d.currency === 'USD' ? 'USD' : d.currency === 'INR' ? 'INR' : 'BDT',
    method: String(d.method ?? 'bKash'),
    trxId: String(d.trxId ?? ''),
    sender: String(d.sender ?? ''),
    note: String(d.note ?? ''),
    status: (['pending', 'approved', 'rejected'] as const).includes(d.status as 'pending')
      ? (d.status as PaymentClaim['status'])
      : 'pending',
    createdAt: Number(d.createdAt ?? Date.now()),
    decidedAt: typeof d.decidedAt === 'number' ? d.decidedAt : undefined,
    creditedUsd: typeof d.creditedUsd === 'number' ? d.creditedUsd : undefined,
    decisionNote: typeof d.decisionNote === 'string' ? d.decisionNote : undefined,
  };
}

const claimsKey = (orderId: string) => `syncops_claims_${orderId}`;

function readLocalClaims(orderId: string): PaymentClaim[] {
  try {
    return JSON.parse(localStorage.getItem(claimsKey(orderId)) ?? '[]') as PaymentClaim[];
  } catch {
    return [];
  }
}

export async function listClaims(orderId: string): Promise<PaymentClaim[]> {
  if (!isDemoMode && db) {
    const snap = await getDocs(
      query(collection(db, 'orders', orderId, 'claims'), orderBy('createdAt', 'desc')),
    );
    return snap.docs.map((d) => mapClaim(d.id, d.data()));
  }
  return [...readLocalClaims(orderId)].sort((a, b) => b.createdAt - a.createdAt);
}

export async function createClaim(
  orderId: string,
  input: {
    amount: number;
    currency: 'BDT' | 'INR' | 'USD';
    method: string;
    trxId: string;
    sender: string;
    note: string;
  },
): Promise<void> {
  if (!input.amount || input.amount <= 0) throw new Error('Enter the amount you paid.');
  if (input.trxId.trim().length < 4) {
    throw new Error('Enter the transaction ID / reference from your payment app.');
  }
  const payload = { ...input, trxId: input.trxId.trim(), status: 'pending' as const, createdAt: Date.now() };
  if (!isDemoMode && db) {
    await addDoc(collection(db, 'orders', orderId, 'claims'), payload);
    return;
  }
  const entry: PaymentClaim = { id: `demo-claim-${Date.now().toString(36)}`, ...payload };
  try {
    localStorage.setItem(claimsKey(orderId), JSON.stringify([entry, ...readLocalClaims(orderId)]));
  } catch {
    /* storage unavailable */
  }
}

/**
 * Owner decision. Approving credits the order ledger in USD.
 *
 * Deep Review #2 (B-04/C-07): the decision is ONE transaction — the claim
 * is re-read inside it and must still be pending, so a double-click, a
 * retry, or a stale console snapshot can never credit twice. The credited
 * ledger entry carries the claimId, making every credit traceable.
 */
export async function decideClaim(
  order: Order,
  claim: PaymentClaim,
  approve: boolean,
  creditedUsd: number,
  decisionNote?: string,
): Promise<void> {
  if (approve && !(creditedUsd > 0)) {
    throw new Error('Enter the USD amount to credit for this claim first.');
  }
  if (!isDemoMode && db) {
    const claimRef = doc(db, 'orders', order.id, 'claims', claim.id);
    const orderRef = doc(db, 'orders', order.id);
    const note = `${claim.currency} ${claim.amount.toLocaleString()} via ${claim.method} (TrxID ${claim.trxId})`;
    await runTransaction(db, async (tx) => {
      const claimSnap = await tx.get(claimRef);
      if (!claimSnap.exists() || claimSnap.data().status !== 'pending') {
        throw new Error('This claim was already decided — refresh the order before deciding again.');
      }
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists()) throw new Error('Order not found.');
      const data = orderSnap.data();
      const now = Date.now();
      const activity = Array.isArray(data.activity) ? [...data.activity] : [];
      tx.update(claimRef, {
        status: approve ? 'approved' : 'rejected',
        decidedAt: now,
        ...(approve ? { creditedUsd } : {}),
        ...(decisionNote ? { decisionNote } : {}),
      });
      if (approve) {
        const payments = Array.isArray(data.payments) ? [...data.payments] : [];
        payments.push({
          amount: creditedUsd,
          method: claim.method,
          note: `${claim.currency} ${claim.amount.toLocaleString()} · TrxID ${claim.trxId}`,
          at: now,
          claimId: claim.id,
        });
        activity.push({
          kind: 'payment',
          text: `Payment verified — ${note}, credited $${creditedUsd}.`,
          at: now,
          by: 'architect',
        });
        tx.update(orderRef, { payments, activity });
      } else {
        activity.push({
          kind: 'payment',
          text: `Payment claim could not be verified — ${note}.${decisionNote ? ` Studio note: ${decisionNote}` : ''}`,
          at: now,
          by: 'architect',
        });
        tx.update(orderRef, { activity });
      }
    });
    return;
  }
  // Demo mode: same pending guard against the local copy.
  const local = readLocalClaims(order.id).find((c) => c.id === claim.id);
  if (!local || local.status !== 'pending') {
    throw new Error('This claim was already decided — refresh the order before deciding again.');
  }
  const list = readLocalClaims(order.id).map((c) =>
    c.id === claim.id
      ? {
          ...c,
          status: approve ? ('approved' as const) : ('rejected' as const),
          decidedAt: Date.now(),
          ...(approve ? { creditedUsd } : {}),
          ...(decisionNote ? { decisionNote } : {}),
        }
      : c,
  );
  try {
    localStorage.setItem(claimsKey(order.id), JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
  if (approve) {
    const payments = [
      ...(order.payments ?? []),
      {
        amount: creditedUsd,
        method: claim.method,
        note: `${claim.currency} ${claim.amount.toLocaleString()} · TrxID ${claim.trxId}`,
        at: Date.now(),
        claimId: claim.id,
      },
    ];
    const activity = appendActivity(
      order,
      'payment',
      `Payment verified — ${claim.currency} ${claim.amount.toLocaleString()} via ${claim.method} (TrxID ${claim.trxId}), credited $${creditedUsd}.`,
      'architect',
    );
    await updateOrder(order.id, { payments, activity });
  } else {
    const activity = appendActivity(
      order,
      'payment',
      `Payment claim could not be verified — ${claim.currency} ${claim.amount.toLocaleString()} via ${claim.method} (TrxID ${claim.trxId}).${decisionNote ? ` Studio note: ${decisionNote}` : ''}`,
      'architect',
    );
    await updateOrder(order.id, { activity });
  }
}