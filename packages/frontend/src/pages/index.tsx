import Link from 'next/link';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';

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
  const { user, initializing } = useAuth();

  const loggedOutHero = (
    <section className="grid gap-10 lg:grid-cols-2 items-center">
      <div className="space-y-6">
        <p className="inline-flex rounded-full bg-brand-50 text-brand-700 px-4 py-1 text-sm font-medium">
          PWA ready • Install on mobile
        </p>
        <h1 className="text-4xl font-bold text-slate-900">Australian working holiday jobs, simplified.</h1>
        <p className="text-lg text-slate-600">
          Discover regional gigs that count toward visa days, apply quickly, and keep your hours + payments organised.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link className="px-5 py-3 rounded-full bg-brand-600 text-white shadow" href="/auth/login">
            Log in
          </Link>
          <Link className="px-5 py-3 rounded-full border border-brand-500 text-brand-700" href="/auth/register">
            Create an account
          </Link>
        </div>
        <p className="text-sm text-slate-500">
          Already have an account? Log in to browse roles, apply, or manage your hiring pipeline.
        </p>
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
  );

  const loggedInHero = (
    <section className="space-y-10">
      <div className="grid gap-10 lg:grid-cols-2 items-center">
        <div className="space-y-6">
          <p className="inline-flex rounded-full bg-brand-50 text-brand-700 px-4 py-1 text-sm font-medium">
            Welcome back
          </p>
          <h1 className="text-4xl font-bold text-slate-900">Pick up where you left off.</h1>
          <p className="text-lg text-slate-600">
            Jump straight into posting roles, reviewing applicants, or applying for your next gig.
          </p>
        </div>
        <div className="grid gap-4">
          {heroCards.map((card) => (
            <div key={card.title} className="border bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-lg">{card.title}</h3>
              <p className="text-slate-600">{card.body}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {user?.is_traveller && (
            <>
              <Link className="rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white" href="/jobs">
                Browse jobs
              </Link>
              <Link className="rounded-full border border-slate-200 px-5 py-2 text-sm text-slate-600" href="/messages">
                View messages
              </Link>
            </>
          )}
          {user?.is_employer && (
            <>
              <Link className="rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white" href="/employer/dashboard">
                Employer dashboard
              </Link>
              <Link className="rounded-full border border-brand-500 px-5 py-2 text-sm font-semibold text-brand-600" href="/employer/post-job">
                Post a job
              </Link>
              <Link className="rounded-full border border-slate-200 px-5 py-2 text-sm text-slate-600" href="/employer/applications">
                Review applicants
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );

  return (
    <Layout>
      {initializing ? (
        <p className="text-slate-500">Preparing your experience…</p>
      ) : user ? (
        loggedInHero
      ) : (
        loggedOutHero
      )}
    </Layout>
  );
}
