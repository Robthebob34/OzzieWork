import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/router';
import { Layout } from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { RegisterPayload } from '../../lib/api';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';

export default function RegisterPage() {
  useAuthRedirect(undefined, { redirectIfFound: true });
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState<RegisterPayload>({
    email: '',
    password: '',
    confirm_password: '',
    role: 'traveller',
    first_name: '',
    last_name: '',
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextPath = (router.query.next as string) || '/';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (form.password !== form.confirm_password) {
      setError('Passwords must match.');
      return;
    }
    if (!acceptTerms) {
      setError('Please accept the terms to continue.');
      return;
    }
    setLoading(true);
    try {
      await register(form);
      await router.replace(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Create account">
      <div className="max-w-md space-y-6">
        <div>
          <p className="text-sm text-brand-600 font-medium">Join the community</p>
          <h1 className="text-3xl font-semibold">Create account</h1>
          <p className="text-slate-600 text-sm">Choose whether you are a traveller or employer.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-white p-6 shadow">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              First name
              <input
                value={form.first_name || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))}
                className="mt-1 w-full rounded-md border px-3 py-2"
                autoComplete="given-name"
              />
            </label>
            <label className="block text-sm font-medium">
              Last name
              <input
                value={form.last_name || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))}
                className="mt-1 w-full rounded-md border px-3 py-2"
                autoComplete="family-name"
              />
            </label>
          </div>
          <label className="block text-sm font-medium">
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              className="mt-1 w-full rounded-md border px-3 py-2"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Password
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                className="mt-1 w-full rounded-md border px-3 py-2"
                autoComplete="new-password"
                required
              />
            </label>
            <label className="block text-sm font-medium">
              Confirm password
              <input
                type="password"
                value={form.confirm_password}
                onChange={(e) => setForm((prev) => ({ ...prev, confirm_password: e.target.value }))}
                className="mt-1 w-full rounded-md border px-3 py-2"
                autoComplete="new-password"
                required
              />
            </label>
          </div>
          <label className="block text-sm font-medium">
            Role
            <select
              value={form.role}
              onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as RegisterPayload['role'] }))}
              className="mt-1 w-full rounded-md border px-3 py-2"
            >
              <option value="traveller">Traveller</option>
              <option value="employer">Employer</option>
            </select>
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border"
            />
            <span>
              I agree to the <span className="text-brand-600">terms of service</span> and{' '}
              <span className="text-brand-600">privacy policy</span>.
            </span>
          </label>
          <button
            type="submit"
            className="w-full rounded-md bg-brand-500 px-4 py-2 text-white font-medium hover:bg-brand-600 transition disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="text-sm text-slate-600">
          Already registered? <Link href="/auth/login" className="text-brand-600">Sign in</Link>
        </p>
      </div>
    </Layout>
  );
}
