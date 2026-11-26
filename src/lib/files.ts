import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, isDemoMode } from './firebase';

/**
 * Order files on the Zero-Cost File Vault pattern (the same system as
 * Sanatani Bandhan): Firebase Storage needs a paid plan, so files live as
 * data inside Firestore documents. Images are compressed to WebP in the
 * browser before upload; anything up to ~700 KB raw fits one document.
 */

export interface OrderFile {
  id: string;
  name: string;
  mime: string;
  size: number;
  dataUrl: string;
  uploadedBy: 'architect' | 'client';
  createdAt: number;
}

export const MAX_FILE_BYTES = 700_000;

function mapFile(id: string, d: Record<string, unknown>): OrderFile {
  return {
    id,
    name: String(d.name ?? 'file'),
    mime: String(d.mime ?? 'application/octet-stream'),
    size: Number(d.size ?? 0),
    dataUrl: String(d.dataUrl ?? ''),
    uploadedBy: d.uploadedBy === 'client' ? 'client' : 'architect',
    createdAt: Number(d.createdAt ?? Date.now()),
  };
}

const lsKey = (orderId: string) => `syncops_files_${orderId}`;

function readLocal(orderId: string): OrderFile[] {
  try {
    return JSON.parse(localStorage.getItem(lsKey(orderId)) ?? '[]') as OrderFile[];
  } catch {
    return [];
  }
}

function writeLocal(orderId: string, list: OrderFile[]): void {
  try {
    localStorage.setItem(lsKey(orderId), JSON.stringify(list));
  } catch {
    /* storage full/unavailable — demo mode only */
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Could not read that file.'));
    r.readAsDataURL(file);
  });
}

/** Compress an image to WebP (max 1600px) — the vault's space-saver. */
async function compressImage(file: File): Promise<{ dataUrl: string; size: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image compression is not available in this browser.');
  ctx.drawImage(bitmap, 0, 0, w, h);
  const dataUrl = canvas.toDataURL('image/webp', 0.82);
  return { dataUrl, size: Math.round((dataUrl.length * 3) / 4) };
}

/** Image -> vault data URL (WebP-compressed), for settings like the bKash QR. */
export async function imageFileToDataUrl(file: File): Promise<string> {
  if (file.type.startsWith('image/')) {
    const c = await compressImage(file);
    return c.dataUrl;
  }
  return readAsDataUrl(file);
}

export async function uploadOrderFile(
  orderId: string,
  file: File,
  uploadedBy: 'architect' | 'client',
): Promise<OrderFile> {
  let dataUrl: string;
  let size: number;
  let mime = file.type || 'application/octet-stream';
  if (file.type.startsWith('image/') && file.type !== 'image/webp') {
    const c = await compressImage(file);
    dataUrl = c.dataUrl;
    size = c.size;
    mime = 'image/webp';
  } else {
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(
        `That file is ${(file.size / 1024).toFixed(0)} KB — the free vault takes up to ~700 KB per file. Compress it, or share a link in the chat instead.`,
      );
    }
    dataUrl = await readAsDataUrl(file);
    size = file.size;
  }
  if (size > MAX_FILE_BYTES) {
    throw new Error(
      'Even after compression that image is over ~700 KB. Please resize it, or share a link in the chat instead.',
    );
  }
  const payload = {
    name: file.name,
    mime,
    size,
    dataUrl,
    uploadedBy,
    createdAt: Date.now(),
  };
  if (!isDemoMode && db) {
    const ref = await addDoc(collection(db, 'orders', orderId, 'files'), payload);
    return { id: ref.id, ...payload };
  }
  const entry: OrderFile = { id: `demo-file-${Date.now().toString(36)}`, ...payload };
  writeLocal(orderId, [entry, ...readLocal(orderId)]);
  return entry;
}

export async function listOrderFiles(orderId: string): Promise<OrderFile[]> {
  if (!isDemoMode && db) {
    const snap = await getDocs(
      query(collection(db, 'orders', orderId, 'files'), orderBy('createdAt', 'desc')),
    );
    return snap.docs.map((d) => mapFile(d.id, d.data()));
  }
  return [...readLocal(orderId)].sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteOrderFile(orderId: string, fileId: string): Promise<void> {
  if (!isDemoMode && db) {
    await deleteDoc(doc(db, 'orders', orderId, 'files', fileId));
    return;
  }
  writeLocal(
    orderId,
    readLocal(orderId).filter((f) => f.id !== fileId),
  );
}

export function downloadOrderFile(f: OrderFile): void {
  const a = document.createElement('a');
  a.href = f.dataUrl;
  a.download = f.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
