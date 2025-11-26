import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Layout } from '../../components/Layout';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';
import { Job, fetchEmployerJobs } from '../../lib/api';

export default function EmployerDashboard() {
  const { user, initializing, unauthorized } = useAuthRedirect('/auth/login', {
    requiredRole: 'employer',
    unauthorizedRedirectTo: '/',
  });
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.is_employer) {
      setJobs([]);
      return;
    }
    setLoadingJobs(true);
    fetchEmployerJobs()
      .then((data) => {
        setJobs(data);
        setJobError(null);
      })
      .catch(() => {
        setJobError('Unable to load job posts.');
      })
      .finally(() => setLoadingJobs(false));
  }, [user]);

  const stats = useMemo(() => {
    const active = jobs.filter((job) => job.status === 'active').length;
    const draft = jobs.filter((job) => job.status === 'draft').length;
    return {
      active,
      draft,
      total: jobs.length,
    };
  }, [jobs]);

  if (initializing || !user) {
    return (
      <Layout title="Employer dashboard">
        <p className="text-slate-500">Loading your dashboard…</p>
      </Layout>
    );
  }

  if (unauthorized) {
    return (
      <Layout title="Employer dashboard">
        <p className="text-red-600">You must be an employer to access this page.</p>
      </Layout>
    );
  }

  return (
    <Layout title="Employer dashboard">
      <div className="space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Launchpad</p>
            <h1 className="text-3xl font-semibold">Employer overview</h1>
          </div>
          <Link href="/employer/post-job" className="rounded-md bg-brand-500 px-4 py-2 text-white">
            Post a job
          </Link>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Active roles', value: stats.active },
            { label: 'Draft roles', value: stats.draft },
            { label: 'Total roles', value: stats.total },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border bg-white p-4">
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className="text-2xl font-semibold">{stat.value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-xl border bg-white p-6">
          <h2 className="text-xl font-semibold mb-2">Next steps</h2>
          <ol className="list-decimal list-inside text-slate-600 space-y-1 text-sm">
            <li>Create your first job post via the button above.</li>
            <li>Track applicants from the applications tab (coming soon).</li>
            <li>Invite hiring managers to collaborate (future update).</li>
          </ol>
        </section>

        <section className="rounded-xl border bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">My job posts</h2>
            <Link href="/employer/post-job" className="text-sm font-medium text-brand-600">
              + Post job
            </Link>
          </div>
          {jobError && <p className="mt-4 text-sm text-red-600">{jobError}</p>}
          {loadingJobs ? (
            <p className="mt-4 text-sm text-slate-500">Loading jobs…</p>
          ) : jobs.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No jobs yet. Use the “Post job” button to create your first listing.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {jobs.map((job) => (
                <article key={job.id} className="rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-slate-900">{job.title}</h3>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            job.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {job.status === 'active' ? 'Active' : 'Draft'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">
                        {job.location} · {job.employment_type.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-slate-500">
                        {job.hourly_rate ? `AUD ${job.hourly_rate}/hr` : job.fixed_salary ? `AUD ${job.fixed_salary}` : 'Rate TBD'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/employer/jobs/${job.id}/edit`}
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300"
                      >
                        Edit job
                      </Link>
                      <Link
                        href={`/employer/applications?jobId=${job.id}`}
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600"
                      >
                        View applicants
                      </Link>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Posted {new Date(job.created_at).toLocaleDateString()}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
