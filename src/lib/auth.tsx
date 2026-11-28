import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  signInWithRedirect,
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  EmailAuthProvider,
  linkWithCredential,
  linkWithPopup,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  verifyBeforeUpdateEmail,
  updatePassword,
  signOut as firebaseSignOut,
  type User,
  type OAuthCredential,
} from 'firebase/auth';
import { auth, isDemoMode } from './firebase';
import type { FirebaseError } from 'firebase/app';

export interface DemoUser {
  uid: string;
  name: string;
  email: string;
  /** Mirrors Firebase's email_verified — the rules require it for order access. */
  emailVerified: boolean;
  /** Sign-in provider ids on the account ('password', 'google.com', …). */
  providers: string[];
}

interface AuthContextValue {
  user: DemoUser | null;
  loading: boolean;
  signInDemo(): void;
  signInEmail(email: string, password: string): Promise<void>;
  signUpEmail(name: string, email: string, password: string): Promise<void>;
  signInGoogle(): Promise<void>;
  connectGoogle(): Promise<void>;
  changeEmail(newEmail: string): Promise<void>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  deleteAuthUser(currentPassword: string): Promise<void>;
  resetPassword(email: string): Promise<void>;
  resendVerification(): Promise<void>;
  signOut(): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = 'syncops_user';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toDemoUser(u: User): DemoUser {
  return {
    uid: u.uid,
    name: u.displayName ?? u.email?.split('@')[0] ?? 'Client',
    email: u.email ?? '',
    emailVerified: u.emailVerified,
    providers: u.providerData.map((p) => p.providerId),
  };
}

/**
 * A Google credential that collided with an existing password account
 * (one email = one account). Kept in memory only; after the client signs
 * in with their password we link it, so both doors open the same account.
 */
let pendingGoogleCredential: OAuthCredential | null = null;

function readStoredUser(): DemoUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DemoUser) : null;
  } catch {
    return null;
  }
}

function writeStoredUser(u: DemoUser | null): void {
  try {
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable — session-only auth */
  }
}

