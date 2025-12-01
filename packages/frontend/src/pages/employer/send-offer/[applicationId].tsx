import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import clsx from 'clsx';
import { isAxiosError } from 'axios';

import { Layout } from '../../../components/Layout';
import { useAuthRedirect } from '../../../hooks/useAuthRedirect';
import {
  ApplicationRecord,
  CreateJobOfferPayload,
  EmployerProfile,
  Job,
  JobOffer,
  fetchApplication,
  fetchEmployerProfile,
  fetchJob,
  fetchJobOffer,
  createJobOffer,
  updateJobOffer,
} from '../../../lib/api';

interface FormState {
  startDate: string;
  endDate: string;
  rateType: 'hourly' | 'daily';
  rateAmount: string;
  rateCurrency: string;
  accommodationDetails: string;
  notes: string;
}

const DEFAULT_FORM: FormState = {
  startDate: '',
  endDate: '',
  rateType: 'hourly',
  rateAmount: '',
  rateCurrency: 'AUD',
  accommodationDetails: '',
  notes: '',
};

export default function SendOfferPage() {
  const router = useRouter();
  const applicationId = router.query.applicationId as string | undefined;
  const { user, initializing, unauthorized } = useAuthRedirect('/auth/login', {
    requiredRole: 'employer',
    unauthorizedRedirectTo: '/',
  });

  const numericApplicationId = applicationId ? Number(applicationId) : null;

  const {
    data: application,
    error: applicationError,
    isLoading: loadingApplication,
  } = useSWR<ApplicationRecord>(
    numericApplicationId ? ['application', numericApplicationId] : null,
    () => fetchApplication(numericApplicationId as number)
  );

  const jobId = application?.job;

  const { data: job } = useSWR<Job | null>(jobId ? ['job', jobId] : null, () => fetchJob(jobId as number));
  const { data: employerProfile } = useSWR<EmployerProfile | null>(user ? ['employer-profile'] : null, fetchEmployerProfile);

  const shouldFetchOffer = Boolean(numericApplicationId && application?.offer);

  const {
    data: offer,
    mutate: mutateOffer,
    isLoading: loadingOffer,
  } = useSWR<JobOffer | null>(
    shouldFetchOffer ? ['offer', numericApplicationId] : null,
    () => fetchJobOffer(numericApplicationId as number),
    { fallbackData: application?.offer ?? null }
  );

  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!job) return;
    setFormState((prev) => ({
      ...prev,
      startDate: offer?.start_date ?? job.start_date ?? prev.startDate,
      endDate: offer?.end_date ?? job.end_date ?? prev.endDate,
      rateType: offer?.rate_type ?? (job.hourly_rate ? 'hourly' : prev.rateType),
      rateAmount: offer?.rate_amount ?? job.hourly_rate ?? job.fixed_salary ?? prev.rateAmount,
      rateCurrency: offer?.rate_currency ?? job.currency ?? prev.rateCurrency,
      accommodationDetails: offer?.accommodation_details ?? prev.accommodationDetails,
      notes: offer?.notes ?? prev.notes,
    }));
  }, [job, offer]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const disableSubmit = !formState.startDate || !formState.rateAmount || submitting;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!numericApplicationId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload: CreateJobOfferPayload = {
        start_date: formState.startDate,
        end_date: formState.endDate ? formState.endDate : null,
        rate_type: formState.rateType,
        rate_amount: Number(formState.rateAmount),
        rate_currency: formState.rateCurrency || 'AUD',
        accommodation_details: formState.accommodationDetails || undefined,
        notes: formState.notes || undefined,
        contract_type: 'casual',
      };
      let saved: JobOffer;
      if (offer) {
        saved = await updateJobOffer(numericApplicationId, payload);
      } else {
        saved = await createJobOffer(numericApplicationId, payload);
      }
      await mutateOffer(saved, false);
      mutateOffer();
      router.push('/employer/applications');
    } catch (error) {
      if (isAxiosError(error)) {
        const detail = (error.response?.data as { detail?: string })?.detail;
        setSubmitError(detail || 'Unable to send offer. Please review the form and try again.');
      } else {
        setSubmitError('Unable to send offer. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const loadingState = initializing || loadingApplication || (shouldFetchOffer && loadingOffer);

  const jobSummary = useMemo(() => {
    if (!job) return null;
    return [
      { label: 'Location', value: job.location || `${job.location_city} ${job.location_state}`.trim() },
      { label: 'Category', value: job.category },
      { label: 'Employment type', value: job.employment_type },
      { label: 'Salary hint', value: job.hourly_rate ? `$${job.hourly_rate}/hr` : job.fixed_salary ? `$${job.fixed_salary}` : 'Not specified' },
    ];
  }, [job]);

  if (loadingState) {
    return (
      <Layout title="Prepare offer">
        <p className="text-slate-500">Loading contract workspace…</p>
      </Layout>
    );
  }

  if (unauthorized || !user?.is_employer) {
    return (
      <Layout title="Prepare offer">
        <p className="text-red-600">You must be an employer to access this page.</p>
      </Layout>
    );
  }

  if (applicationError || !application) {
    return (
      <Layout title="Prepare offer">
        <p className="text-red-600">Unable to load application.</p>
        <Link href="/employer/applications" className="text-brand-600 underline">
          Return to applications
        </Link>
      </Layout>
    );
  }

  return (
    <Layout title="Prepare contract">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-brand-600">Contract confirmation</p>
            <h1 className="text-3xl font-semibold text-slate-900">Send offer to {application.applicant_name}</h1>
            <p className="text-sm text-slate-500">Double-check the details before sending the official contract to the traveller.</p>
          </div>
          <Link
            href="/employer/applications"
            className="text-sm font-semibold text-brand-600 hover:text-brand-500"
          >
            ← Back to applications
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <header className="mb-6 space-y-1">
                <p className="text-xs uppercase tracking-wide text-slate-400">Job</p>
                <h2 className="text-2xl font-semibold text-slate-900">{job?.title || 'Job details'}</h2>
                <p className="text-sm text-slate-500">{job?.description ?? 'No description provided.'}</p>
              </header>
              <div className="grid gap-4 sm:grid-cols-2">
                {jobSummary?.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-100 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">{item.label}</p>
                    <p className="mt-1 text-base font-semibold text-slate-800">{item.value || '—'}</p>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div>
                <p className="text-sm uppercase tracking-wide text-brand-600">Contract details</p>
                <h3 className="text-xl font-semibold text-slate-900">Confirm terms for this offer</h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Start date
                  <input
                    type="date"
                    name="startDate"
                    value={formState.startDate}
                    onChange={handleInputChange}
                    required
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-300 focus:ring-2 focus:ring-brand-200"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  End date (optional)
                  <input
                    type="date"
                    name="endDate"
                    value={formState.endDate}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-300 focus:ring-2 focus:ring-brand-200"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Rate type
                  <select
                    name="rateType"
                    value={formState.rateType}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-300 focus:ring-2 focus:ring-brand-200"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Rate amount
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="rateAmount"
                    value={formState.rateAmount}
                    onChange={handleInputChange}
                    required
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-300 focus:ring-2 focus:ring-brand-200"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Currency
                  <input
                    type="text"
                    name="rateCurrency"
                    value={formState.rateCurrency}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm uppercase focus:border-brand-300 focus:ring-2 focus:ring-brand-200"
                  />
                </label>
              </div>

              <label className="text-sm font-medium text-slate-700">
                Accommodation details (optional)
                <textarea
                  name="accommodationDetails"
                  value={formState.accommodationDetails}
                  onChange={handleInputChange}
                  rows={3}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-300 focus:ring-2 focus:ring-brand-200"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Additional notes
                <textarea
                  name="notes"
                  value={formState.notes}
                  onChange={handleInputChange}
                  rows={4}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-300 focus:ring-2 focus:ring-brand-200"
                />
              </label>

              {submitError && <p className="text-sm text-red-600">{submitError}</p>}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => router.push('/employer/applications')}
                  className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disableSubmit}
                  className={clsx(
                    'rounded-full px-8 py-3 text-sm font-semibold text-white shadow',
                    disableSubmit
                      ? 'cursor-not-allowed bg-brand-300'
                      : 'bg-brand-600 hover:bg-brand-500'
                  )}
                >
                  {offer ? 'Update offer' : 'Send offer'}
                </button>
              </div>
            </form>
          </section>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-400">Traveller</p>
              <h3 className="text-xl font-semibold text-slate-900">{application.applicant_name}</h3>
              <p className="text-sm text-slate-500">Application #{application.id}</p>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p>Availability: {application.applicant_availability || 'Not specified'}</p>
                <p>Status: {application.status.replace('_', ' ')}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-400">Employer profile</p>
              <h3 className="text-xl font-semibold text-slate-900">{employerProfile?.company_name || user?.first_name}</h3>
              <dl className="mt-4 space-y-2 text-sm text-slate-600">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">ABN</dt>
                  <dd>{employerProfile?.abn || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">Contact email</dt>
                  <dd>{employerProfile?.contact_email || user?.email}</dd>
                </div>
              </dl>
            </div>

            {offer && (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-emerald-600">Existing offer</p>
                <h3 className="text-lg font-semibold text-emerald-800">Status: {offer.status.replace('_', ' ')}</h3>
                <p className="mt-2 text-sm text-emerald-700">
                  Updating the form will resend the contract details to the traveller.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </Layout>
  );
}
