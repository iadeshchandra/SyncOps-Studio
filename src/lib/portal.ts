import {
  doc,
  getDoc,
  getDocs,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db, isDemoMode } from './firebase';

export interface Order {
  id: string;
  clientName: string;
  clientEmail: string;
  brandUrl: string;
  packageId: string;
  packageName: string;
  status: string;
  stageIndex: number;
  adSpend: number;
  createdAt: number;
  deadlineAt: number;
}

export interface OrderMessage {
  id: string;
  orderId: string;
  sender: 'client' | 'architect';
  body: string;
  createdAt: number;
}

export interface RevisionRequest {
  id: string;
  orderId: string;
  type: 'addition' | 'change' | 'revision';
  details: string;
  createdAt: number;
  status: 'pending' | 'approved' | 'declined';
}

export const STAGES: { title: string; desc: string }[] = [
  {
    title: 'Consultation Scheduled',
    desc: 'Discovery call booked; full tracking audit locked to your store.',
  },
  {
    title: 'Architecture Design',
    desc: 'First-party proxy, event map and CAPI schema engineered for your stack.',
  },
  {
    title: 'Server Provisioning',
    desc: 'Cloud container, server GTM and DNS cutover deployed.',
  },
  {
    title: 'Event QA & Deduplication',
    desc: 'SHA-256 test logs, EMQ scoring and dedup verification pass.',
  },
  {
    title: 'Handover & SLA Active',
    desc: 'Credentials vault delivered; 99.99% SLA clock starts.',
  },
];

const DAY = 86_400_000;
const NOW = Date.now();

export const DEMO_ORDER: Order = {
  id: 'demo-8f3a2c',
  clientName: 'Demo Client',
  clientEmail: 'demo@syncops.studio',
  brandUrl: 'demo-brand.com',
  packageId: 'omnichannel',
  packageName: 'Omnichannel Server Stack',
  status: 'In Progress',
  stageIndex: 2,
  adSpend: 120_000,
  createdAt: NOW - 10 * DAY,
  deadlineAt: NOW + 9 * DAY,
};

export const DEMO_MESSAGES: OrderMessage[] = [
  {
    id: 'dm-1',
    orderId: 'demo-8f3a2c',
    sender: 'architect',
    body: 'Kickoff complete — DNS propagation verified for sgtm.demo-brand.com. Provisioning your server container now; expect the container export in your Vault within 48 hours.',
    createdAt: NOW - 2 * DAY,
  },
  {
    id: 'dm-2',
    orderId: 'demo-8f3a2c',
    sender: 'client',
    body: 'Great news. Quick question — will our TikTok events keep working during the cutover?',
    createdAt: NOW - 2 * DAY + 2 * 3_600_000,
  },
  {
    id: 'dm-3',
    orderId: 'demo-8f3a2c',
    sender: 'architect',
    body: 'Yes — browser and server events run in parallel with deduplication IDs during cutover, so there is zero tracking downtime. TikTok Events API is already queuing events from your test traffic.',
    createdAt: NOW - 2 * DAY + 3 * 3_600_000,
  },
  {
    id: 'dm-4',
    orderId: 'demo-8f3a2c',
    sender: 'client',
    body: 'Perfect. Launch target is still the 25th, right?',
    createdAt: NOW - 8 * 3_600_000,
  },
  {
    id: 'dm-5',
    orderId: 'demo-8f3a2c',
    sender: 'architect',
    body: 'Confirmed. Server Provisioning wraps tomorrow, then we move into Event QA & Deduplication. A SHA-256 test log will land in your Vault tonight for review.',
    createdAt: NOW - 7 * 3_600_000,
  },
];

/* ---------------- demo localStorage helpers ---------------- */

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
    /* storage unavailable — in-memory session only */
  }
}

function randomId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ---------------- orders ---------------- */

