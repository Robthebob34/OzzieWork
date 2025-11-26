import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import Link from 'next/link';
import { isAxiosError } from 'axios';

import { Layout } from '../../../components/Layout';
import {
  ApplicationRecord,
  CreateApplicationPayload,
  Job,
  createApplication,
  fetchApplications,
  fetchJob,
  sendConversationMessage,
} from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';

export default function JobApplicationPage() {
  const router = useRouter();
  const jobId = router.query.id as string | undefined;
  const { user } = useAuth();

  const { data, error, isLoading } = useSWR<Job>(jobId ? ['job', jobId] : null, () => fetchJob(jobId as string));
  const job = data;

  const {
    data: existingApplications,
    isLoading: loadingApplicationStatus,
    mutate: mutateApplicationStatus,
  } = useSWR<ApplicationRecord[] | null>(
    user && jobId ? ['my-application', jobId] : null,
    () => fetchApplications({ jobId: Number(jobId) })
  );

  const alreadyApplied = useMemo(() => Boolean(existingApplications && existingApplications.length), [existingApplications]);

  const [about, setAbout] = useState('');
  const [startDate, setStartDate] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!about.trim() || !startDate || !job || !user) {
      return;
    }

    const employerId = job.employer_user_id;
    if (!employerId) {
      setSubmitError('Unable to contact employer for this job.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const coverLetter = `About me:\n${about.trim()}\n\nAvailability: ${startDate}`;
    const messageBody = `Job Application for ${job.title} (#${job.id})\n\n${coverLetter}`;

    try {
      const applicationPayload: CreateApplicationPayload = {
        job: job.id,
        cover_letter: coverLetter,
      };
      await createApplication(applicationPayload);
      await mutateApplicationStatus();

      const response = await sendConversationMessage({
        traveller_id: user.id,
        employer_id: employerId,
        job_id: job.id,
        body: messageBody,
      });
      setSubmitted(true);
      setTimeout(() => {
        router.push(`/messages?conversation=${response.conversation.id}`);
      }, 1200);
    } catch (err) {
      if (isAxiosError(err)) {
        const detail = (err.response?.data as { detail?: string; non_field_errors?: string[] }) || {};
        const errorMessage = detail.detail || detail.non_field_errors?.[0];
        if (errorMessage) {
          setSubmitError(errorMessage);
        } else {
          setSubmitError('Unable to submit your application. Please try again.');
        }
      } else {
        setSubmitError('Unable to submit your application. Please try again.');
      }
      setSubmitting(false);
    }
  };

  const disableSubmit = !about.trim() || !startDate || submitted || submitting || alreadyApplied;

  return (
    <Layout title={job ? `Apply for ${job.title}` : 'Apply for Job'}>
      <div className="mx-auto max-w-3xl space-y-8">
        <Link href={`/jobs/${jobId}`} className="inline-flex items-center text-sm text-brand-600">
          ← Back to job details
        </Link>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Unable to load job information. Please try again later.
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
            <header className="rounded-3xl border border-brand-100 bg-gradient-to-r from-brand-50 to-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-wide text-brand-600">Apply for</p>
              <h1 className="text-3xl font-semibold text-slate-900">{job.title}</h1>
              <p className="mt-1 text-lg text-slate-600">{job.employer_name ?? 'Employer confidential'}</p>
              <p className="mt-2 text-sm text-slate-500">
                {job.location_city || job.location}, {job.location_state || 'Australia'}
              </p>
            </header>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              {alreadyApplied && !submitted ? (
                <div className="space-y-3 text-center">
                  <p className="text-xl font-semibold text-emerald-700">You’ve already applied for this role</p>
                  <p className="text-sm text-slate-600">
                    We’ve let the employer know you’re interested. Sit tight while they review applications.
                  </p>
                  <Link href={`/jobs/${job.id}`} className="text-sm text-brand-600">
                    Back to job details
                  </Link>
                </div>
              ) : submitted ? (
                <div className="space-y-3 text-center">
                  <p className="text-xl font-semibold text-emerald-700">Application submitted!</p>
                  <p className="text-sm text-slate-600">
                    We’ve noted your interest. You’ll hear from the employer if they wish to proceed.
                  </p>
                  <Link href="/jobs" className="text-sm text-brand-600">
                    Back to Browse Jobs
                  </Link>
                </div>
              ) : (
                <form className="space-y-5" onSubmit={handleSubmit}>
                  {(submitError || loadingApplicationStatus) && (
                    <p className="rounded-md border border-yellow-100 bg-yellow-50 p-2 text-sm text-yellow-800">
                      {submitError || 'Checking for existing applications…'}
                    </p>
                  )}
                  <div>
                    <label className="text-sm font-medium text-slate-700" htmlFor="about">
                      Tell the employer about yourself
                    </label>
                    <textarea
                      id="about"
                      name="about"
                      rows={6}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200"
                      placeholder="Share your experience, motivations, and why youre a great fit for this job."
                      value={about}
                      onChange={(event) => setAbout(event.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700" htmlFor="start_date">
                      When can you start?
                    </label>
                    <input
                      id="start_date"
                      name="start_date"
                      type="date"
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={disableSubmit}
                    className="w-full rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-brand-300"
                  >
                    {submitting ? 'Sending…' : 'Submit Application'}
                  </button>
                </form>
              )}
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}
