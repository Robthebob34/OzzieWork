import Link from 'next/link';
import useSWR from 'swr';
import clsx from 'clsx';

import { Layout } from '../../../components/Layout';
import { useAuthRedirect } from '../../../hooks/useAuthRedirect';
import { JobOffer, fetchTravellerJobs } from '../../../lib/api';

const STATUS_BADGE: Record<string, string> = {
  accepted: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-slate-100 text-slate-600',
  declined: 'bg-rose-100 text-rose-700',
};

const TIMESHEET_BADGE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  submitted: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
};

export default function TravellerJobsPage() {
  const { user, initializing, unauthorized } = useAuthRedirect('/auth/login', {
    requiredRole: 'traveller',
    unauthorizedRedirectTo: '/',
  });

  const { data: jobs, error, isLoading } = useSWR<JobOffer[]>(
    user?.is_traveller ? ['traveller-jobs'] : null,
    fetchTravellerJobs
  );

  if (initializing || !user) {
    return (
      <Layout title="My jobs">
        <p className="text-slate-500">Loading accepted jobs…</p>
      </Layout>
    );
  }

  if (unauthorized) {
    return (
      <Layout title="My jobs">
        <p className="text-red-600">You must be a traveller to access this page.</p>
      </Layout>
    );
  }

  return (
    <Layout title="My jobs">
      <div className="space-y-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-brand-600">Current contracts</p>
            <h1 className="text-3xl font-semibold text-slate-900">My jobs</h1>
            <p className="text-sm text-slate-500">Access contract details, submit timesheets, and stay aligned with employers.</p>
          </div>
          <Link
            href="/jobs"
            className="text-sm font-semibold text-brand-600 hover:text-brand-500"
          >
            Browse more jobs →
          </Link>
        </header>

        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Unable to load your jobs. Please refresh later.
          </p>
        )}

        {isLoading ? (
          <p className="text-slate-500">Loading jobs…</p>
        ) : !jobs?.length ? (
          <div className="rounded-3xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
            You haven’t accepted any offers yet. Once you do, your job cards will appear here.
          </div>
        ) : (
          <div className="grid gap-4">
            {jobs.map((offer) => {
              const timesheetStatus = offer.timesheet?.status || 'draft';
              return (
                <article key={offer.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">Employer</p>
                      <h2 className="text-xl font-semibold text-slate-900">
                        {offer.employer_name || 'Employer'} · {offer.job_title || 'Job title'}
                      </h2>
                      <p className="text-sm text-slate-500">
                        {new Date(offer.start_date).toLocaleDateString()} →{' '}
                        {offer.end_date ? new Date(offer.end_date).toLocaleDateString() : 'Flexible'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={clsx(
                          'rounded-full px-3 py-1 text-xs font-semibold',
                          STATUS_BADGE[offer.status] || STATUS_BADGE.pending
                        )}
                      >
                        {offer.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span
                        className={clsx(
                          'rounded-full px-3 py-1 text-xs font-semibold',
                          TIMESHEET_BADGE[timesheetStatus] || TIMESHEET_BADGE.draft
                        )}
                      >
                        Timesheet: {timesheetStatus.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/traveller/my-jobs/${offer.application}`}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-300 hover:text-brand-600"
                    >
                      View contract
                    </Link>
                    <Link
                      href={`/messages?conversation=${offer.application}`}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:border-slate-300"
                    >
                      Message employer
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
