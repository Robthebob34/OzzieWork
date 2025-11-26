import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Layout } from '../../components/Layout';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';
import { EmployerProfile, EmployerStatsPayload, fetchEmployerProfile, fetchEmployerStats } from '../../lib/api';

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
    </div>
    <div className="mt-4 space-y-3 text-sm text-slate-600">{children}</div>
  </section>
);

const StatCard = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
    <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
    <p className="text-2xl font-semibold text-slate-900">{value}</p>
  </div>
);

export default function EmployerProfilePage() {
  const { user, initializing } = useAuthRedirect('/auth/login', { requiredRole: 'employer', unauthorizedRedirectTo: '/' });
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [stats, setStats] = useState<EmployerStatsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initializing || !user?.is_employer) return;

    let cancelled = false;
    async function load() {
      try {
        const [profileResponse, statsResponse] = await Promise.all([fetchEmployerProfile(), fetchEmployerStats()]);
        if (!cancelled) {
          setProfile(profileResponse);
          setStats(statsResponse);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load employer profile.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [initializing, user]);

  const jobCounts = stats?.counts || { total: 0, active: 0, draft: 0, closed: 0 };
  const socialLinks = useMemo(() => profile?.social_links?.filter(Boolean) || [], [profile]);

  if (initializing || loading) {
    return (
      <Layout title="Employer profile">
        <p className="text-slate-500">Loading employer profile…</p>
      </Layout>
    );
  }

  if (error || !profile) {
    return (
      <Layout title="Employer profile">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error || 'Employer profile unavailable.'}</div>
      </Layout>
    );
  }

  return (
    <Layout title="Employer profile">
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="rounded-3xl border border-brand-100 bg-gradient-to-r from-brand-50 via-white to-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-2xl bg-slate-100">
                {profile.logo_url ? (
                  <img src={profile.logo_url} alt={profile.company_name || 'Logo'} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-slate-400">
                    {(profile.company_name || user?.email || '?')[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm uppercase tracking-wider text-brand-600">Employer profile</p>
                <h1 className="text-3xl font-semibold text-slate-900">{profile.company_name || 'Add your business name'}</h1>
                <p className="text-slate-600">{profile.company_description || 'Share a short description of your company culture and roles.'}</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:items-end">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1 text-sm font-medium text-amber-700">
                <span>★</span>
                <span>
                  {profile.average_rating ? Number(profile.average_rating).toFixed(1) : '—'} / 5 ({profile.rating_count || 0})
                </span>
              </div>
              <Link
                href="/employer/settings"
                className="rounded-full border border-brand-500 px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50"
              >
                Edit employer profile
              </Link>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          <SectionCard title="Business identity">
            <p>
              <strong className="text-slate-900">Business category:</strong> {profile.business_category || '—'}
            </p>
            <p>
              <strong className="text-slate-900">ABN:</strong> {profile.abn || '—'}
            </p>
            <p>
              <strong className="text-slate-900">Address:</strong>{' '}
              {[profile.address_street, profile.address_city, profile.address_state, profile.address_postcode].filter(Boolean).join(', ') || '—'}
            </p>
          </SectionCard>
          <SectionCard title="Contact information">
            <p>
              <strong className="text-slate-900">Contact:</strong> {profile.contact_name || '—'}
            </p>
            <p>
              <strong className="text-slate-900">Phone:</strong> {profile.contact_phone || '—'}
            </p>
            <p>
              <strong className="text-slate-900">Email:</strong> {profile.contact_email || '—'}
            </p>
            <p>
              <strong className="text-slate-900">Website:</strong>{' '}
              {profile.website ? (
                <a href={profile.website} target="_blank" rel="noreferrer" className="text-brand-600 underline">
                  {profile.website}
                </a>
              ) : (
                '—'
              )}
            </p>
            {socialLinks.length > 0 && (
              <div>
                <strong className="text-slate-900">Social links</strong>
                <ul className="mt-1 list-disc pl-4 text-brand-600">
                  {socialLinks.map((link) => (
                    <li key={link}>
                      <a href={link} target="_blank" rel="noreferrer" className="underline">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </SectionCard>
          <SectionCard title="Job overview">
            <div className="grid grid-cols-2 gap-3 text-center">
              <StatCard label="Total jobs" value={jobCounts.total} />
              <StatCard label="Active" value={jobCounts.active} />
              <StatCard label="Drafts" value={jobCounts.draft} />
              <StatCard label="Closed" value={jobCounts.closed} />
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Active roles">
          {stats?.active_jobs?.length ? (
            <div className="space-y-3">
              {stats.active_jobs.map((job) => (
                <Link key={job.id} href={`/employer/jobs/${job.id}`} className="block rounded-xl border border-slate-200 p-4 shadow-sm hover:border-brand-400">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">{job.title}</h3>
                      <p className="text-sm text-slate-500">
                        {job.location} · {job.is_remote_friendly ? 'Remote OK' : 'Onsite'}
                      </p>
                    </div>
                    <span className="text-sm text-slate-500">${job.hourly_rate}/{job.currency}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">No active roles yet. Publish a job from the dashboard.</p>
          )}
        </SectionCard>

        <SectionCard title="Draft roles">
          {stats?.draft_jobs?.length ? (
            <ul className="space-y-2 text-sm text-slate-600">
              {stats.draft_jobs.map((job) => (
                <li key={job.id} className="rounded-lg border border-slate-100 p-3">
                  <div className="flex justify-between">
                    <span>{job.title}</span>
                    <Link href={`/employer/jobs/${job.id}`} className="text-brand-600 underline">
                      Continue editing
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500">No drafts. Start drafting a new posting.</p>
          )}
        </SectionCard>

        <SectionCard title="Closed jobs history">
          {stats?.closed_jobs?.length ? (
            <div className="space-y-2 text-sm text-slate-600">
              {stats.closed_jobs.map((job) => (
                <div key={job.id} className="rounded-lg border border-slate-100 p-3">
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-900">{job.title}</span>
                    <span className="text-xs text-slate-500">
                      {job.start_date || '—'} – {job.end_date || '—'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{job.location}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">Closed jobs will appear here for historical records.</p>
          )}
        </SectionCard>

        <SectionCard title="Recent worker feedback">
          {stats?.recent_comments?.length ? (
            <div className="space-y-4">
              {stats.recent_comments.map((comment, idx) => (
                <div key={`${comment.worker_name}-${idx}`} className="rounded-xl border border-slate-100 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{comment.worker_name}</p>
                      <p className="text-xs text-slate-500">
                        {comment.start_date || '—'} – {comment.end_date || '—'}
                      </p>
                    </div>
                    {comment.rating ? (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">★ {Number(comment.rating).toFixed(1)}</span>
                    ) : (
                      <span className="text-slate-400">No rating</span>
                    )}
                  </div>
                  {comment.notes ? <p className="mt-2 text-sm text-slate-600">“{comment.notes}”</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">No worker feedback yet.</p>
          )}
        </SectionCard>

        <SectionCard title="Team & past workers">
          {profile.worker_history?.length ? (
            <div className="space-y-4">
              {profile.worker_history.map((worker) => (
                <div key={worker.id} className="rounded-xl border border-slate-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{worker.worker_name}</p>
                      <p className="text-xs text-slate-500">{worker.job_title || 'Role unspecified'}</p>
                    </div>
                    {worker.rating ? (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">★ {Number(worker.rating).toFixed(1)}</span>
                    ) : (
                      <span className="text-slate-400">No rating</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {worker.start_date || '—'} – {worker.end_date || '—'}
                  </p>
                  {worker.notes ? <p className="mt-2 text-sm text-slate-600">{worker.notes}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">No worker history recorded yet.</p>
          )}
        </SectionCard>

        <SectionCard title="Billing & payments">
          <p className="text-slate-500">Payment methods, invoices, and payroll history will appear here soon.</p>
          <p className="text-sm text-slate-500">Need something sooner? Contact support to enable beta billing dashboards.</p>
        </SectionCard>
      </div>
    </Layout>
  );
}
