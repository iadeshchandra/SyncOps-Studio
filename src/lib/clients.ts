import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, isDemoMode } from './firebase';
import type { Order } from './portal';

export interface ClientSummary {
  email: string;
  name: string;
  orders: Order[];
  activeCount: number;
  totalValue: number;
  lastActivityAt: number;
}

/** Group orders into one row per client (by email), newest activity first. */
export function summarizeClients(
  orders: Order[],
  priceOf: (packageId: string) => number,
): ClientSummary[] {
  const byEmail = new Map<string, Order[]>();
  for (const o of orders) {
    const key = o.clientEmail.trim().toLowerCase();
    if (!key) continue;
    const arr = byEmail.get(key) ?? [];
    arr.push(o);
    byEmail.set(key, arr);
  }
  const out: ClientSummary[] = [];
  for (const [email, list] of byEmail) {
    const sorted = [...list].sort((a, b) => b.createdAt - a.createdAt);
    out.push({
      email,
      name: sorted[0]?.clientName ?? email,
      orders: sorted,
      activeCount: list.filter((o) => o.status !== 'archived' && o.status !== 'completed')
        .length,
      totalValue: list.reduce((sum, o) => sum + priceOf(o.packageId), 0),
      lastActivityAt: Math.max(...list.map((o) => o.createdAt)),
    });
  }
  return out.sort((a, b) => b.lastActivityAt - a.lastActivityAt);
}

/* Private studio notes — owner-only `clients/{email}` docs (rules-gated). */

const NOTES_KEY = 'syncops_client_notes';

function readNotes(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(NOTES_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

export async function getClientNote(email: string): Promise<string> {
  const key = email.trim().toLowerCase();
  if (!isDemoMode && db) {
    const snap = await getDoc(doc(db, 'clients', key));
    const note = snap.exists() ? snap.data().note : '';
    return typeof note === 'string' ? note : '';
  }
  return readNotes()[key] ?? '';
}

export async function saveClientNote(email: string, note: string): Promise<void> {
  const key = email.trim().toLowerCase();
  if (!isDemoMode && db) {
    await setDoc(doc(db, 'clients', key), { note: note.trim(), updatedAt: Date.now() });
    return;
  }
  const notes = readNotes();
  notes[key] = note.trim();
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch {
    /* storage unavailable */
  }
}
