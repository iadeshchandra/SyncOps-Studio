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
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth, isDemoMode } from './firebase';

export interface DemoUser {
  uid: string;
  name: string;
  email: string;
  /** Mirrors Firebase's email_verified — the rules require it for order access. */
  emailVerified: boolean;
}

interface AuthContextValue {
  user: DemoUser | null;
  loading: boolean;
  signInDemo(): void;
  signInEmail(email: string, password: string): Promise<void>;
  signUpEmail(name: string, email: string, password: string): Promise<void>;
  signInGoogle(): Promise<void>;
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
  };
}

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
      return 'Password must be at least 6 characters.';
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
        setUser(toDemoUser(cred.user));
      } catch (err) {
        throw new Error(firebaseErrorMessage(err, 'Sign-in failed. Please try again.'));
      }
    },

    async signUpEmail(name: string, email: string, password: string) {
      if (name.trim().length < 2) throw new Error('Please enter your name.');
      if (!EMAIL_RE.test(email)) throw new Error('Please enter a valid email address.');
      if (password.length < 6) throw new Error('Password must be at least 6 characters.');
      if (isDemoMode || !auth) {
        const u: DemoUser = {
          uid: `demo-${Date.now().toString(36)}`,
          emailVerified: true,
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
        // In-app browsers (WhatsApp/Gmail) and strict popup blockers refuse
        // popups — fall back to a full-page redirect, which lands back here
        // signed in (A13).
        const code = (err as { code?: string })?.code ?? '';
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
