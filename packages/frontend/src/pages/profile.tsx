import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { useAuthRedirect } from '../hooks/useAuthRedirect';
import { EmployerProfile, EmployerStatsPayload, fetchEmployerProfile, fetchEmployerStats } from '../lib/api';

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
    <div className="mt-4 space-y-3 text-sm text-slate-600">{children}</div>
  </section>
);

const DetailRow = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="flex flex-col">
    <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
    <span className="text-base text-slate-900">{value || '—'}</span>
  </div>
);

const ChipList = ({ items }: { items?: string[] }) => {
  if (!items || items.length === 0) {
    return <span className="text-slate-400">No data yet</span>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          {item}
        </span>
      ))}
    </div>
  );
};

const RatingBadge = ({ rating }: { rating?: number | string }) => {
  if (rating === undefined || rating === null) {
    return <span className="text-slate-400">No ratings yet</span>;
  }
  const normalized = typeof rating === 'number' ? rating : Number(rating);
  if (Number.isNaN(normalized)) {
    return <span className="text-slate-400">No ratings yet</span>;
  }
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
      <span>★</span>
      <span>{normalized.toFixed(1)} / 5</span>
    </div>
  );
};

export default function ProfilePage() {
  const { user, initializing } = useAuthRedirect();
  const [employerProfile, setEmployerProfile] = useState<EmployerProfile | null>(null);
  const [employerStats, setEmployerStats] = useState<EmployerStatsPayload | null>(null);
  const [employerLoading, setEmployerLoading] = useState(false);
  const [employerError, setEmployerError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.is_employer) {
      setEmployerProfile(null);
      setEmployerStats(null);
      setEmployerLoading(false);
      return;
    }
    setEmployerLoading(true);
    let cancelled = false;
    async function loadEmployerDetails() {
      try {
        const [profileResponse, statsResponse] = await Promise.all([fetchEmployerProfile(), fetchEmployerStats()]);
        if (!cancelled) {
          setEmployerProfile(profileResponse);
          setEmployerStats(statsResponse);
          setEmployerError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setEmployerError('Unable to load employer details.');
        }
      } finally {
        if (!cancelled) {
          setEmployerLoading(false);
        }
      }
    }
    loadEmployerDetails();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const jobHistory = user?.job_history || [];
  const employerJobCounts = employerStats?.counts || { total: 0, active: 0, draft: 0, closed: 0 };
  const socialLinks = useMemo(() => employerProfile?.social_links?.filter(Boolean) || [], [employerProfile]);

  if (initializing || !user) {
    return (
      <Layout title="Profile">
        <p className="text-slate-500">Loading profile…</p>
      </Layout>
    );
  }

  return (
    <Layout title="Profile">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="rounded-3xl bg-gradient-to-r from-brand-50 via-white to-white p-6 sm:p-10 shadow-sm border border-brand-100">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-2xl bg-slate-100">
                {user.profile_picture_url ? (
                  <img src={user.profile_picture_url} alt={user.first_name || user.email} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-slate-400">
                    {(user.first_name || employerProfile?.company_name || user.email)[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm uppercase tracking-wider text-brand-600">
                  {user.is_traveller ? 'Traveller' : user.is_employer ? 'Employer' : 'User'}
                </p>
                <h1 className="text-3xl font-semibold text-slate-900">
                  {user.is_employer
                    ? employerProfile?.company_name || user.email
                    : [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email}
                </h1>
                <p className="text-slate-600">
                  {user.is_employer
                    ? employerProfile?.company_description || 'Share a short description about your company.'
                    : user.bio || 'Add a short bio in settings to showcase your personality.'}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <RatingBadge rating={user.is_employer ? employerProfile?.average_rating : user.global_rating} />
              <Link
                href="/settings/profile"
                className="rounded-full border border-brand-500 px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50"
              >
                Edit profile
              </Link>
            </div>
          </div>
        </header>

        {!user.is_employer && (
          <>
            <div className="grid gap-6 lg:grid-cols-3">
              <SectionCard title="Identity">
                <DetailRow label="Email" value={user.email} />
                <DetailRow label="Phone" value={user.phone} />
                <DetailRow label="Country of origin" value={user.country_of_origin} />
                <DetailRow label="Date of birth" value={user.date_of_birth || ''} />
                <DetailRow
                  label="Address"
                  value={[user.address_street, user.address_city, user.address_state, user.address_postcode].filter(Boolean).join(', ')}
                />
              </SectionCard>
              <SectionCard title="Compliance">
                <DetailRow label="TFN" value={user.tfn} />
                <DetailRow label="ABN" value={user.abn} />
                <DetailRow label="Availability" value={user.availability} />
              </SectionCard>
              <SectionCard title="Banking">
                <DetailRow label="Bank name" value={user.bank_name} />
                <DetailRow label="BSB" value={user.bank_bsb} />
                <DetailRow label="Account number" value={user.bank_account_number} />
              </SectionCard>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <SectionCard title="Skills">
                <ChipList items={user.skills} />
              </SectionCard>
              <SectionCard title="Languages">
                <ChipList items={user.languages} />
              </SectionCard>
            </div>

            <SectionCard title="Work history & ratings">
              {jobHistory.length === 0 ? (
                <p className="text-slate-500">No jobs recorded yet. Add your first engagement from the settings page.</p>
              ) : (
                <div className="space-y-4">
                  {jobHistory.map((job) => (
                    <div key={job.id || `${job.employer_name}-${job.job_title}`} className="rounded-2xl border border-slate-100 p-4 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{job.job_title}</p>
                          <p className="text-xs text-slate-500">{job.employer_name}</p>
                        </div>
                        <RatingBadge rating={typeof job.rating === 'number' ? job.rating : Number(job.rating)} />
                      </div>
                      <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">
                        {job.start_date} → {job.end_date || 'Present'}
                      </p>
                      {job.employer_comments && <p className="mt-2 text-sm text-slate-600">“{job.employer_comments}”</p>}
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </>
        )}

        {user.is_employer && (
          <>
            {employerError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{employerError}</div>
            )}
            <div className="grid gap-6 lg:grid-cols-3">
              <SectionCard title="Business identity">
                <DetailRow label="Business category" value={employerProfile?.business_category} />
                <DetailRow label="ABN" value={employerProfile?.abn} />
                <DetailRow
                  label="Address"
                  value={
                    [
                      employerProfile?.address_street,
                      employerProfile?.address_city,
                      employerProfile?.address_state,
                      employerProfile?.address_postcode,
                    ]
                      .filter(Boolean)
                      .join(', ')
                  }
                />
              </SectionCard>
              <SectionCard title="Contact information">
                <DetailRow label="Contact name" value={employerProfile?.contact_name} />
                <DetailRow label="Phone" value={employerProfile?.contact_phone} />
                <DetailRow label="Email" value={employerProfile?.contact_email} />
                <DetailRow label="Website" value={employerProfile?.website} />
                {socialLinks.length > 0 && (
                  <div>
                    <span className="text-xs uppercase tracking-wide text-slate-400">Social links</span>
                    <ul className="mt-1 list-disc pl-4 text-brand-600">
                      {socialLinks.map((link) => (
                        <li key={link}>
                          <a href={link} className="underline" target="_blank" rel="noreferrer">
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
                  <Stat label="Total" value={employerJobCounts.total} />
                  <Stat label="Active" value={employerJobCounts.active} />
                  <Stat label="Drafts" value={employerJobCounts.draft} />
                  <Stat label="Closed" value={employerJobCounts.closed} />
                </div>
              </SectionCard>
            </div>

            <SectionCard title="Active roles">
              {employerLoading ? (
                <p className="text-slate-500">Loading jobs…</p>
              ) : employerStats?.active_jobs?.length ? (
                <div className="space-y-3">
                  {employerStats.active_jobs.map((job) => (
                    <Link key={job.id} href={`/employer/jobs/${job.id}`} className="block rounded-xl border border-slate-200 p-4 shadow-sm hover:border-brand-400">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-base font-semibold text-slate-900">{job.title}</p>
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
                <p className="text-slate-500">No active roles yet.</p>
              )}
            </SectionCard>

            <SectionCard title="Draft roles">
              {employerStats?.draft_jobs?.length ? (
                <ul className="space-y-2 text-sm text-slate-600">
                  {employerStats.draft_jobs.map((job) => (
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
                <p className="text-slate-500">No draft roles.</p>
              )}
            </SectionCard>

            <SectionCard title="Closed jobs history">
              {employerStats?.closed_jobs?.length ? (
                <div className="space-y-2 text-sm text-slate-600">
                  {employerStats.closed_jobs.map((job) => (
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
                <p className="text-slate-500">Closed jobs will appear here.</p>
              )}
            </SectionCard>

            <SectionCard title="Recent worker feedback">
              {employerStats?.recent_comments?.length ? (
                <div className="space-y-4">
                  {employerStats.recent_comments.map((comment, idx) => (
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
              {employerProfile?.worker_history?.length ? (
                <div className="space-y-4">
                  {employerProfile.worker_history.map((worker) => (
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
          </>
        )}
      </div>
    </Layout>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

