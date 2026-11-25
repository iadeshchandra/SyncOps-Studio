import { useEffect, useState, type ReactNode } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { cx } from '../../lib/format';
import { saveSiteConfig, useSiteConfig } from '../../lib/siteConfig';
import { SERVICE_LINES } from '../../data/services';
import type { ServiceLine, ServiceLineProof, ServicePackage } from '../../data/services';

/* ------------------------------------------------------------------ */
/* Services CMS — edits the four service lines shown in the landing    */
/* Services section and the hire-modal line selector. Saved as one     */
/* array on `platformConfig/public` via saveSiteConfig({ services });  */
/* null means "use the compiled-in SERVICE_LINES". The ServiceLine     */
/* shape is plain JSON (icon is a lucide name string), so no mapping   */
/* is needed between the editor draft and the stored payload.          */
/* ------------------------------------------------------------------ */

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

function Accordion({
  title,
  desc,
  badge,
  open,
  onToggle,
  children,
}: {
  title: string;
  desc: string;
  badge?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="glass overflow-hidden rounded-lg">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-5 text-left transition-colors hover:bg-slate-800/30 sm:px-6"
      >
        <h3 className="h-display flex-1 text-base">{title}</h3>
        {badge}
        <ChevronDown
          className={cx(
            'h-4 w-4 shrink-0 text-slate-500 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div className="border-t border-slate-800/80 p-5 sm:px-6">
          <p className="mb-5 text-sm text-slate-400">{desc}</p>
          <div className="space-y-5">{children}</div>
        </div>
      )}
    </section>
  );
}

