import { getRedirectResult, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { auth, googleProvider } from '../firebase';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle redirect result when returning from Google OAuth page
  useEffect(() => {
    setLoading(true);
    getRedirectResult(auth)
      .then((result) => {
        if (!result) setLoading(false); // no redirect in progress
      })
      .catch((err) => {
        setError(getErrorMessage(err));
        setLoading(false);
      });
  }, []);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user') {
        // Popup was blocked — fall back to redirect flow
        try {
          await signInWithRedirect(auth, googleProvider);
          return; // page will reload
        } catch (redirectErr) {
          setError(getErrorMessage(redirectErr));
        }
      } else {
        setError(getErrorMessage(err));
      }
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-[#0a0a0f] px-4">
      <div
        className="pointer-events-none fixed left-1/4 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-3xl"
        style={{ background: '#ff00aa' }}
      />
      <div
        className="pointer-events-none fixed right-1/4 bottom-1/4 h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full opacity-15 blur-3xl"
        style={{ background: '#00eeff' }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 text-center">
        <div className="text-8xl">📷</div>
        <div>
          <h1 className="text-5xl font-bold tracking-tight text-white">
            Photo<span className="text-pink-500">booth</span>
          </h1>
          <p className="mt-3 text-lg text-gray-400">
            Real-time photos with your friends — beautiful frames included.
          </p>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="flex items-center gap-3 rounded-full bg-white px-8 py-4 text-gray-800 font-semibold text-lg shadow-lg transition hover:scale-105 hover:shadow-xl active:scale-100 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
        >
          {loading ? (
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-400 border-t-gray-800" />
          ) : (
            <GoogleIcon />
          )}
          {loading ? 'Signing in…' : 'Sign in with Google'}
        </button>

        {error && (
          <div className="max-w-sm rounded-xl bg-red-500/10 border border-red-500/30 px-5 py-4 text-sm text-red-400">
            <p className="font-semibold mb-1">Sign-in failed</p>
            <p className="text-red-500/80">{error}</p>
          </div>
        )}

        <p className="text-sm text-gray-600">
          No email required — just your Google account.
        </p>
      </div>
    </div>
  );
}

function getErrorMessage(err: unknown): string {
  const code = (err as { code?: string }).code ?? '';
  const message = (err as { message?: string }).message ?? String(err);

  if (code === 'auth/unauthorized-domain') {
    return 'This domain is not authorized in Firebase. Add "localhost" to Firebase Console → Authentication → Settings → Authorized domains.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Google sign-in is not enabled. Go to Firebase Console → Authentication → Sign-in method → Google → Enable.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network error. Check your internet connection.';
  }
  return message || 'An unexpected error occurred.';
}

function GoogleIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
