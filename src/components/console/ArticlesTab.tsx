import { useEffect, useState, type ReactNode } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { cx } from '../../lib/format';
import {
  deleteArticle,
  loadAllArticles,
  saveArticle,
  type Article,
} from '../../lib/articles';
import { imageFileToDataUrl } from '../../lib/files';

/* ------------------------------------------------------------------ */
/* Article types come from the studio-wide model in src/lib/articles.ts */
/* (single source of truth shared with /notes and the detail pages).    */
/* ------------------------------------------------------------------ */

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/* --------------------------- UI primitives ------------------------ */

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx('block', className)}>
      <span className="label-dark">{label}</span>
      {children}
    </label>
  );
}

function blankArticle(order: number): Article {
  return {
    id: '',
    title: '',
    excerpt: '',
    body: '',
    tags: [],
    published: false,
    publishedAt: todayIso(),
    order,
  };
}

function sortList(list: Article[]): Article[] {
  return [...list].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export default function ArticlesTab() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Article | null>(null);
  const [idTouched, setIdTouched] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadAllArticles()
      .then((list) => {
        if (!cancelled) setArticles(list);
      })
      .catch(() => {
        if (!cancelled) setNotice({ ok: false, text: 'Failed to load articles.' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [discardArmed, setDiscardArmed] = useState(false);
  const patch = (p: Partial<Article>) => {
    setDraft((d) => (d ? { ...d, ...p } : d));
    setDirty(true);
    setDiscardArmed(false);
  };

  // Two-step unsaved-changes guard: window.confirm is auto-dismissed in
  // some browsers, which silently trapped the editor on one record. The
  // first attempt to leave shows a notice and arms the discard; repeating
  // the same action discards and proceeds.
  const guardUnsaved = (): boolean => {
    if (!dirty) return true;
    if (discardArmed) {
      setDiscardArmed(false);
      return true;
    }
    setDiscardArmed(true);
    setNotice({
      ok: false,
      text: 'Unsaved changes — Save first, or repeat the action to discard them.',
    });
    return false;
  };

  const select = (id: string) => {
    if (!guardUnsaved()) return;
    const a = articles.find((x) => x.id === id);
    if (!a) return;
    setSelectedId(id);
    setDraft({ ...a });
    setIdTouched(true);
    setDirty(false);
    setNotice(null);
  };

  const startNew = () => {
    if (!guardUnsaved()) return;
    setSelectedId(null);
    setDraft(blankArticle(articles.length));
    setIdTouched(false);
    setDirty(false);
    setNotice(null);
  };

  const handleTitleChange = (title: string) => {
    setDraft((d) => {
      if (!d) return d;
      const next: Article = { ...d, title };
      // Auto-suggest the slug from the title until the owner edits the id by hand.
      if (selectedId === null && !idTouched) next.id = slugify(title);
      return next;
    });
    setDirty(true);
  };

  const save = async () => {
    if (!draft) return;
    const clean: Article = {
      ...draft,
      id: draft.id.trim(),
      tags: draft.tags.map((t) => t.trim()).filter(Boolean),
      publishedAt: draft.publishedAt.trim() || todayIso(),
    };
    if (!clean.id) {
      setNotice({ ok: false, text: 'Article ID / slug is required.' });
      return;
    }
    if (!clean.title.trim()) {
      setNotice({ ok: false, text: 'Article title is required.' });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      await saveArticle(clean);
      setArticles((prev) => sortList([...prev.filter((a) => a.id !== clean.id), clean]));
      setSelectedId(clean.id);
      setDraft(clean);
      setIdTouched(true);
      setDirty(false);
      setNotice({ ok: true, text: 'Saved — live on next load.' });
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : 'Save failed.' });
    } finally {
      setSaving(false);
    }
  };

  // In-app two-step delete (window.confirm is auto-dismissed in some
  // browsers, which silently vetoed the delete there).
  const [armedDeleteId, setArmedDeleteId] = useState<string | null>(null);
  const remove = async () => {
    if (!draft) return;
    setDeleting(true);
    try {
      await deleteArticle(draft.id);
      setArticles((prev) => prev.filter((a) => a.id !== draft.id));
      setSelectedId(null);
      setDraft(null);
      setDirty(false);
      setNotice({ ok: true, text: 'Article deleted.' });
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : 'Delete failed.' });
    } finally {
      setDeleting(false);
      setArmedDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="ml-2 text-sm">Loading articles…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="glass-strong flex flex-col gap-3 rounded-lg p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="h-display text-lg">Field Notes</h2>
          <p className="mt-1 text-sm text-slate-400">
            The studio blog — write a note once, publish it to /notes. Body is plain
            text: a blank line starts a new paragraph, and a short line in ALL CAPS
            becomes a section heading.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {dirty && <span className="telemetry text-amber-300">● UNSAVED CHANGES</span>}
          {notice && (
            <span
              className={cx(
                'inline-flex items-center gap-1.5 text-sm font-medium',
                notice.ok ? 'text-emerald-400' : 'text-rose-400',
              )}
            >
              {notice.ok && <CheckCircle2 className="h-4 w-4" />}
              {notice.text}
            </span>
          )}
          {draft?.id && (
            <a
              href={`/notes/${draft.id}`}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost !px-3 !py-2 text-xs"
            >
              <ExternalLink className="h-3.5 w-3.5" /> View page
            </a>
          )}
          {draft && selectedId && (
            <button
              type="button"
              className="btn-ghost !px-3 !py-2 text-xs !text-rose-400/90 hover:!text-rose-300"
              onClick={() =>
                armedDeleteId === draft.id ? void remove() : setArmedDeleteId(draft.id)
              }
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {armedDeleteId === draft.id ? 'Confirm delete?' : 'Delete'}
            </button>
          )}
          <button className="btn-primary" onClick={save} disabled={saving || !draft}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save article
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Article list */}
        <aside className="glass h-fit rounded-lg p-4">
          <button type="button" className="btn-primary w-full" onClick={startNew}>
            <Plus className="h-4 w-4" /> New article
          </button>
          <div className="mt-3 space-y-2">
            {articles.map((a) => {
              const selected = a.id === selectedId;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => select(a.id)}
                  className={cx(
                    'w-full rounded-md border p-3 text-left transition-colors',
                    selected
                      ? 'border-cyan-500/40 bg-cyan-500/10'
                      : 'border-slate-800/80 bg-slate-950/60 hover:border-slate-700',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-slate-200">
                      {a.title || a.id}
                    </span>
                    {a.published ? (
                      <Eye className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span
                      className={cx(
                        'telemetry rounded px-1.5 py-0.5',
                        a.published
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-slate-500/15 text-slate-400',
                      )}
                    >
                      {a.published ? 'PUBLISHED' : 'DRAFT'}
                    </span>
                    <span className="telemetry text-slate-600">#{a.order}</span>
                  </div>
                </button>
              );
            })}
            {articles.length === 0 && (
              <p className="p-3 text-sm text-slate-500">
                No articles yet. Create the first one — it appears on /notes once
                published.
              </p>
            )}
          </div>
        </aside>

        {/* Editor */}
        <div className="min-w-0">
          {!draft ? (
            <div className="glass flex flex-col items-center rounded-lg px-6 py-16 text-center">
              <p className="h-display text-base text-slate-300">No article selected</p>
              <p className="mt-2 max-w-sm text-sm text-slate-500">
                Pick an article from the list, or create a new one to start writing
                the next field note.
              </p>
              <button type="button" className="btn-ghost mt-5" onClick={startNew}>
                <Plus className="h-4 w-4" /> New article
              </button>
            </div>
          ) : (
            <section className="glass rounded-lg p-5 sm:p-6">
              <h3 className="h-display text-base">Article</h3>
              <p className="mb-5 mt-1 text-sm text-slate-400">
                Slug, title, excerpt and body — plus tags, date and publishing.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Article ID / slug (used in /notes/:id)">
                  <input
                    className="input-dark font-mono text-sm"
                    placeholder="why-your-roas-fell"
                    value={draft.id}
                    onChange={(e) => {
                      setIdTouched(true);
                      patch({ id: slugify(e.target.value) });
                    }}
                  />
                </Field>
                <Field label="Publish date">
                  <input
                    type="date"
                    className="input-dark"
                    value={draft.publishedAt}
                    onChange={(e) => patch({ publishedAt: e.target.value })}
                  />
                </Field>
                <Field label="Title" className="sm:col-span-2">
                  <input
                    className="input-dark"
                    placeholder="e.g. Why your ROAS fell — and what actually fixes it"
                    value={draft.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                  />
                </Field>
                <Field label="Excerpt" className="sm:col-span-2">
                  <textarea
                    rows={2}
                    className="input-dark"
                    placeholder="1–2 sentences shown on the /notes card and under the title."
                    value={draft.excerpt}
                    onChange={(e) => patch({ excerpt: e.target.value })}
                  />
                </Field>
                <Field label="Body" className="sm:col-span-2">
                  <textarea
                    rows={16}
                    className="input-dark font-mono text-[13px] leading-relaxed"
                    placeholder={
                      'Opening paragraph…\n\nA SHORT LINE IN ALL CAPS BECOMES A HEADING\n\nNext paragraph…'
                    }
                    value={draft.body}
                    onChange={(e) => patch({ body: e.target.value })}
                  />
                </Field>
                <Field label="Tags (comma-separated)">
                  <input
                    className="input-dark font-mono text-sm"
                    placeholder="meta capi, data quality"
                    value={draft.tags.join(', ')}
                    onChange={(e) =>
                      patch({
                        tags: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </Field>
                <Field label="Display order (lower first)">
                  <input
                    type="number"
                    min={0}
                    className="input-dark"
                    value={draft.order}
                    onChange={(e) => patch({ order: Number(e.target.value) })}
                  />
                </Field>
                <div className="rounded-md border border-slate-800 bg-slate-950/60 p-4 sm:col-span-2">
                  <span className="telemetry text-cyan-400">COVER IMAGE</span>
                  {draft.coverDataUrl ? (
                    <div className="mt-3">
                      <img
                        src={draft.coverDataUrl}
                        alt="Cover preview"
                        className="aspect-[16/9] w-full max-w-md rounded-md object-cover"
                      />
                      <button
                        className="mt-3 text-xs font-medium text-rose-400/80 transition-colors hover:text-rose-300"
                        onClick={() => patch({ coverDataUrl: undefined })}
                      >
                        Remove cover image
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <input
                        type="file"
                        accept="image/*"
                        className="input-dark"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          e.target.value = '';
                          if (!f) return;
                          try {
                            const url = await imageFileToDataUrl(f);
                            if (url.length > 900_000) {
                              setNotice({
                                ok: false,
                                text: 'That image is too large even after compression — please use a smaller image.',
                              });
                              return;
                            }
                            patch({ coverDataUrl: url });
                          } catch {
                            setNotice({ ok: false, text: 'Could not read that image file.' });
                          }
                        }}
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        Shown at the top of the note and on its card. Compressed automatically —
                        no hosting cost.
                      </p>
                    </div>
                  )}
                </div>
                <div className="rounded-md border border-slate-800 bg-slate-950/60 p-4 sm:col-span-2">
                  <span className="telemetry text-cyan-400">CASE STUDY DETAILS</span>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    Fill these when this note is a case study (tag it &lsquo;case study&rsquo;).
                    They appear as labelled sections on the note page, and the result line
                    appears on the Case Studies page.
                  </p>
                  <div className="mt-3 grid gap-3">
                    <Field label="The client (type of business — a name only with permission)">
                      <input
                        className="input-dark"
                        value={draft.client ?? ''}
                        onChange={(e) => patch({ client: e.target.value })}
                      />
                    </Field>
                    <Field label="The problem">
                      <textarea
                        rows={2}
                        className="input-dark"
                        value={draft.problem ?? ''}
                        onChange={(e) => patch({ problem: e.target.value })}
                      />
                    </Field>
                    <Field label="What was done">
                      <textarea
                        rows={2}
                        className="input-dark"
                        value={draft.fix ?? ''}
                        onChange={(e) => patch({ fix: e.target.value })}
                      />
                    </Field>
                    <Field label="The result">
                      <textarea
                        rows={2}
                        className="input-dark"
                        value={draft.result ?? ''}
                        onChange={(e) => patch({ result: e.target.value })}
                      />
                    </Field>
                  </div>
                </div>
                <div className="flex items-end pb-1 sm:col-span-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded accent-emerald-500"
                      checked={draft.published}
                      onChange={(e) => patch({ published: e.target.checked })}
                    />
                    Published (visible on /notes)
                  </label>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-2 border-t border-slate-800/80 pt-4 text-xs text-slate-500">
                <Trash2 className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                Honest copy only — no invented client stats or results. Real
                mechanics, real numbers, or leave it out.
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
