import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import clsx from 'clsx';

import { Layout } from '../../components/Layout';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';
import { ApplicationRecord, Job, fetchApplications, fetchEmployerJobs } from '../../lib/api';

function JobListItem({
  job,
  isActive,
  onSelect,
}: {
  job: Job;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'w-full rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-brand-200',
        isActive ? 'border-brand-200 bg-brand-50/60 shadow' : 'border-slate-200 hover:border-brand-100'
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">{job.title}</h3>
        <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Active</span>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {job.location_city || job.location_state ? `${job.location_city || ''} ${job.location_state || ''}`.trim() : job.location}
      </p>
      <p className="text-xs text-slate-400">Posted {new Date(job.created_at).toLocaleDateString()}</p>
    </button>
  );
}

function ApplicantCard({ applicant }: { applicant: ApplicationRecord }) {
  const skills = applicant.applicant_skills?.slice(0, 3) ?? [];
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-4">
          <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center text-lg font-semibold text-slate-500">
            {applicant.applicant_profile_picture_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={applicant.applicant_profile_picture_url}
                alt={applicant.applicant_name || 'Applicant'}
                className="h-14 w-14 rounded-2xl object-cover"
              />
            ) : (
              (applicant.applicant_name || applicant.applicant_username || '?')
                .split(' ')
                .map((part) => part.charAt(0))
                .slice(0, 2)
                .join('')
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {applicant.applicant ? (
                <Link
                  href={`/profiles/${applicant.applicant}`}
                  className="text-lg font-semibold text-brand-600 hover:text-brand-500"
                >
                  {applicant.applicant_name ?? 'Unnamed traveller'}
                </Link>
              ) : (
                <h4 className="text-lg font-semibold text-slate-900">{applicant.applicant_name ?? 'Unnamed traveller'}</h4>
              )}
              <span className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-500">
                {applicant.status.replace('_', ' ')}
              </span>
            </div>
            {applicant.applicant_profile_summary ? (
              <p className="text-sm text-slate-600">{applicant.applicant_profile_summary}</p>
            ) : (
              <p className="text-sm text-slate-500 italic">No summary provided yet.</p>
            )}
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              {applicant.applicant_availability && (
                <span className="rounded-full bg-slate-100 px-2 py-1">Availability: {applicant.applicant_availability}</span>
              )}
              {skills.map((skill) => (
                <span key={skill} className="rounded-full bg-slate-100 px-2 py-1">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-2 text-right">
          <p className="text-xs text-slate-400">Applied {new Date(applicant.submitted_at).toLocaleDateString()}</p>
          <button
            type="button"
            disabled
            className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow disabled:cursor-not-allowed disabled:bg-brand-300"
          >
            Hire now
          </button>
        </div>
      </div>
      {applicant.cover_letter && (
        <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
          <p className="font-medium text-slate-500">Cover letter</p>
          <p className="mt-1 whitespace-pre-line">{applicant.cover_letter}</p>
        </div>
      )}
    </article>
  );
}

export default function EmployerApplicationsPage() {
  const { user, initializing, unauthorized } = useAuthRedirect('/auth/login', {
    requiredRole: 'employer',
    unauthorizedRedirectTo: '/',
  });
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    data: jobs,
    isLoading: loadingJobs,
    error: jobsError,
  } = useSWR<Job[]>(user ? ['employer-jobs'] : null, fetchEmployerJobs);

  const activeJobs = useMemo(() => (jobs || []).filter((job) => job.status === 'active'), [jobs]);

  useEffect(() => {
    if (!selectedJobId && activeJobs.length) {
      setSelectedJobId(activeJobs[0].id);
    }
  }, [activeJobs, selectedJobId]);

  const {
    data: applications,
    isLoading: loadingApplications,
    error: applicationsError,
  } = useSWR<ApplicationRecord[]>(
    selectedJobId ? ['applications', selectedJobId] : null,
    () => fetchApplications({ jobId: selectedJobId || undefined })
  );

  const filteredApplicants = useMemo(() => {
    if (!applications) return [];
    if (!searchTerm.trim()) return applications;
    const term = searchTerm.trim().toLowerCase();
    return applications.filter((applicant) =>
      (applicant.applicant_name || applicant.applicant_username || '').toLowerCase().includes(term)
    );
  }, [applications, searchTerm]);

  if (initializing || !user) {
    return (
      <Layout title="Application management">
        <p className="text-slate-500">Loading your workspace…</p>
      </Layout>
    );
  }

  if (unauthorized) {
    return (
      <Layout title="Application management">
        <p className="text-red-600">You must be an employer to view this page.</p>
      </Layout>
    );
  }

  return (
    <Layout title="Application management">
      <div className="space-y-8">
        <header className="space-y-1">
          <p className="text-sm uppercase tracking-wide text-brand-600">Hiring pipeline</p>
          <h1 className="text-3xl font-semibold text-slate-900">Applications overview</h1>
          <p className="text-sm text-slate-500">
            Track applicants across your active roles, review their summaries, and take action when ready.
          </p>
        </header>

        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="lg:w-1/3 space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">Active roles</h2>
                <span className="text-sm text-slate-500">{activeJobs.length}</span>
              </div>
              <div className="mt-4 space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                {jobsError && (
                  <p className="rounded-xl border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                    Unable to load jobs.
                  </p>
                )}
                {loadingJobs && <p className="text-sm text-slate-400">Loading jobs…</p>}
                {!loadingJobs && !activeJobs.length && (
                  <p className="text-sm text-slate-500">
                    No active jobs yet. Publish a job to see applicants here.
                  </p>
                )}
                {activeJobs.map((job) => (
                  <JobListItem
                    key={job.id}
                    job={job}
                    isActive={job.id === selectedJobId}
                    onSelect={() => setSelectedJobId(job.id)}
                  />
                ))}
              </div>
            </div>
          </aside>

          <section className="flex-1 space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              {selectedJobId ? (
                <>
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">
                        {activeJobs.find((job) => job.id === selectedJobId)?.title || 'Job applications'}
                      </h2>
                      <p className="text-sm text-slate-500">
                        {applications?.length || 0} applicant{applications && applications.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="w-full md:w-72">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search applicants by name"
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-brand-300 focus:ring-2 focus:ring-brand-200"
                      />
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    {applicationsError && (
                      <p className="rounded-xl border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                        Unable to load applicants.
                      </p>
                    )}
                    {loadingApplications && <p className="text-sm text-slate-400">Loading applicants…</p>}
                    {!loadingApplications && filteredApplicants.length === 0 && !applicationsError && (
                      <p className="text-sm text-slate-500">No applicants match your search.</p>
                    )}
                    {filteredApplicants.map((applicant) => (
                      <ApplicantCard key={applicant.id} applicant={applicant} />
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center text-sm text-slate-500">
                  Select an active job on the left to review its applicants.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