function ItemCard({
  index,
  label,
  onRemove,
  children,
}: {
  index: number;
  label: string;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="telemetry text-cyan-400">
          {label} {index + 1}
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-medium text-rose-400/80 transition-colors hover:text-rose-300"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" /> Remove
        </button>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

/** Replace the item at index i with a patched copy. */
function updateAt<T>(arr: T[], i: number, patch: Partial<T>): T[] {
  return arr.map((item, idx) => (idx === i ? { ...item, ...patch } : item));
}

/** Deep clone — safe because ServiceLine is plain JSON by design. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'package'
  );
}

/* ------------------------- save-time cleaning --------------------- */
/* Firestore rejects `undefined` values, so optional keys are omitted  */
/* entirely when empty instead of being carried as undefined.          */

function cleanProof(proof: ServiceLineProof | undefined): ServiceLineProof | undefined {
  if (!proof) return undefined;
  const text = proof.text.trim();
  const url = proof.url.trim();
  const urlLabel = proof.urlLabel.trim();
  if (!text && !url) return undefined;
  return { text, url, urlLabel: urlLabel || 'Learn more' };
}

function cleanPackage(pkg: ServicePackage): ServicePackage {
  return {
    id: pkg.id,
    name: pkg.name.trim(),
    price: pkg.price.trim(),
    blurb: pkg.blurb.trim(),
    features: pkg.features.map((f) => f.trim()).filter(Boolean),
  };
}

function cleanLine(line: ServiceLine): ServiceLine {
  const out: ServiceLine = {
    id: line.id,
    name: line.name.trim(),
    tagline: line.tagline.trim(),
    description: line.description.trim(),
    icon: line.icon,
    packages: line.packages.map(cleanPackage),
  };
  const proof = cleanProof(line.proof);
  if (proof) out.proof = proof;
  const note = line.migrationNote?.trim();
  if (note) out.migrationNote = note;
  return out;
}

/* ------------------------------ tab ------------------------------- */

export default function ServicesTab() {
  const { config, loading } = useSiteConfig();
  const [draft, setDraft] = useState<ServiceLine[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const overridden = !!config.services && config.services.length > 0;

  // Seed the draft once the effective config has loaded.
  useEffect(() => {
    if (draft !== null || loading) return;
    const source = overridden ? (config.services as ServiceLine[]) : SERVICE_LINES;
    setDraft(clone(source));
    setOpen(source.length > 0 ? { [source[0].id]: true } : {});
  }, [draft, loading, config.services, overridden]);

  const toggleSection = (id: string) =>
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));

  const patchLine = (i: number, p: Partial<ServiceLine>) => {
    setDraft((d) => (d ? updateAt(d, i, p) : d));
    setDirty(true);
  };

  const patchPackage = (li: number, pi: number, p: Partial<ServicePackage>) => {
    setDraft((d) => {
      if (!d) return d;
      const line = d[li];
      return updateAt(d, li, { packages: updateAt(line.packages, pi, p) });
    });
    setDirty(true);
  };

  const patchProof = (li: number, p: Partial<ServiceLineProof>) => {
    setDraft((d) => {
      if (!d) return d;
      const line = d[li];
      const proof: ServiceLineProof = { ...(line.proof ?? { text: '', url: '', urlLabel: '' }), ...p };
      return updateAt(d, li, { proof });
    });
    setDirty(true);
  };

  const addPackage = (li: number) => {
    setDraft((d) => {
      if (!d) return d;
      const line = d[li];
      const pkg: ServicePackage = {
        id: `${line.id}-${slugify(`package ${line.packages.length + 1}`)}`,
        name: '',
        price: '',
        blurb: '',
        features: [],
      };
      return updateAt(d, li, { packages: [...line.packages, pkg] });
    });
    setDirty(true);
  };

  const removePackage = (li: number, pi: number) => {
    setDraft((d) => {
      if (!d) return d;
      const line = d[li];
      return updateAt(d, li, { packages: line.packages.filter((_, idx) => idx !== pi) });
    });
    setDirty(true);
  };

  const save = async () => {
    if (!draft) return;
    const cleaned = draft.map(cleanLine);
    const badLine = cleaned.find((l) => !l.name);
    if (badLine) {
      setNotice({ ok: false, text: `Service line "${badLine.id}" needs a name.` });
      return;
    }
    const badPkg = cleaned
      .flatMap((l) => l.packages.map((p) => ({ line: l, pkg: p })))
      .find(({ pkg }) => !pkg.name);
    if (badPkg) {
      setNotice({
        ok: false,
        text: `A package in "${badPkg.line.name}" needs a name.`,
      });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      await saveSiteConfig({ services: cleaned });
      setDraft(cleaned);
      setDirty(false);
      setNotice({ ok: true, text: 'Saved — live on next load.' });
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : 'Save failed.' });
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (
      !window.confirm(
        'Reset service lines to the built-in defaults? Your console edits will be discarded.',
      )
    )
      return;
    setResetting(true);
    setNotice(null);
    try {
      await saveSiteConfig({ services: null });
      setDraft(clone(SERVICE_LINES));
      setDirty(false);
      setNotice({ ok: true, text: 'Reset — built-in defaults are live on next load.' });
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : 'Reset failed.' });
    } finally {
      setResetting(false);
    }
  };

  if (draft === null) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="ml-2 text-sm">Loading service lines…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="glass-strong flex flex-col gap-3 rounded-lg p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="h-display text-lg">Services</h2>
          <p className="mt-1 max-w-xl text-sm text-slate-400">
            The four service lines on the landing page and in the hire modal — names,
            copy, proof, and packages. Saving publishes to the live site; line IDs and
            icons are fixed in code.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={cx(
              'telemetry rounded px-1.5 py-0.5',
              overridden
                ? 'bg-cyan-500/15 text-cyan-300'
                : 'bg-slate-500/15 text-slate-400',
            )}
          >
            {overridden ? 'CONSOLE OVERRIDE' : 'BUILT-IN DEFAULTS'}
          </span>
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
          <button
            type="button"
            className="btn-ghost !px-3 !py-2 text-xs"
            onClick={reset}
            disabled={resetting || saving}
          >
            {resetting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            Reset to built-in defaults
          </button>
          <button className="btn-primary" onClick={save} disabled={saving || resetting}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save services
          </button>
        </div>
      </div>

      {/* One accordion per service line */}
      {draft.map((line, li) => (
        <Accordion
          key={line.id}
          title={line.name || line.id}
          desc="Public copy for this line — the card on the landing page and the selector in the hire modal update from these fields."
          badge={
            <span className="telemetry rounded bg-slate-500/15 px-1.5 py-0.5 text-slate-400">
              {line.id.toUpperCase()}
            </span>
          }
          open={!!open[line.id]}
          onToggle={() => toggleSection(line.id)}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <input
                className="input-dark"
                placeholder="CAPI Infrastructure"
                value={line.name}
                onChange={(e) => patchLine(li, { name: e.target.value })}
              />
            </Field>
            <Field label="Tagline">
              <input
                className="input-dark"
                placeholder="One line — what it is and who it is for"
                value={line.tagline}
                onChange={(e) => patchLine(li, { tagline: e.target.value })}
              />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <textarea
                rows={3}
                className="input-dark"
                placeholder="2–3 sentences shown on the service card."
                value={line.description}
                onChange={(e) => patchLine(li, { description: e.target.value })}
              />
            </Field>
            <Field label="Line ID (fixed)" className="sm:col-span-1">
              <input
                className="input-dark font-mono text-sm opacity-60"
                value={line.id}
                readOnly
                disabled
              />
            </Field>
            <Field label="Icon (fixed)" className="sm:col-span-1">
              <input
                className="input-dark font-mono text-sm opacity-60"
                value={line.icon}
                readOnly
                disabled
              />
            </Field>
            <p className="-mt-2 text-xs text-slate-500 sm:col-span-2">
              The line ID and icon are fixed per line — they are wired into the hire
              flow and the icon set in code, so they can&apos;t be changed here.
            </p>
          </div>

          {/* Proof */}
          <div className="rounded-md border border-slate-800 bg-slate-950/60 p-4">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded accent-emerald-500"
                checked={!!line.proof}
                onChange={(e) =>
                  patchLine(li, {
                    proof: e.target.checked
                      ? { text: '', url: '', urlLabel: '' }
                      : undefined,
                  })
                }
              />
              Show proof line (real, verifiable trust proof under the description)
            </label>
            {line.proof && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Proof text" className="sm:col-span-2">
                  <input
                    className="input-dark"
                    placeholder="4.9/5 from 322 Fiverr reviews · 240+ businesses tracked since 2019"
                    value={line.proof.text}
                    onChange={(e) => patchProof(li, { text: e.target.value })}
                  />
                </Field>
                <Field label="Proof URL">
                  <input
                    className="input-dark font-mono text-sm"
                    placeholder="https://…"
                    value={line.proof.url}
                    onChange={(e) => patchProof(li, { url: e.target.value })}
                  />
                </Field>
                <Field label="Proof link label">
                  <input
                    className="input-dark"
                    placeholder="Read the reviews"
                    value={line.proof.urlLabel}
                    onChange={(e) => patchProof(li, { urlLabel: e.target.value })}
                  />
                </Field>
              </div>
            )}
          </div>

          {/* Migration note */}
          <Field label="Migration / concierge note (optional)">
            <textarea
              rows={2}
              className="input-dark"
              placeholder="Shown in a highlighted box above the call to action. Leave empty to hide."
              value={line.migrationNote ?? ''}
              onChange={(e) => patchLine(li, { migrationNote: e.target.value })}
            />
          </Field>

          {/* Packages */}
          <div className="space-y-4">
            <p className="label-dark !mb-0">Packages</p>
            {line.packages.map((pkg, pi) => (
              <ItemCard
                key={pi}
                index={pi}
                label="PACKAGE"
                onRemove={() => removePackage(li, pi)}
              >
                <Field label="Name">
                  <input
                    className="input-dark"
                    placeholder="Single CAPI Node"
                    value={pkg.name}
                    onChange={(e) => patchPackage(li, pi, { name: e.target.value })}
                  />
                </Field>
                <Field label="Price (formatted label)">
                  <input
                    className="input-dark font-mono"
                    placeholder="$2,400 or Custom"
                    value={pkg.price}
                    onChange={(e) => patchPackage(li, pi, { price: e.target.value })}
                  />
                </Field>
                <Field label="Blurb" className="sm:col-span-2">
                  <input
                    className="input-dark"
                    placeholder="One line — who this tier is for"
                    value={pkg.blurb}
                    onChange={(e) => patchPackage(li, pi, { blurb: e.target.value })}
                  />
                </Field>
                <Field label="Features (one per line)" className="sm:col-span-2">
                  <textarea
                    rows={5}
                    className="input-dark font-mono text-sm"
                    placeholder={'Feature one\nFeature two'}
                    value={pkg.features.join('\n')}
                    onChange={(e) =>
                      patchPackage(li, pi, { features: e.target.value.split('\n') })
                    }
                  />
                </Field>
              </ItemCard>
            ))}
            <button
              type="button"
              className="btn-ghost w-full"
              onClick={() => addPackage(li)}
            >
              <Plus className="h-4 w-4" /> Add package
            </button>
          </div>
        </Accordion>
      ))}
    </div>
  );
}
