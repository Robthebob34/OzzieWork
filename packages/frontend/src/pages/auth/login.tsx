import Link from 'next/link';
import { Layout } from '../../components/Layout';

export default function LoginPage() {
  return (
    <Layout title="Login">
      <div className="max-w-md space-y-6">
        <h1 className="text-3xl font-semibold">Sign in</h1>
        <p className="text-slate-600 text-sm">
          JWT auth wiring pending — connect to `/api/auth/token/` once backend is ready.
        </p>
        <form className="space-y-4 rounded-xl border bg-white p-6 shadow">
          <label className="block text-sm font-medium">
            Email
            <input type="email" className="mt-1 w-full rounded-md border px-3 py-2" placeholder="you@example.com" />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input type="password" className="mt-1 w-full rounded-md border px-3 py-2" />
          </label>
          <button type="button" className="w-full rounded-md bg-brand-500 px-4 py-2 text-white" disabled>
            Sign in (coming soon)
          </button>
        </form>
        <p className="text-sm text-slate-600">
          New here? <Link href="/auth/register" className="text-brand-600">Create an account</Link>
        </p>
      </div>
    </Layout>
  );
}
