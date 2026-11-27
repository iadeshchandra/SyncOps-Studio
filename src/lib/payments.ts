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
  /** Owner's note on the decision — shown to the client (F-10). */
  decisionNote?: string;
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