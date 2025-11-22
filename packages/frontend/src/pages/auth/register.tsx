import Link from 'next/link';
import { Layout } from '../../components/Layout';

export default function RegisterPage() {
  return (
    <Layout title="Create account">
      <div className="max-w-md space-y-6">
        <h1 className="text-3xl font-semibold">Join Working Holiday Jobs</h1>
        <p className="text-slate-600 text-sm">
          Choose whether you are a traveller or employer. This will map to the backend user flags.
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
          <label className="block text-sm font-medium">
            Role
            <select className="mt-1 w-full rounded-md border px-3 py-2">
              <option value="traveller">Traveller</option>
              <option value="employer">Employer</option>
            </select>
          </label>
          <button type="button" className="w-full rounded-md bg-brand-500 px-4 py-2 text-white" disabled>
            Create account (coming soon)
          </button>
        </form>
        <p className="text-sm text-slate-600">
          Already registered? <Link href="/auth/login" className="text-brand-600">Sign in</Link>
        </p>
      </div>
    </Layout>
  );
}
