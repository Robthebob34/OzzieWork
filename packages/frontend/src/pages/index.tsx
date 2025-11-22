import Link from 'next/link';
import { Layout } from '../components/Layout';

const heroCards = [
  {
    title: 'Find jobs fast',
    body: 'Search curated farm, hospitality, and temp gigs designed for working holiday makers.',
  },
  {
    title: 'Apply in a tap',
    body: 'Upload docs once, reuse across applications, and track progress easily.',
  },
  {
    title: 'Employer friendly',
    body: 'Managers can review candidates, log hours, and manage payments in one place.',
  },
];

export default function HomePage() {
  return (
    <Layout>
      <section className="grid gap-10 lg:grid-cols-2 items-center">
        <div className="space-y-6">
          <p className="inline-flex rounded-full bg-brand-50 text-brand-700 px-4 py-1 text-sm font-medium">
            PWA ready • Install on mobile
          </p>
          <h1 className="text-4xl font-bold text-slate-900">Australian working holiday jobs, simplified.</h1>
          <p className="text-lg text-slate-600">
            Discover regional gigs that count toward visa days, apply quickly, and keep your hours + payments organised.
          </p>
          <div className="flex gap-4">
            <Link className="px-4 py-2 rounded-md bg-brand-500 text-white" href="/jobs">
              Browse Jobs
            </Link>
            <Link className="px-4 py-2 rounded-md border border-brand-500 text-brand-700" href="/apply">
              Get Started
            </Link>
          </div>
        </div>
        <div className="grid gap-4">
          {heroCards.map((card) => (
            <div key={card.title} className="border bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-lg">{card.title}</h3>
              <p className="text-slate-600">{card.body}</p>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}
