import Link from 'next/link';
import { Layout } from '../../components/Layout';

const mockStats = [
  { label: 'Open roles', value: 3 },
  { label: 'Applicants awaiting review', value: 8 },
  { label: 'Hours logged this week', value: 42 },
];

export default function EmployerDashboard() {
  return (
    <Layout title="Employer dashboard">
      <div className="space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Launchpad</p>
            <h1 className="text-3xl font-semibold">Employer overview</h1>
          </div>
          <Link href="/jobs" className="rounded-md bg-brand-500 px-4 py-2 text-white">
            Post new job (soon)
          </Link>
        </header>
        <section className="grid gap-4 sm:grid-cols-3">
          {mockStats.map((stat) => (
            <div key={stat.label} className="rounded-xl border bg-white p-4">
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className="text-2xl font-semibold">{stat.value}</p>
            </div>
          ))}
        </section>
        <section className="rounded-xl border bg-white p-6">
          <h2 className="text-xl font-semibold mb-2">Next steps</h2>
          <ol className="list-decimal list-inside text-slate-600 space-y-1 text-sm">
            <li>Connect Stripe account once payouts are enabled.</li>
            <li>Invite hiring managers (RBAC TBD).</li>
            <li>Review latest applicants under Applications tab.</li>
          </ol>
        </section>
      </div>
    </Layout>
  );
}