function firebaseErrorMessage(err: unknown, fallback: string): string {
  const code = (err as { code?: string } | null)?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address is not valid.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in.';
    case 'auth/weak-password':
      return 'Password must be at least 12 characters.';
    case 'auth/credential-already-in-use':
      return 'That Google account is already linked to a different account.';
    case 'auth/requires-recent-login':
      return 'For security, please sign out, sign in again, and retry.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a little and try again.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was cancelled.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    default:
      return fallback;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode || !auth) {
      setUser(readStoredUser());
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ? toDemoUser(u) : null);
      setLoading(false);
    });
    return unsub;
  }, []);

  const value: AuthContextValue = {
    user,
    loading,

    signInDemo() {
      const u: DemoUser = {
        uid: 'demo-architect',
          emailVerified: true,
        providers: ['password'],
        name: 'Demo Client',
        email: 'demo@syncops.studio',
      };
      writeStoredUser(u);
      setUser(u);
    },

    async signInEmail(email: string, password: string) {
      if (!EMAIL_RE.test(email)) throw new Error('Please enter a valid email address.');
      if (password.length < 6) throw new Error('Password must be at least 6 characters.');
      if (isDemoMode || !auth) {
        const u: DemoUser = {
          uid: `demo-${Date.now().toString(36)}`,
          emailVerified: true,
          providers: ['password'],
          name: email.split('@')[0] ?? 'Client',
          email,
        };
        writeStoredUser(u);
        setUser(u);
        return;
      }
      const liveAuth = auth;
      try {
        const cred = await signInWithEmailAndPassword(liveAuth, email, password);
        // One email, one account: if a Google sign-in just collided with
        // this password account, link the two now that identity is proven.
        if (pendingGoogleCredential) {
          try {
            await linkWithCredential(cred.user, pendingGoogleCredential);
          } catch {
            /* already linked or stale — the account itself is what matters */
          }
          pendingGoogleCredential = null;
        }
        setUser(toDemoUser(cred.user));
      } catch (err) {
        throw new Error(firebaseErrorMessage(err, 'Sign-in failed. Please try again.'));
      }
    },

    async signUpEmail(name: string, email: string, password: string) {
      if (name.trim().length < 2) throw new Error('Please enter your name.');
      if (!EMAIL_RE.test(email)) throw new Error('Please enter a valid email address.');
      if (password.length < 12) throw new Error('Password must be at least 12 characters.');
      if (isDemoMode || !auth) {
        const u: DemoUser = {
          uid: `demo-${Date.now().toString(36)}`,
          emailVerified: true,
          providers: ['password'],
          name: name.trim(),
          email,
        };
        writeStoredUser(u);
        setUser(u);
        return;
      }
      const liveAuth = auth;
      try {
        const cred = await createUserWithEmailAndPassword(liveAuth, email, password);
        await updateProfile(cred.user, { displayName: name.trim() });
        // Identity (Deep Review #2, A2): order access requires a verified
        // email, so the verification email goes out with every sign-up.
        try {
          await sendEmailVerification(cred.user);
        } catch {
          // Non-fatal — the portal offers a resend.
        }
        setUser(toDemoUser({ ...cred.user, displayName: name.trim() } as User));
      } catch (err) {
        throw new Error(firebaseErrorMessage(err, 'Account creation failed. Please try again.'));
      }
    },

    async signInGoogle() {
      if (isDemoMode || !auth) {
        const u: DemoUser = {
          uid: 'demo-google-1',
          emailVerified: true,
          providers: ['google.com'],
          name: 'Demo Client',
          email: 'demo.client@gmail.com',
        };
        writeStoredUser(u);
        setUser(u);
        return;
      }
      const liveAuth = auth;
      try {
        const cred = await signInWithPopup(liveAuth, new GoogleAuthProvider());
        setUser(toDemoUser(cred.user));
      } catch (err) {
        const code = (err as { code?: string })?.code ?? '';
        // One email, one account: this Google email already has a password
        // account. Keep the credential; once the client proves the password
        // (signInEmail), the two are linked into the single account.
        if (code === 'auth/account-exists-with-different-credential') {
          pendingGoogleCredential = GoogleAuthProvider.credentialFromError(err as FirebaseError);
          throw new Error(
            'This email already has an account with a password. Sign in with your password below — Google will be linked to the same account automatically.',
          );
        }
        // In-app browsers (WhatsApp/Gmail) and strict popup blockers refuse
        // popups — fall back to a full-page redirect, which lands back here
        // signed in (A13).
        if (
          code === 'auth/popup-blocked' ||
          code === 'auth/operation-not-supported-in-this-environment' ||
          code === 'auth/cancelled-popup-request'
        ) {
          await signInWithRedirect(liveAuth, new GoogleAuthProvider());
          return;
        }
        throw new Error(firebaseErrorMessage(err, 'Google sign-in failed. Please try again.'));
      }
    },

    async connectGoogle() {
      if (isDemoMode || !auth?.currentUser) return;
      try {
        const cred = await linkWithPopup(auth.currentUser, new GoogleAuthProvider());
        setUser(toDemoUser(cred.user));
      } catch (err) {
        throw new Error(firebaseErrorMessage(err, 'Could not connect Google. Please try again.'));
      }
    },

    async changeEmail(newEmail: string) {
      const target = newEmail.trim().toLowerCase();
      if (!EMAIL_RE.test(target)) throw new Error('Please enter a valid email address.');
      if (isDemoMode || !auth?.currentUser) return;
      try {
        // verifyBeforeUpdateEmail: the new address must prove itself by
        // verification link before it becomes the account email — an
        // unverified address can never take over an account.
        await verifyBeforeUpdateEmail(auth.currentUser, target);
      } catch (err) {
        throw new Error(firebaseErrorMessage(err, 'Could not start the email change.'));
      }
    },

    async changePassword(currentPassword: string, newPassword: string) {
      if (newPassword.length < 12) throw new Error('New password must be at least 12 characters.');
      if (isDemoMode || !auth?.currentUser) return;
      const current = auth.currentUser;
      try {
        const credential = EmailAuthProvider.credential(current.email ?? '', currentPassword);
        await reauthenticateWithCredential(current, credential);
        await updatePassword(current, newPassword);
      } catch (err) {
        throw new Error(firebaseErrorMessage(err, 'Could not change the password.'));
      }
    },

    async deleteAuthUser(currentPassword: string) {
      if (isDemoMode || !auth?.currentUser) {
        writeStoredUser(null);
        setUser(null);
        return;
      }
      const current = auth.currentUser;
      try {
        // Deletion always re-proves identity first (recent-login rule).
        if (current.providerData.some((p) => p.providerId === 'password')) {
          const credential = EmailAuthProvider.credential(current.email ?? '', currentPassword);
          await reauthenticateWithCredential(current, credential);
        } else {
          await reauthenticateWithPopup(current, new GoogleAuthProvider());
        }
        await current.delete();
        writeStoredUser(null);
        setUser(null);
      } catch (err) {
        throw new Error(firebaseErrorMessage(err, 'Could not delete the account.'));
      }
    },

    async resetPassword(email: string) {
      const target = email.trim().toLowerCase();
      if (!EMAIL_RE.test(target)) throw new Error('Enter the email address for your account first.');
      if (isDemoMode || !auth) return; // demo accounts have no real inbox
      try {
        await sendPasswordResetEmail(auth, target);
      } catch (err) {
        throw new Error(firebaseErrorMessage(err, 'Could not send the reset email. Please try again.'));
      }
    },

    async resendVerification() {
      if (isDemoMode || !auth?.currentUser) return;
      if (auth.currentUser.emailVerified) return;
      await sendEmailVerification(auth.currentUser);
    },

    signOut() {
      writeStoredUser(null);
      setUser(null);
      if (auth) void firebaseSignOut(auth);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>.');
  return ctx;
}
