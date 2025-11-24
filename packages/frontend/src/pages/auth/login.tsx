import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/router';
import { Layout } from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';

export default function LoginPage() {
  useAuthRedirect(undefined, { redirectIfFound: true });
  const router = useRouter();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nextPath = (router.query.next as string) || '/';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!form.email.trim() || !form.password) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      await login({ email: form.email.trim(), password: form.password });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Login">
      <div className="max-w-md space-y-6">
        <div>
          <p className="text-sm text-brand-600 font-medium">Welcome back</p>
          <h1 className="text-3xl font-semibold text-slate-900">Sign in</h1>
          <p className="text-slate-600 text-sm">Access your dashboard and applications.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-white p-6 shadow">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}
          <label className="block text-sm font-medium">
            Email
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="you@example.com"
              required
            />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-200"
              required
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-md bg-brand-500 px-4 py-2 text-white font-medium hover:bg-brand-600 transition disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="text-sm text-slate-600">
          New here? <Link href="/auth/register" className="text-brand-600">Create an account</Link>
        </p>
      </div>
    </Layout>
  );
}
