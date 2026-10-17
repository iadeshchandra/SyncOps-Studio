import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, isDemoMode } from './firebase';
import { useAuth } from './auth';

/**
 * Owner / admin primitives for the Studio Console.
 *
 * Two operating modes, mirroring the rest of the app:
 *  - DEMO (no Firebase env): the demo client (demo@syncops.studio) is admin;
 *    state lives in localStorage.
 *  - LIVE: admin = owner email (VITE_OWNER_EMAILS) OR a successful read of
 *    `platformConfig/admins`, a doc whose Firestore rule is owner-only, so a
 *    successful read proves ownership.
 */

export const OWNER_EMAILS: string[] = (
  (import.meta.env.VITE_OWNER_EMAILS as string | undefined) ?? ''
)
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return OWNER_EMAILS.includes(email.trim().toLowerCase());
}

export function useIsAdmin(): { isAdmin: boolean; loading: boolean } {
  const { user, loading: authLoading } = useAuth();
  const [probe, setProbe] = useState<'pending' | 'admin' | 'denied'>('pending');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setProbe('denied');
      return;
    }
    if (isDemoMode) {
      setProbe(user.email === 'demo@syncops.studio' ? 'admin' : 'denied');
      return;
    }
    if (isOwnerEmail(user.email)) {
      setProbe('admin');
      return;
    }
    if (!db) {
      setProbe('denied');
      return;
    }
    // Ownership proof: rules on this doc are owner-only, so a successful
    // read (even of a missing doc) means the requester passed the owner rule.
    let cancelled = false;
    getDoc(doc(db, 'platformConfig', 'admins'))
      .then(() => {
        if (!cancelled) setProbe('admin');
      })
      .catch(() => {
        if (!cancelled) setProbe('denied');
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return { isAdmin: probe === 'admin', loading: authLoading || probe === 'pending' };
}

/* ---------------- append-only audit log ---------------- */

export interface AuditEntry {
  id: string;
  action: string;
  details?: string;
  actor: string;
  createdAt: number;
}

const AUDIT_KEY = 'syncops_audit';

function readAuditLS(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    return raw ? (JSON.parse(raw) as AuditEntry[]) : [];
  } catch {
    return [];
  }
}

/** Records a console action. Never throws. */
export async function logAudit(action: string, details?: string, actor?: string): Promise<void> {
  const entry = {
    action,
    details: details ?? '',
    actor: actor ?? 'console',
    createdAt: Date.now(),
  };
  try {
    if (!isDemoMode && db) {
      await addDoc(collection(db, 'audit_logs'), entry);
      return;
    }
    const prev = readAuditLS();
    prev.unshift({ id: `audit-${Date.now().toString(36)}`, ...entry });
    localStorage.setItem(AUDIT_KEY, JSON.stringify(prev.slice(0, 200)));
  } catch {
    /* audit is best-effort — never break the console over it */
  }
}

/** Newest-first audit entries. Never throws; returns [] on failure. */
export async function readAuditLog(limitN = 100): Promise<AuditEntry[]> {
  try {
    if (!isDemoMode && db) {
      const q = query(collection(db, 'audit_logs'), orderBy('createdAt', 'desc'), limit(limitN));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AuditEntry, 'id'>) }));
    }
    return readAuditLS().slice(0, limitN);
  } catch {
    return [];
  }
}
