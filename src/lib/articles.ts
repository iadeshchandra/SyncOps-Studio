import { useEffect, useSyncExternalStore } from 'react';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { logAudit } from './admin';
import { DEFAULT_ARTICLES, type Article } from '../data/articles';

export type { Article } from '../data/articles';

/**
 * Studio field-notes CMS layer.
 *
 * Resolution order (same philosophy as products.ts):
 *   1. Firestore `platformConfig/articles/{id}` (owner-published via Studio Console)
 *   2. localStorage mirror `syncops_articles` (demo edits + offline)
 *   3. DEFAULT_ARTICLES (compiled-in fallbacks — /notes always renders)
 *
 * Local overrides are stored as a full-article map plus a deleted-id list,
 * so demo edits survive reloads without a backend.
 */

const COLLECTION = 'platformConfig/articles';
const LOCAL_KEY = 'syncops_articles';

interface LocalMirror {
  overrides: Record<string, Article>;
  deleted: string[];
}

interface StoreState {
  articles: Article[]; // effective list, ALL articles incl. unpublished, sorted by order
  booted: boolean;
}

let state: StoreState = { articles: [...DEFAULT_ARTICLES], booted: false };
let inflight: Promise<Article[]> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function setState(patch: Partial<StoreState>) {
  state = { ...state, ...patch };
  emit();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function getSnapshot(): StoreState {
  return state;
}

function sortArticles(list: Article[]): Article[] {
  return [...list].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

function readLocal(): LocalMirror {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LocalMirror>;
      return {
        overrides: parsed.overrides ?? {},
        deleted: parsed.deleted ?? [],
      };
    }
  } catch {
    /* corrupted or unavailable storage — fall through to empty mirror */
  }
  return { overrides: {}, deleted: [] };
}

function writeLocal(mirror: LocalMirror) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(mirror));
  } catch {
    /* storage unavailable — Firestore remains the source of truth */
  }
}

/** Merge defaults ← local overrides ← Firestore docs. Firestore wins. */
function mergeAll(firestoreDocs: Article[]): Article[] {
  const local = readLocal();
  const byId = new Map<string, Article>();
  for (const a of DEFAULT_ARTICLES) byId.set(a.id, a);
  for (const id of Object.keys(local.overrides)) {
    if (local.overrides[id]) byId.set(id, local.overrides[id]);
  }
  for (const a of firestoreDocs) byId.set(a.id, a);
  for (const id of local.deleted) byId.delete(id);
  return sortArticles([...byId.values()]);
}

/** Load every article (published + drafts). Public components filter via loadArticles(). */
export async function loadAllArticles(): Promise<Article[]> {
  if (inflight) return inflight;
  inflight = (async () => {
    let firestoreDocs: Article[] = [];
    if (db) {
      try {
        const snap = await getDocs(collection(db, COLLECTION));
        firestoreDocs = snap.docs.map((d) => ({ ...(d.data() as Article), id: d.id }));
      } catch {
        /* offline or permission-denied — fall through to local/defaults */
      }
    }
    const articles = mergeAll(firestoreDocs);
    setState({ articles, booted: true });
    return articles;
  })();
  return inflight;
}

/** Public surface: published articles only, sorted by `order`. */
export async function loadArticles(): Promise<Article[]> {
  const all = await loadAllArticles();
  return all.filter((a) => a.published);
}

/** Persist an article (create or update). Owner-gated by Firestore rules. */
export async function saveArticle(a: Article, actor?: string): Promise<void> {
  const mirror = readLocal();
  mirror.overrides[a.id] = a;
  mirror.deleted = mirror.deleted.filter((id) => id !== a.id);
  writeLocal(mirror);
  const next = sortArticles([...state.articles.filter((x) => x.id !== a.id), a]);
  setState({ articles: next, booted: true });
  if (db) {
    await setDoc(doc(db, COLLECTION, a.id), a);
  }
  await logAudit('articles.save', a.id, actor);
}

/** Delete an article by id. Owner-gated by Firestore rules. */
export async function deleteArticle(id: string, actor?: string): Promise<void> {
  const mirror = readLocal();
  delete mirror.overrides[id];
  if (!mirror.deleted.includes(id)) mirror.deleted.push(id);
  writeLocal(mirror);
  setState({ articles: state.articles.filter((x) => x.id !== id), booted: true });
  if (db) {
    await deleteDoc(doc(db, COLLECTION, id));
  }
  await logAudit('articles.delete', id, actor);
}

/** Single article by id (any publish state). Null when unknown. */
export async function getArticle(id: string): Promise<Article | null> {
  const all = await loadAllArticles();
  return all.find((a) => a.id === id) ?? null;
}

/** Warm a single Firestore doc without listing the collection (detail pages). */
export async function getArticleDoc(id: string): Promise<Article | null> {
  if (db) {
    try {
      const snap = await getDoc(doc(db, COLLECTION, id));
      if (snap.exists()) return { ...snap.data(), id: snap.id } as Article;
    } catch {
      /* fall through to merged state */
    }
  }
  return getArticle(id);
}

/** Reactive published-article list for public pages. Safe to call anywhere — no provider needed. */
export function useArticles(): {
  articles: Article[];
  loading: boolean;
  refresh: () => Promise<Article[]>;
} {
  const { articles, booted } = useSyncExternalStore(subscribe, getSnapshot);
  useEffect(() => {
    void loadAllArticles();
  }, []);
  return {
    articles: articles.filter((a) => a.published),
    loading: !booted,
    refresh: () => {
      inflight = null;
      return loadArticles();
    },
  };
}

/** Reactive full list (incl. drafts) — for the Studio Console Articles tab. */
export function useAllArticles(): {
  articles: Article[];
  loading: boolean;
  refresh: () => Promise<Article[]>;
} {
  const { articles, booted } = useSyncExternalStore(subscribe, getSnapshot);
  useEffect(() => {
    void loadAllArticles();
  }, []);
  return {
    articles,
    loading: !booted,
    refresh: () => {
      inflight = null;
      return loadAllArticles();
    },
  };
}

/** '2026-11-10' → '10 Nov 2026'. Falls back to the raw string when unparseable. */
export function formatArticleDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