export async function getOrder(id: string): Promise<Order | null> {
  if (isDemoMode || !db) {
    const overrides = readJSON<Order[]>('syncops_orders', []);
    const found = overrides.find((o) => o.id === id);
    if (found) return found;
    if (id.startsWith('demo')) return { ...DEMO_ORDER };
    return null;
  }
  const snap = await getDoc(doc(db, 'orders', id));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    id: snap.id,
    clientName: String(d.clientName ?? ''),
    clientEmail: String(d.clientEmail ?? ''),
    brandUrl: String(d.brandUrl ?? ''),
    packageId: String(d.packageId ?? ''),
    packageName: String(d.packageName ?? ''),
    status: String(d.status ?? 'In Progress'),
    stageIndex: Number(d.stageIndex ?? 0),
    adSpend: Number(d.adSpend ?? 0),
    createdAt: Number(d.createdAt ?? Date.now()),
    deadlineAt: Number(d.deadlineAt ?? Date.now()),
  };
}

/* ---------------- messages ---------------- */

function mapMessage(orderId: string, id: string, d: Record<string, unknown>): OrderMessage {
  return {
    id,
    orderId,
    sender: d.sender === 'architect' ? 'architect' : 'client',
    body: String(d.body ?? ''),
    createdAt: Number(d.createdAt ?? Date.now()),
  };
}

export function subscribeMessages(
  orderId: string,
  cb: (msgs: OrderMessage[]) => void,
): () => void {
  if (!isDemoMode && db) {
    const q = query(collection(db, 'orders', orderId, 'messages'), orderBy('createdAt', 'asc'));
    return onSnapshot(
      q,
      (snap) => cb(snap.docs.map((m) => mapMessage(orderId, m.id, m.data()))),
      () => cb([]),
    );
  }

  const key = `syncops_msgs_${orderId}`;
  let msgs = readJSON<OrderMessage[]>(key, []);
  if (msgs.length === 0) {
    msgs = DEMO_MESSAGES.filter((m) => m.orderId === orderId || orderId.startsWith('demo'));
    writeJSON(key, msgs);
  }
  cb([...msgs]);

  const timer = setInterval(() => {
    const next = readJSON<OrderMessage[]>(key, msgs);
    if (JSON.stringify(next) !== JSON.stringify(msgs)) {
      msgs = next;
      cb([...msgs]);
    }
  }, 2000);
  return () => clearInterval(timer);
}

export async function sendMessage(
  orderId: string,
  sender: 'client' | 'architect',
  body: string,
): Promise<void> {
  const text = body.trim();
  if (!text) throw new Error('Message cannot be empty.');
  if (!isDemoMode && db) {
    await addDoc(collection(db, 'orders', orderId, 'messages'), {
      sender,
      body: text,
      createdAt: Date.now(),
    });
    return;
  }
  const key = `syncops_msgs_${orderId}`;
  const msgs = readJSON<OrderMessage[]>(key, []);
  msgs.push({
    id: randomId('m'),
    orderId,
    sender,
    body: text,
    createdAt: Date.now(),
  });
  writeJSON(key, msgs);
}

/* ---------------- revisions ---------------- */

function mapRevision(orderId: string, id: string, d: Record<string, unknown>): RevisionRequest {
  const type = d.type === 'addition' || d.type === 'change' ? d.type : 'revision';
  const status = d.status === 'approved' || d.status === 'declined' ? d.status : 'pending';
  return {
    id,
    orderId,
    type,
    details: String(d.details ?? ''),
    createdAt: Number(d.createdAt ?? Date.now()),
    status,
  };
}

export async function listRevisions(orderId: string): Promise<RevisionRequest[]> {
  if (!isDemoMode && db) {
    const q = query(collection(db, 'orders', orderId, 'revisions'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((r) => mapRevision(orderId, r.id, r.data()));
  }
  const revs = readJSON<RevisionRequest[]>(`syncops_revs_${orderId}`, []);
  return [...revs].sort((a, b) => b.createdAt - a.createdAt);
}

export async function createRevision(
  orderId: string,
  type: 'addition' | 'change' | 'revision',
  details: string,
): Promise<void> {
  const text = details.trim();
  if (text.length < 12) throw new Error('Please describe the request in at least 12 characters.');
  if (!isDemoMode && db) {
    await addDoc(collection(db, 'orders', orderId, 'revisions'), {
      type,
      details: text,
      createdAt: Date.now(),
      status: 'pending',
    });
    return;
  }
  const key = `syncops_revs_${orderId}`;
  const revs = readJSON<RevisionRequest[]>(key, []);
  revs.push({
    id: randomId('rev'),
    orderId,
    type,
    details: text,
    createdAt: Date.now(),
    status: 'pending',
  });
  writeJSON(key, revs);
}
