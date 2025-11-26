import { useRouter } from 'next/router';
import useSWR from 'swr';
import Link from 'next/link';
import { Layout } from '../../components/Layout';
import { ApplicationRecord, Job, fetchApplications, fetchJob } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

function formatCurrency(amount?: string | number | null, currency: string = 'AUD') {
  if (amount === null || amount === undefined || amount === '') return null;
  const numeric = typeof amount === 'string' ? Number(amount) : amount;
  if (Number.isNaN(numeric)) return null;
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(numeric);
}

const dateFormatter = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

function formatDate(value?: string | null) {
  if (!value) return null;
  try {
    return dateFormatter.format(new Date(value));
  } catch (error) {
    return value;
  }
}

function DetailRow({ label, value }: { label: string; value?: string | number | boolean | null }) {
  if (value === undefined || value === null || value === '' || value === false) return null;
  return (
    <div className="flex justify-between border-b border-slate-100 py-3 text-sm">
      <span className="font-medium text-slate-500">{label}</span>
      <span className="text-right text-slate-800">{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}</span>
    </div>
  );
}

export default function JobDetailPage() {
  const router = useRouter();
  const jobId = router.query.id as string | undefined;
  const { user } = useAuth();

  const { data, error, isLoading } = useSWR<Job>(jobId ? ['job', jobId] : null, () => fetchJob(jobId as string));

  const job = data;

  const {
    data: myApplications,
    isLoading: loadingMyApplication,
  } = useSWR<ApplicationRecord[] | null>(
    user?.is_traveller && jobId ? ['my-application', jobId] : null,
    () => fetchApplications({ jobId: Number(jobId) })
  );

  const alreadyApplied = Boolean(myApplications && myApplications.length > 0);

  const salaryLabel = job?.hourly_rate
    ? `${formatCurrency(job.hourly_rate)} / hr`
    : job?.fixed_salary
    ? formatCurrency(job.fixed_salary)
    : 'Rate negotiable';

  return (
    <Layout title={job ? `${job.title} — Job Details` : 'Job Details'}>
      <div className="mx-auto max-w-4xl space-y-8">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Unable to load this job. Please try again later.
          </div>
        )}

        {isLoading && (
          <div className="space-y-4">
            <div className="h-10 w-2/3 rounded-2xl bg-slate-100" />
            <div className="h-4 w-1/3 rounded-full bg-slate-100" />
            <div className="h-64 rounded-2xl bg-slate-50" />
          </div>
        )}

        {job && (
          <>
            <header className="rounded-3xl border border-brand-100 bg-gradient-to-r from-brand-50 to-white p-8 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-wide text-brand-600">{job.category.replace('_', ' ')}</p>
                  <h1 className="mt-2 text-4xl font-semibold text-slate-900">{job.title}</h1>
                  <p className="mt-2 text-lg text-slate-600">{job.employer_name ?? 'Employer confidential'}</p>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
                    <span>
                      {job.location_city || job.location}, {job.location_state || 'Australia'}
                    </span>
                    {job.location_region && <span>· {job.location_region}</span>}
                    {job.location_address && <span>· {job.location_address}</span>}
                  </div>
                </div>
                {user?.is_traveller ? (
                  loadingMyApplication ? (
                    <span className="inline-flex h-fit items-center rounded-full border border-slate-200 px-6 py-3 text-sm text-slate-500">
                      Checking application status…
                    </span>
                  ) : alreadyApplied ? (
                    <span className="inline-flex h-fit items-center rounded-full border border-emerald-200 bg-emerald-50 px-6 py-3 text-sm font-semibold text-emerald-700">
                      You have already applied
                    </span>
                  ) : (
                    <Link
                      href={`/jobs/apply/${job.id}`}
                      className="inline-flex h-fit rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-brand-500"
                    >
                      Apply Now
                    </Link>
                  )
                ) : (
                  <Link
                    href={`/jobs/apply/${job.id}`}
                    className="inline-flex h-fit rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-brand-500"
                  >
                    Apply Now
                  </Link>
                )}
              </div>
              <div className="mt-6 flex flex-wrap gap-4">
                <div className="rounded-2xl border border-white/60 bg-white/80 px-5 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Compensation</p>
                  <p className="text-2xl font-semibold text-brand-700">{salaryLabel}</p>
                </div>
                <div className="rounded-2xl border border-white/60 bg-white/80 px-5 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Employment type</p>
                  <p className="text-lg font-semibold text-slate-800">{job.employment_type.replace('_', ' ')}</p>
                </div>
                {job.start_date && (
                  <div className="rounded-2xl border border-white/60 bg-white/80 px-5 py-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Start date</p>
                    <p className="text-lg font-semibold text-slate-800">{formatDate(job.start_date)}</p>
                  </div>
                )}
              </div>
            </header>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">About this role</h2>
              <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-slate-700">{job.description}</p>
              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Key details</h3>
                  <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                    <DetailRow label="Contract type" value={job.employment_type.replace('_', ' ')} />
                    <DetailRow label="Hours per day" value={job.work_hours_per_day} />
                    <DetailRow label="Days per week" value={job.days_per_week} />
                    <DetailRow label="Experience required" value={job.experience_required ? 'Yes' : 'No'} />
                    <DetailRow label="Transport provided" value={job.transport_provided ? 'Yes' : 'No'} />
                    <DetailRow label="Remote friendly" value={job.is_remote_friendly ? 'Yes' : 'No'} />
                    {job.end_date && <DetailRow label="End date" value={formatDate(job.end_date)} />}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Accommodation & extras</h3>
                  <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                    <DetailRow label="Accommodation provided" value={job.accommodation_provided ? 'Yes' : 'No'} />
                    {job.accommodation_cost !== null && (
                      <DetailRow
                        label="Accommodation cost"
                        value={job.accommodation_cost ? formatCurrency(job.accommodation_cost) : 'Included'}
                      />
                    )}
                    <DetailRow label="Skills" value={job.skills || 'Not specified'} />
                    <DetailRow label="Languages" value={job.language_requirements || 'Not specified'} />
                    <DetailRow label="Certifications" value={job.certifications_required || 'Not specified'} />
                  </div>
                </div>
              </div>
            </section>

            <div className="text-center text-sm text-slate-500">
              <Link href="/jobs" className="text-brand-600">
                ← Back to Browse Jobs
              </Link>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
