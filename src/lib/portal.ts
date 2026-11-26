import {
  doc,
  getDoc,
  getDocs,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db, isDemoMode } from './firebase';

export interface ActivityEvent {
  kind: string;
  text: string;
  at: number;
  by: 'client' | 'architect' | 'system';
}

export interface Delivery {
  id: string;
  orderId: string;
  note: string;
  links: string[];
  createdAt: number;
  status: 'pending' | 'accepted' | 'revision';
  responseNote?: string;
  respondedAt?: number;
}

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
  ref?: string;
  activity?: ActivityEvent[];
}

/** Append an event to an order's activity timeline (capped, oldest first). */
export function appendActivity(
  order: { activity?: ActivityEvent[] },
  kind: string,
  text: string,
  by: ActivityEvent['by'],
): ActivityEvent[] {
  return [...(order.activity ?? []), { kind, text, at: Date.now(), by }].slice(-80);
}

function parseActivity(raw: unknown): ActivityEvent[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: ActivityEvent[] = [];
  for (const e of raw) {
    if (e && typeof e === 'object') {
      const r = e as Record<string, unknown>;
      out.push({
        kind: String(r.kind ?? 'note'),
        text: String(r.text ?? ''),
        at: Number(r.at ?? 0),
        by: r.by === 'client' || r.by === 'architect' ? r.by : 'system',
      });
    }
  }
  return out.length ? out : undefined;
}

