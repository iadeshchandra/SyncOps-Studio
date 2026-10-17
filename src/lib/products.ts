import { useEffect, useSyncExternalStore } from 'react';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { logAudit } from './admin';
import { DEFAULT_PRODUCTS, type Product } from '../data/products';

/**
 * Studio products CMS layer.
 *
 * Resolution order (same philosophy as siteConfig.ts):
 *   1. Firestore `platformConfig/products/{id}` (owner-published via Studio Console)
 *   2. localStorage mirror `syncops_products` (demo edits + offline)
 *   3. DEFAULT_PRODUCTS (compiled-in fallbacks — the showcase always renders)
 *
 * Local overrides are stored as a full-product map plus a deleted-id list,
 * so demo edits survive reloads without a backend.
 */

const COLLECTION = 'platformConfig/products';
const LOCAL_KEY = 'syncops_products';

interface LocalMirror {
  overrides: Record<string, Product>;
  deleted: string[];
}

interface StoreState {
  products: Product[]; // effective list, ALL products incl. unpublished, sorted by order
  booted: boolean;
}

let state: StoreState = { products: [...DEFAULT_PRODUCTS], booted: false };
let inflight: Promise<Product[]> | null = null;
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

function sortProducts(list: Product[]): Product[] {
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
function mergeAll(firestoreDocs: Product[]): Product[] {
  const local = readLocal();
  const byId = new Map<string, Product>();
  for (const p of DEFAULT_PRODUCTS) byId.set(p.id, p);
  for (const id of Object.keys(local.overrides)) {
    if (local.overrides[id]) byId.set(id, local.overrides[id]);
  }
  for (const p of firestoreDocs) byId.set(p.id, p);
  for (const id of local.deleted) byId.delete(id);
  return sortProducts([...byId.values()]);
}

/** Load every product (published + drafts). Public components filter via loadProducts(). */
export async function loadAllProducts(): Promise<Product[]> {
  if (inflight) return inflight;
  inflight = (async () => {
    let firestoreDocs: Product[] = [];
    if (db) {
      try {
        const snap = await getDocs(collection(db, COLLECTION));
        firestoreDocs = snap.docs.map((d) => ({ ...(d.data() as Product), id: d.id }));
      } catch {
        /* offline or permission-denied — fall through to local/defaults */
      }
    }
    const products = mergeAll(firestoreDocs);
    setState({ products, booted: true });
    return products;
  })();
  return inflight;
}

/** Public surface: published products only, sorted by `order`. */
export async function loadProducts(): Promise<Product[]> {
  const all = await loadAllProducts();
  return all.filter((p) => p.published);
}

/** Persist a product (create or update). Owner-gated by Firestore rules. */
export async function saveProduct(p: Product, actor?: string): Promise<void> {
  const mirror = readLocal();
  mirror.overrides[p.id] = p;
  mirror.deleted = mirror.deleted.filter((id) => id !== p.id);
  writeLocal(mirror);
  const next = sortProducts([...state.products.filter((x) => x.id !== p.id), p]);
  setState({ products: next, booted: true });
  if (db) {
    await setDoc(doc(db, COLLECTION, p.id), p);
  }
  await logAudit('products.save', p.id, actor);
}

/** Delete a product by id. Owner-gated by Firestore rules. */
export async function deleteProduct(id: string, actor?: string): Promise<void> {
  const mirror = readLocal();
  delete mirror.overrides[id];
  if (!mirror.deleted.includes(id)) mirror.deleted.push(id);
  writeLocal(mirror);
  setState({ products: state.products.filter((x) => x.id !== id), booted: true });
  if (db) {
    await deleteDoc(doc(db, COLLECTION, id));
  }
  await logAudit('products.delete', id, actor);
}

/** Single product by id (any publish state). Null when unknown. */
export async function getProduct(id: string): Promise<Product | null> {
  const all = await loadAllProducts();
  return all.find((p) => p.id === id) ?? null;
}

/** Warm a single Firestore doc without listing the collection (detail pages). */
export async function getProductDoc(id: string): Promise<Product | null> {
  if (db) {
    try {
      const snap = await getDoc(doc(db, COLLECTION, id));
      if (snap.exists()) return { ...snap.data(), id: snap.id } as Product;
    } catch {
      /* fall through to merged state */
    }
  }
  return getProduct(id);
}

/** Reactive published-product list for public pages. Safe to call anywhere — no provider needed. */
export function useProducts(): {
  products: Product[];
  loading: boolean;
  refresh: () => Promise<Product[]>;
} {
  const { products, booted } = useSyncExternalStore(subscribe, getSnapshot);
  useEffect(() => {
    void loadAllProducts();
  }, []);
  return {
    products: products.filter((p) => p.published),
    loading: !booted,
    refresh: () => {
      inflight = null;
      return loadProducts();
    },
  };
}

/** Reactive full list (incl. drafts) — for the Studio Console Products tab. */
export function useAllProducts(): {
  products: Product[];
  loading: boolean;
  refresh: () => Promise<Product[]>;
} {
  const { products, booted } = useSyncExternalStore(subscribe, getSnapshot);
  useEffect(() => {
    void loadAllProducts();
  }, []);
  return {
    products,
    loading: !booted,
    refresh: () => {
      inflight = null;
      return loadAllProducts();
    },
  };
}
