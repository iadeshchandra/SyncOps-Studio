import { useCallback, useEffect, useRef, useState } from 'react';
import { FileUp, Download, Trash2, FileText, Loader2 } from 'lucide-react';
import {
  listOrderFiles,
  uploadOrderFile,
  deleteOrderFile,
  downloadOrderFile,
  formatBytes,
  type OrderFile,
} from '../lib/files';

/**
 * Shared order files on the Zero-Cost File Vault: small files stored as data
 * in Firestore (images auto-compressed to WebP), never Firebase Storage.
 * Used by the client portal (Vault tab) and the console order detail.
 */
export default function OrderFiles({
  orderId,
  by,
  canDeleteAll = false,
}: {
  orderId: string;
  by: 'architect' | 'client';
  canDeleteAll?: boolean;
}) {
  const [files, setFiles] = useState<OrderFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      setFiles(await listOrderFiles(orderId));
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleUpload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      await uploadOrderFile(orderId, file, by);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (f: OrderFile) => {
    setBusy(true);
    try {
      await deleteOrderFile(orderId, f.id);
      await refresh();
    } catch {
      setError('Could not delete that file.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <p className="label-dark flex items-center gap-2">
          <FileText className="h-4 w-4 text-cyan-300" /> Project files
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="btn-ghost ml-auto px-3.5 py-2 text-xs disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
          Upload a file
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleUpload(f);
            e.target.value = '';
          }}
        />
      </div>
      <p className="telemetry mt-1">
        shared between you and the studio · up to ~700 KB per file · images are compressed automatically
      </p>
      {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
      {loading ? (
        <p className="telemetry mt-3">loading files…</p>
      ) : files.length === 0 ? (
        <p className="telemetry mt-3">no files yet — screenshots, briefs and reports live here.</p>
      ) : (
        <div className="mt-3 space-y-1.5">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-slate-800/80 bg-slate-950/60 px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{f.name}</span>
              <span className="telemetry">
                {formatBytes(f.size)} · {f.uploadedBy === 'architect' ? 'studio' : 'client'} ·{' '}
                {new Date(f.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <button
                type="button"
                onClick={() => downloadOrderFile(f)}
                className="btn-ghost px-2.5 py-1.5 text-xs"
                aria-label={`Download ${f.name}`}
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              {(canDeleteAll || f.uploadedBy === by) && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleDelete(f)}
                  className="btn-ghost px-2.5 py-1.5 text-xs text-rose-300 disabled:opacity-50"
                  aria-label={`Delete ${f.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