const REF_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function refDate(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

/** Friendly client-facing order reference, e.g. SO-20261126-K7QX. */
export function makeOrderRef(createdAt: number): string {
  let code = '';
  for (let i = 0; i < 4; i++) code += REF_ALPHABET[Math.floor(Math.random() * REF_ALPHABET.length)];
  return `SO-${refDate(new Date(createdAt))}-${code}`;
}

/** The reference a client quotes: the stored one, or a stable derivation for older orders. */
export function orderRef(o: { id: string; createdAt: number; ref?: string }): string {
  if (o.ref) return o.ref;
  return `SO-${refDate(new Date(o.createdAt))}-${o.id.slice(-4).toUpperCase()}`;
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

export const DEMO_DELIVERIES: Delivery[] = [
  {
    id: 'dd-1',
    orderId: 'demo-8f3a2c',
    note: 'Server container export + DNS cutover pack for review. The SHA-256 event test log is inside the container export under /qa.',
    links: ['https://example.com/syncops/demo-container-export.json'],
    createdAt: NOW - 1 * DAY,
    status: 'pending',
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
    ref: typeof d.ref === 'string' ? d.ref : undefined,
    activity: parseActivity(d.activity),
  };
}

/** Orders belonging to one client email, newest first. Powers /client/dashboard. */
export async function listMyOrders(email: string): Promise<Order[]> {
  const target = email.trim().toLowerCase();
  if (!target) return [];
  if (!isDemoMode && db) {
    const q = query(collection(db, 'orders'), where('clientEmail', '==', email.trim()));
    const snap = await getDocs(q);
    return snap.docs
      .map((s) => mapOrder(s.id, s.data()))
      .sort((a, b) => b.createdAt - a.createdAt);
  }
  const overrides = readJSON<Order[]>('syncops_orders', []);
  const mine = overrides.filter((o) => o.clientEmail.toLowerCase() === target);
  if (target === DEMO_ORDER.clientEmail && !mine.some((o) => o.id === DEMO_ORDER.id)) {
    mine.push({ ...DEMO_ORDER });
  }
  return mine.sort((a, b) => b.createdAt - a.createdAt);
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
      orderId,
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

/* ---------------- deliveries ---------------- */

function mapDelivery(orderId: string, id: string, d: Record<string, unknown>): Delivery {
  const status = d.status === 'accepted' || d.status === 'revision' ? d.status : 'pending';
  return {
    id,
    orderId,
    note: String(d.note ?? ''),
    links: Array.isArray(d.links) ? d.links.map((l) => String(l)) : [],
    createdAt: Number(d.createdAt ?? Date.now()),
    status,
    responseNote: typeof d.responseNote === 'string' ? d.responseNote : undefined,
    respondedAt: typeof d.respondedAt === 'number' ? d.respondedAt : undefined,
  };
}

export async function listDeliveries(orderId: string): Promise<Delivery[]> {
  if (!isDemoMode && db) {
    const q = query(collection(db, 'orders', orderId, 'deliveries'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapDelivery(orderId, d.id, d.data()));
  }
  const key = `syncops_delivs_${orderId}`;
  let items = readJSON<Delivery[]>(key, []);
  if (items.length === 0 && orderId.startsWith('demo')) {
    items = DEMO_DELIVERIES.filter((d) => d.orderId === orderId || orderId.startsWith('demo'));
    writeJSON(key, items);
  }
  return [...items].sort((a, b) => b.createdAt - a.createdAt);
}

/** Architect submits a delivery: a note plus deliverable links. */
export async function createDelivery(
  orderId: string,
  note: string,
  links: string[],
): Promise<void> {
  const text = note.trim();
  if (text.length < 4) throw new Error('Add a short delivery note (what is included, what to check).');
  const cleanLinks = links.map((l) => l.trim()).filter(Boolean);
  if (!isDemoMode && db) {
    await addDoc(collection(db, 'orders', orderId, 'deliveries'), {
      note: text,
      links: cleanLinks,
      createdAt: Date.now(),
      status: 'pending',
    });
    return;
  }
  const key = `syncops_delivs_${orderId}`;
  const items = readJSON<Delivery[]>(key, []);
  items.push({
    id: randomId('del'),
    orderId,
    note: text,
    links: cleanLinks,
    createdAt: Date.now(),
    status: 'pending',
  });
  writeJSON(key, items);
}

/**
 * Client responds to a delivery. Accepting completes the order; asking for a
 * revision returns it to active. Both write the timeline event and the new
 * order status in the same step (the rules allow the owning client exactly
 * these two fields).
 */
export async function respondDelivery(
  order: Order,
  delivery: Delivery,
  accept: boolean,
  responseNote: string,
): Promise<{ status: string; activity: ActivityEvent[] }> {
  const note = responseNote.trim();
  if (!accept && note.length < 4) {
    throw new Error('Tell the studio what needs to change (a few words is enough).');
  }
  const status = accept ? 'completed' : 'active';
  const activity = appendActivity(
    order,
    accept ? 'delivery_accepted' : 'delivery_revision',
    accept ? 'Client accepted the delivery — order completed.' : `Client requested a revision: ${note}`,
    'client',
  );
  if (!isDemoMode && db) {
    await updateDoc(doc(db, 'orders', order.id, 'deliveries', delivery.id), {
      status: accept ? 'accepted' : 'revision',
      responseNote: note,
      respondedAt: Date.now(),
    });
    await updateDoc(doc(db, 'orders', order.id), { status, activity });
    return { status, activity };
  }
  const key = `syncops_delivs_${order.id}`;
  const items = readJSON<Delivery[]>(key, []).map((d) =>
    d.id === delivery.id
      ? { ...d, status: (accept ? 'accepted' : 'revision') as Delivery['status'], responseNote: note, respondedAt: Date.now() }
      : d,
  );
  writeJSON(key, items);
  await updateOrder(order.id, { status, activity });
  return { status, activity };
}

/* ---------------- signals & attention ---------------- */

export interface OrderSignals {
  pendingDeliveries: number;
  oldestPendingDeliveryAt: number | null;
  pendingRevisions: number;
  latestMessage: OrderMessage | null;
  /** The most recent message is from the client — they are waiting on a reply. */
  clientWaiting: boolean;
}

/** Light per-order rollup powering the client hub and the console attention queue. */
export async function getOrderSignals(orderId: string): Promise<OrderSignals> {
  const deliveries = await listDeliveries(orderId);
  const revisions = await listRevisions(orderId);
  const pending = deliveries.filter((d) => d.status === 'pending');
  let latest: OrderMessage | null = null;
  if (!isDemoMode && db) {
    const q = query(
      collection(db, 'orders', orderId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(1),
    );
    const snap = await getDocs(q);
    if (!snap.empty) latest = mapMessage(orderId, snap.docs[0].id, snap.docs[0].data());
  } else {
    const msgs = readJSON<OrderMessage[]>(`syncops_msgs_${orderId}`, []);
    const seed = msgs.length === 0 && orderId.startsWith('demo') ? DEMO_MESSAGES : msgs;
    latest = seed.length ? seed.reduce((a, b) => (b.createdAt > a.createdAt ? b : a)) : null;
  }
  return {
    pendingDeliveries: pending.length,
    oldestPendingDeliveryAt: pending.length
      ? Math.min(...pending.map((d) => d.createdAt))
      : null,
    pendingRevisions: revisions.filter((r) => r.status === 'pending').length,
    latestMessage: latest,
    clientWaiting: latest?.sender === 'client',
  };
}

export interface AttentionItem {
  kind: 'revision' | 'client_waiting' | 'intake' | 'deadline' | 'delivery_stale';
  order: Order;
  text: string;
  at: number;
}

const ATTENTION_PRIORITY: Record<AttentionItem['kind'], number> = {
  revision: 0,
  client_waiting: 1,
  intake: 2,
  deadline: 3,
  delivery_stale: 4,
};

/** Everything that needs the studio's hand today, across every live order. */
export async function listAttention(): Promise<AttentionItem[]> {
  const orders = (await listOrders()).filter(
    (o) => o.status !== 'archived' && o.status !== 'completed',
  );
  const now = Date.now();
  const items: AttentionItem[] = [];
  await Promise.all(
    orders.map(async (o) => {
      const sig = await getOrderSignals(o.id);
      if (sig.pendingRevisions > 0) {
        items.push({
          kind: 'revision',
          order: o,
          text: `${sig.pendingRevisions} revision request${sig.pendingRevisions > 1 ? 's' : ''} awaiting your answer`,
          at: o.createdAt,
        });
      }
      if (sig.clientWaiting && sig.latestMessage) {
        items.push({
          kind: 'client_waiting',
          order: o,
          text: 'Client messaged — awaiting your reply',
          at: sig.latestMessage.createdAt,
        });
      }
      if (o.status === 'intake') {
        items.push({
          kind: 'intake',
          order: o,
          text: 'New order awaiting your review',
          at: o.createdAt,
        });
      }
      if (o.deadlineAt - now < 48 * 3_600_000) {
        items.push({
          kind: 'deadline',
          order: o,
          text:
            o.deadlineAt < now
              ? `Deadline passed ${new Date(o.deadlineAt).toLocaleDateString()}`
              : `Deadline ${new Date(o.deadlineAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
          at: o.deadlineAt,
        });
      }
      if (
        sig.oldestPendingDeliveryAt !== null &&
        now - sig.oldestPendingDeliveryAt > 2 * 86_400_000
      ) {
        items.push({
          kind: 'delivery_stale',
          order: o,
          text: 'Delivery sent 2+ days ago — client has not responded',
          at: sig.oldestPendingDeliveryAt,
        });
      }
    }),
  );
  return items.sort(
    (a, b) => ATTENTION_PRIORITY[a.kind] - ATTENTION_PRIORITY[b.kind] || b.at - a.at,
  );
}

/* ---------------- admin: order management ---------------- */

function mapOrder(id: string, d: Record<string, unknown>): Order {
  return {
    id,
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
    ref: typeof d.ref === 'string' ? d.ref : undefined,
    activity: parseActivity(d.activity),
  };
}

/** All orders, newest first. Demo mode seeds the demo order when storage is empty. */
export async function listOrders(): Promise<Order[]> {
  if (!isDemoMode && db) {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((s) => mapOrder(s.id, s.data()));
  }
  const overrides = readJSON<Order[]>('syncops_orders', []);
  const merged = overrides.some((o) => o.id === DEMO_ORDER.id)
    ? overrides
    : [{ ...DEMO_ORDER }, ...overrides];
  return [...merged].sort((a, b) => b.createdAt - a.createdAt);
}

export async function updateOrder(orderId: string, patch: Partial<Order>): Promise<void> {
  const { id: _id, ...clean } = patch;
  void _id;
  if (!isDemoMode && db) {
    await updateDoc(doc(db, 'orders', orderId), clean);
    return;
  }
  const overrides = readJSON<Order[]>('syncops_orders', []);
  const idx = overrides.findIndex((o) => o.id === orderId);
  if (idx >= 0) {
    overrides[idx] = { ...overrides[idx], ...clean } as Order;
  } else if (orderId === DEMO_ORDER.id) {
    overrides.push({ ...DEMO_ORDER, ...clean } as Order);
  } else {
    throw new Error('Order not found.');
  }
  writeJSON('syncops_orders', overrides);
}

export async function deleteOrder(orderId: string): Promise<void> {
  if (!isDemoMode && db) {
    await deleteDoc(doc(db, 'orders', orderId));
    return;
  }
  const overrides = readJSON<Order[]>('syncops_orders', []).filter((o) => o.id !== orderId);
  writeJSON('syncops_orders', overrides);
}
