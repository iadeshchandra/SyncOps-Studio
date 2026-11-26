import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, isDemoMode } from './firebase';
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
}

const EMPTY_SETTINGS: PaymentSettings = {
  bkashNumber: '',
  bkashQrDataUrl: '',
  wiseNote: '',
  payoneerNote: '',
};

export async function getPaymentSettings(): Promise<PaymentSettings> {
  if (!isDemoMode && db) {
    const snap = await getDoc(doc(db, 'platformConfig', 'payment'));
    if (!snap.exists()) return EMPTY_SETTINGS;
    const d = snap.data();
    return {
      bkashNumber: String(d.bkashNumber ?? ''),
      bkashQrDataUrl: String(d.bkashQrDataUrl ?? ''),
      wiseNote: String(d.wiseNote ?? ''),
      payoneerNote: String(d.payoneerNote ?? ''),
    };
  }
  try {
    return {
      ...EMPTY_SETTINGS,
      ...(JSON.parse(localStorage.getItem('syncops_payment_settings') ?? '{}') as Partial<PaymentSettings>),
    };
  } catch {
    return EMPTY_SETTINGS;
  }
}

export async function savePaymentSettings(s: PaymentSettings): Promise<void> {
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

export interface PaymentClaim {
  id: string;
  amount: number;
  currency: 'BDT' | 'USD';
  method: string;
  trxId: string;
  sender: string;
  note: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  decidedAt?: number;
  creditedUsd?: number;
}

function mapClaim(id: string, d: Record<string, unknown>): PaymentClaim {
  return {
    id,
    amount: Number(d.amount ?? 0),
    currency: d.currency === 'USD' ? 'USD' : 'BDT',
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
    currency: 'BDT' | 'USD';
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

/** Owner decision. Approving credits the order ledger in USD. */
export async function decideClaim(
  order: Order,
  claim: PaymentClaim,
  approve: boolean,
  creditedUsd: number,
): Promise<void> {
  if (!isDemoMode && db) {
    await updateDoc(doc(db, 'orders', order.id, 'claims', claim.id), {
      status: approve ? 'approved' : 'rejected',
      decidedAt: Date.now(),
      ...(approve ? { creditedUsd } : {}),
    });
  } else {
    const list = readLocalClaims(order.id).map((c) =>
      c.id === claim.id
        ? {
            ...c,
            status: approve ? ('approved' as const) : ('rejected' as const),
            decidedAt: Date.now(),
            ...(approve ? { creditedUsd } : {}),
          }
        : c,
    );
    try {
      localStorage.setItem(claimsKey(order.id), JSON.stringify(list));
    } catch {
      /* storage unavailable */
    }
  }
  if (approve) {
    const payments = [
      ...(order.payments ?? []),
      {
        amount: creditedUsd,
        method: claim.method,
        note: `${claim.currency} ${claim.amount.toLocaleString()} · TrxID ${claim.trxId}`,
        at: Date.now(),
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
      `Payment claim could not be verified — ${claim.currency} ${claim.amount.toLocaleString()} via ${claim.method} (TrxID ${claim.trxId}).`,
      'architect',
    );
    await updateOrder(order.id, { activity });
  }
}
