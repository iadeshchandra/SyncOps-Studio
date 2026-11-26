import { doc, getDoc, getDocs, setDoc, updateDoc, collection } from 'firebase/firestore';
import { db, isDemoMode } from './firebase';

export interface Review {
  /** The review's id IS the order id — one review per order. */
  id: string;
  orderId: string;
  clientName: string;
  rating: number;
  text: string;
  createdAt: number;
  published: boolean;
}

function mapReview(id: string, d: Record<string, unknown>): Review {
  return {
    id,
    orderId: String(d.orderId ?? id),
    clientName: String(d.clientName ?? ''),
    rating: Number(d.rating ?? 0),
    text: String(d.text ?? ''),
    createdAt: Number(d.createdAt ?? Date.now()),
    published: d.published === true,
  };
}

const LS_KEY = 'syncops_reviews';

function readLocal(): Review[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as Review[];
  } catch {
    return [];
  }
}

function writeLocal(list: Review[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
}

/** Client leaves the completion review for their order. */
export async function submitReview(
  orderId: string,
  clientName: string,
  rating: number,
  text: string,
): Promise<void> {
  const clean = text.trim();
  if (rating < 1 || rating > 5) throw new Error('Please choose a star rating.');
  if (clean.length < 4) throw new Error('Please add a few words about the work.');
  const review: Review = {
    id: orderId,
    orderId,
    clientName,
    rating,
    text: clean,
    createdAt: Date.now(),
    published: false,
  };
  if (!isDemoMode && db) {
    await setDoc(doc(db, 'reviews', orderId), {
      orderId,
      clientName,
      rating,
      text: clean,
      createdAt: review.createdAt,
      published: false,
    });
    return;
  }
  const list = readLocal().filter((r) => r.id !== orderId);
  list.push(review);
  writeLocal(list);
}

export async function getReview(orderId: string): Promise<Review | null> {
  if (!isDemoMode && db) {
    const snap = await getDoc(doc(db, 'reviews', orderId));
    return snap.exists() ? mapReview(snap.id, snap.data()) : null;
  }
  return readLocal().find((r) => r.id === orderId) ?? null;
}

/** Owner: every review, newest first (console moderation). */
export async function listReviews(): Promise<Review[]> {
  if (!isDemoMode && db) {
    const snap = await getDocs(collection(db, 'reviews'));
    return snap.docs
      .map((d) => mapReview(d.id, d.data()))
      .sort((a, b) => b.createdAt - a.createdAt);
  }
  return [...readLocal()].sort((a, b) => b.createdAt - a.createdAt);
}

/** Public: published reviews only — the site's proof wall. */
export async function listPublishedReviews(): Promise<Review[]> {
  const all = await listReviews().catch(() => [] as Review[]);
  return all.filter((r) => r.published);
}

export async function setReviewPublished(id: string, published: boolean): Promise<void> {
  if (!isDemoMode && db) {
    await updateDoc(doc(db, 'reviews', id), { published });
    return;
  }
  writeLocal(readLocal().map((r) => (r.id === id ? { ...r, published } : r)));
}
