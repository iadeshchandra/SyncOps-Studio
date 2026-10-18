import {
  doc,
  getDocs,
  collection,
  addDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, isDemoMode } from './firebase';
import { logAudit } from './admin';

export interface Lead {
  id: string;
  email: string;
  domain: string;
  score: number;
  grade: string;
  createdAt: number;
  read?: boolean;
}

const LOCAL_KEY = 'syncops_leads';

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full — lead stays in memory only */
  }
}

/** Save a lead from the Tracking Auditor's report form. Never throws. */
export async function saveLead(input: Omit<Lead, 'id' | 'createdAt'>): Promise<void> {
  try {
    if (!isDemoMode && db) {
      await addDoc(collection(db, 'leads'), { ...input, createdAt: Date.now() });
    } else {
      const leads = readJSON<Lead[]>(LOCAL_KEY, []);
      leads.unshift({
        ...input,
        id: `lead_${Date.now().toString(36)}`,
        createdAt: Date.now(),
      });
      writeJSON(LOCAL_KEY, leads);
    }
    await logAudit('leads.capture', `${input.email} · ${input.domain} · score ${input.score}`);
  } catch {
    /* lead capture must never break the auditor */
  }
}

/** All leads, newest first. Owner-only in live mode (rules-enforced). */
export async function listLeads(): Promise<Lead[]> {
  if (!isDemoMode && db) {
    const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((s) => ({ id: s.id, ...(s.data() as Omit<Lead, 'id'>) }));
  }
  return readJSON<Lead[]>(LOCAL_KEY, []).sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteLead(leadId: string): Promise<void> {
  if (!isDemoMode && db) {
    await deleteDoc(doc(db, 'leads', leadId));
    return;
  }
  writeJSON(
    LOCAL_KEY,
    readJSON<Lead[]>(LOCAL_KEY, []).filter((l) => l.id !== leadId)
  );
  await logAudit('leads.delete', leadId);
}
