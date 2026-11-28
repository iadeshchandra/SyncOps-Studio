import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Terminal,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  BadgeCheck,
  Chrome,
  KeyRound,
  Mail,
  Trash2,
  Check,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import {
  COUNTRIES,
  EMPTY_PROFILE,
  PhoneTakenError,
  isE164,
  loadProfile,
  profileProgress,
  releaseProfileAndPhone,
  saveProfile,
  splitE164,
  toE164,
} from '../lib/profile';
import type { ClientProfile } from '../lib/profile';
import { cx } from '../lib/format';

const TIMEZONES: string[] = (() => {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return [];
  }
})();

const detectedTz = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
})();

export default function ClientProfilePage() {
  const { user, connectGoogle, changeEmail, changePassword, deleteAuthUser, signOut } = useAuth();
  const navigate = useNavigate();

  const [loaded, setLoaded] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form state
  const [fullName, setFullName] = useState('');
  const [phoneDial, setPhoneDial] = useState('880');
  const [phoneNational, setPhoneNational] = useState('');
  const [sameWhatsapp, setSameWhatsapp] = useState(true);
  const [waDial, setWaDial] = useState('880');
  const [waNational, setWaNational] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [website, setWebsite] = useState('');
  const [country, setCountry] = useState('');
  const [timezone, setTimezone] = useState(detectedTz);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  // Security state
  const [newEmail, setNewEmail] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailNote, setEmailNote] = useState<string | null>(null);
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwNote, setPwNote] = useState<string | null>(null);
  const [delPw, setDelPw] = useState('');
  const [delArmed, setDelArmed] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleNote, setGoogleNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      const p = (await loadProfile(user.uid).catch(() => null)) ?? null;
      if (cancelled) return;
      setLoaded(p);
      const base = p ?? { ...EMPTY_PROFILE, fullName: user.name ?? '', timezone: detectedTz };
      setFullName(base.fullName);
      const ph = splitE164(base.phone);
      setPhoneDial(ph.dial || '880');
      setPhoneNational(ph.national);
      const wa = splitE164(base.whatsapp);
      setSameWhatsapp(!base.whatsapp || base.whatsapp === base.phone);
      setWaDial(wa.dial || ph.dial || '880');
      setWaNational(base.whatsapp && base.whatsapp !== base.phone ? wa.national : '');
      setBusinessName(base.businessName);
      setWebsite(base.website);
      setCountry(base.country);
      setTimezone(base.timezone || detectedTz);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const progress = useMemo(
    () =>
      profileProgress({
        ...(loaded ?? EMPTY_PROFILE),
        fullName,
        phone: phoneNational ? toE164(phoneDial, phoneNational) : '',
        businessName,
        country,
        timezone,
      }),
    [loaded, fullName, phoneNational, phoneDial, businessName, country, timezone],
  );

  if (!user) return null;
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  const hasPassword = user.providers.includes('password');
  const hasGoogle = user.providers.includes('google.com');

  const submitProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaveError(null);
    setSaveOk(false);
    let phone = '';
    if (phoneNational.trim()) {
      phone = toE164(phoneDial, phoneNational);
      if (!isE164(phone)) {
        setSaveError('That phone number does not look complete — check the country code and the full number.');
        return;
      }
    }
    let whatsapp = '';
    if (!sameWhatsapp && waNational.trim()) {
      whatsapp = toE164(waDial, waNational);
      if (!isE164(whatsapp)) {
        setSaveError('That WhatsApp number does not look complete — check the country code and the full number.');
        return;
      }
    } else if (sameWhatsapp) {
      whatsapp = phone;
    }
    const next: ClientProfile = {
      ...(loaded ?? EMPTY_PROFILE),
      fullName,
      email: user.email,
      phone,
      whatsapp,
      businessName,
      website,
      country,
      timezone,
    };
    setSaving(true);
    try {
      const saved = await saveProfile(user.uid, user.email, next, loaded);
      setLoaded(saved);
      setSaveOk(true);
    } catch (err) {
      setSaveError(
        err instanceof PhoneTakenError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not save your profile. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const submitEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (emailBusy) return;
    setEmailBusy(true);
    setEmailNote(null);
    try {
      await changeEmail(newEmail);
      setEmailNote(
        'Verification email sent to the new address. Click its link to finish the change — until then, this account keeps using your current email.',
      );
      setNewEmail('');
    } catch (err) {
      setEmailNote(err instanceof Error ? err.message : 'Could not start the email change.');
    } finally {
      setEmailBusy(false);
    }
  };

  const submitPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (pwBusy) return;
    setPwBusy(true);
    setPwNote(null);
    try {
      await changePassword(curPw, newPw);
      setPwNote('Password changed.');
      setCurPw('');
      setNewPw('');
    } catch (err) {
      setPwNote(err instanceof Error ? err.message : 'Could not change the password.');
    } finally {
      setPwBusy(false);
    }
  };

  const submitDelete = async () => {
    if (!delArmed) {
      setDelArmed(true);
      return;
    }
    if (delBusy) return;
    setDelBusy(true);
    setDelError(null);
    try {
      // Release the phone claim first, then delete the identity itself.
      // Orders stay in the studio's records under the account email.
      await releaseProfileAndPhone(user.uid, loaded?.phone ?? '');
      await deleteAuthUser(delPw);
      navigate('/', { replace: true });
    } catch (err) {
      setDelError(err instanceof Error ? err.message : 'Could not delete the account.');
      setDelBusy(false);
    }
  };

  const tzOptions = TIMEZONES.includes(timezone) || !timezone
    ? TIMEZONES
    : [timezone, ...TIMEZONES];

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <header className="glass flex flex-wrap items-center gap-3 rounded-xl px-4 py-3.5 sm:px-5">
          <Link to="/client/dashboard" className="flex items-center gap-2.5" aria-label="Back to my account">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-400">
              <Terminal className="h-4 w-4" />
            </span>
            <p className="h-display text-sm">SyncOps Studio</p>
          </Link>
          <span className="hidden h-5 w-px bg-slate-800 sm:block" />
          <p className="telemetry">my_profile</p>
          <Link to="/client/dashboard" className="btn-ghost ml-auto px-3.5 py-2 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />
            My account
          </Link>
        </header>

        <div className="mt-8">
          <p className="eyebrow">profile</p>
          <h1 className="h-display mt-1 text-2xl">Your profile</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
            One account, one email, one phone number — that is how the studio keeps your
            projects unmistakably yours. Your phone is how we reach you about your build;
            it is never a login and never shared.
          </p>
          <p className="mt-3 text-sm text-slate-300">
            Profile {progress.done} of {progress.total} complete
            {progress.gaps.length > 0 && (
              <span className="text-slate-500"> — still to add: {progress.gaps.map((g) => g.label.toLowerCase()).join(', ')}</span>
            )}
          </p>
        </div>

        <form onSubmit={submitProfile} className="glass mt-6 space-y-5 rounded-xl p-5 sm:p-6">
          <div>
            <label htmlFor="pf-name" className="label-dark">Full name</label>
            <input id="pf-name" className="input-dark" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
          </div>

          <div>
            <label htmlFor="pf-phone-national" className="label-dark">
              Phone number{' '}
              {loaded?.phone && loaded.phoneVerified && (
                <span className="ml-1 inline-flex items-center gap-1 text-emerald-400">
                  <BadgeCheck className="h-3.5 w-3.5" /> verified by the studio
                </span>
              )}
              {loaded?.phone && !loaded.phoneVerified && (
                <span className="ml-1 text-slate-500">— the studio verifies it with you personally</span>
              )}
            </label>
            <div className="flex gap-2">
              <select
                aria-label="Phone country code"
                className="input-dark w-36 shrink-0"
                value={phoneDial}
                onChange={(e) => setPhoneDial(e.target.value)}
              >
                {COUNTRIES.map((c) => (
                  <option key={`${c.name}-${c.dial}`} value={c.dial}>
                    +{c.dial} · {c.name}
                  </option>
                ))}
              </select>
              <input
                id="pf-phone-national"
                className="input-dark"
                value={phoneNational}
                onChange={(e) => setPhoneNational(e.target.value)}
                placeholder="1XXXXXXXXX"
                inputMode="tel"
                autoComplete="tel-national"
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              One phone number can belong to only one account — that protects your projects
              from ever being claimed by someone else.
            </p>
          </div>

          <div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={sameWhatsapp}
                onChange={(e) => setSameWhatsapp(e.target.checked)}
                className="h-4 w-4 accent-emerald-500"
              />
              My WhatsApp number is the same as my phone number
            </label>
            {!sameWhatsapp && (
              <div className="mt-3 flex gap-2">
                <select
                  aria-label="WhatsApp country code"
                  className="input-dark w-36 shrink-0"
                  value={waDial}
                  onChange={(e) => setWaDial(e.target.value)}
                >
                  {COUNTRIES.map((c) => (
                    <option key={`wa-${c.name}-${c.dial}`} value={c.dial}>
                      +{c.dial} · {c.name}
                    </option>
                  ))}
                </select>
                <input
                  className="input-dark"
                  value={waNational}
                  onChange={(e) => setWaNational(e.target.value)}
                  placeholder="WhatsApp number"
                  inputMode="tel"
                />
              </div>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="pf-business" className="label-dark">Business name</label>
              <input id="pf-business" className="input-dark" value={businessName} onChange={(e) => setBusinessName(e.target.value)} autoComplete="organization" />
            </div>
            <div>
              <label htmlFor="pf-website" className="label-dark">Website</label>
              <input id="pf-website" className="input-dark" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="yourstore.com" autoComplete="url" />
            </div>
            <div>
              <label htmlFor="pf-country" className="label-dark">Country</label>
              <select id="pf-country" className="input-dark" value={country} onChange={(e) => setCountry(e.target.value)}>
                <option value="">Select your country</option>
                {COUNTRIES.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pf-tz" className="label-dark">Timezone</label>
              <select id="pf-tz" className="input-dark" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                {tzOptions.map((tz) => (
                  <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          {saveError && (
            <div className="flex items-start gap-2 rounded-md border border-rose-800/60 bg-rose-950/50 px-3 py-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <p className="text-sm text-rose-200">{saveError}</p>
            </div>
          )}
          {saveOk && (
            <div className="flex items-start gap-2 rounded-md border border-emerald-800/60 bg-emerald-950/50 px-3 py-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <p className="text-sm text-emerald-200">Profile saved.</p>
            </div>
          )}

          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </form>

        {/* Sign-in & security */}
        <section className="glass mt-6 rounded-xl p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-100">
            <ShieldCheck className="h-4 w-4 text-emerald-400" /> Sign-in &amp; security
          </h2>

          <div className="mt-4 space-y-2 text-sm text-slate-300">
            <p>
              Account email: <span className="font-semibold text-slate-100">{user.email}</span>
              {user.emailVerified && <span className="ml-2 text-emerald-400">verified</span>}
            </p>
            <p>
              Sign-in methods:{' '}
              {hasPassword && <span className="mr-2 rounded border border-slate-700 px-2 py-0.5 text-xs">Email &amp; password</span>}
              {hasGoogle && <span className="rounded border border-slate-700 px-2 py-0.5 text-xs">Google</span>}
            </p>
            {hasPassword && !hasGoogle && (
              <div className="pt-1">
                <button
                  type="button"
                  disabled={googleBusy}
                  onClick={async () => {
                    setGoogleBusy(true);
                    setGoogleNote(null);
                    try {
                      await connectGoogle();
                      setGoogleNote('Google connected — you can now sign in either way, to this same account.');
                    } catch (err) {
                      setGoogleNote(err instanceof Error ? err.message : 'Could not connect Google.');
                    } finally {
                      setGoogleBusy(false);
                    }
                  }}
                  className="btn-ghost px-3.5 py-2 text-xs"
                >
                  <Chrome className="h-3.5 w-3.5" /> Connect Google sign-in
                </button>
                {googleNote && <p className="mt-2 text-xs text-slate-400">{googleNote}</p>}
              </div>
            )}
          </div>

          <form onSubmit={submitEmail} className="mt-6 border-t border-slate-800 pt-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Mail className="h-4 w-4 text-slate-400" /> Change account email
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              The new address must click a verification link before it becomes your account
              email. If the new email already belongs to another account, the change will be
              refused — one email, one account.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                className="input-dark min-w-56 flex-1"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new@email.com"
              />
              <button type="submit" disabled={emailBusy || !newEmail.trim()} className="btn-ghost px-3.5 py-2 text-xs">
                {emailBusy ? 'Sending…' : 'Send verification'}
              </button>
            </div>
            {emailNote && <p className="mt-2 text-xs text-slate-400">{emailNote}</p>}
          </form>

          {hasPassword && (
            <form onSubmit={submitPassword} className="mt-6 border-t border-slate-800 pt-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <KeyRound className="h-4 w-4 text-slate-400" /> Change password
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <input
                  className="input-dark"
                  type="password"
                  value={curPw}
                  onChange={(e) => setCurPw(e.target.value)}
                  placeholder="Current password"
                  autoComplete="current-password"
                />
                <input
                  className="input-dark"
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="New password (12+ characters)"
                  autoComplete="new-password"
                />
              </div>
              <button type="submit" disabled={pwBusy || !curPw || !newPw} className="btn-ghost mt-3 px-3.5 py-2 text-xs">
                {pwBusy ? 'Changing…' : 'Change password'}
              </button>
              {pwNote && <p className="mt-2 text-xs text-slate-400">{pwNote}</p>}
            </form>
          )}
        </section>

        {/* Delete account */}
        <section className="mt-6 rounded-xl border border-rose-900/60 bg-rose-950/20 p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-rose-200">
            <Trash2 className="h-4 w-4" /> Delete account
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-rose-100/70">
            Deleting removes your sign-in and profile, and releases your phone number.
            Your project records stay in the studio's books under your account email —
            they are the delivery and payment history of work already done.
          </p>
          {hasPassword && (
            <input
              className="input-dark mt-4 max-w-sm"
              type="password"
              value={delPw}
              onChange={(e) => setDelPw(e.target.value)}
              placeholder="Your password, to confirm"
              autoComplete="current-password"
            />
          )}
          {delError && <p className="mt-2 text-sm text-rose-300">{delError}</p>}
          <button
            type="button"
            disabled={delBusy || (hasPassword && !delPw)}
            onClick={submitDelete}
            className={cx(
              'mt-4 rounded-md px-4 py-2.5 text-sm font-bold transition-all',
              delArmed
                ? 'bg-rose-600 text-white hover:bg-rose-500'
                : 'border border-rose-800/70 text-rose-300 hover:border-rose-600',
            )}
          >
            {delBusy ? 'Deleting…' : delArmed ? 'Tap again to permanently delete' : 'Delete my account'}
          </button>
          {delArmed && !delBusy && (
            <button type="button" onClick={() => setDelArmed(false)} className="ml-3 text-xs text-slate-400 underline-offset-2 hover:underline">
              Keep my account
            </button>
          )}
          <p className="mt-4 text-xs text-slate-500">
            Signed in as {user.email}.{' '}
            <button type="button" onClick={() => { signOut(); navigate('/'); }} className="underline-offset-2 hover:underline">
              Sign out instead
            </button>
          </p>
        </section>
      </div>
    </div>
  );
}
