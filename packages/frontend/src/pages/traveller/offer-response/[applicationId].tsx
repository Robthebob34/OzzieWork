import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import clsx from 'clsx';
import { isAxiosError } from 'axios';

import { Layout } from '../../../components/Layout';
import { useAuthRedirect } from '../../../hooks/useAuthRedirect';
import {
  ApplicationRecord,
  Job,
  JobOffer,
  JobOfferStatus,
  fetchApplication,
  fetchJob,
  fetchJobOffer,
  updateJobOffer,
} from '../../../lib/api';

const STATUS_COLORS: Record<JobOfferStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 ring-amber-200',
  accepted: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  declined: 'bg-rose-100 text-rose-700 ring-rose-200',
  cancelled: 'bg-slate-100 text-slate-600 ring-slate-200',
};

interface FormState {
  availabilityConfirmed: boolean;
  acknowledgement: boolean;
}

const DEFAULT_FORM: FormState = {
  availabilityConfirmed: false,
  acknowledgement: false,
};

export default function TravellerOfferResponsePage() {
  const router = useRouter();
  const { user, initializing, unauthorized } = useAuthRedirect('/auth/login', {
    requiredRole: 'traveller',
    unauthorizedRedirectTo: '/',
  });
  const numericApplicationId = router.query.applicationId
    ? Number(router.query.applicationId)
    : null;

  const {
    data: application,
    mutate: mutateApplication,
    error: applicationError,
    isLoading: loadingApplication,
  } = useSWR<ApplicationRecord>(
    numericApplicationId ? ['application', numericApplicationId] : null,
    () => fetchApplication(numericApplicationId as number)
  );

  const jobId = application?.job;
  const { data: job } = useSWR<Job | null>(jobId ? ['job', jobId] : null, () => fetchJob(jobId as number));

  const offerFetcher = async () => {
    if (!numericApplicationId) return null;
    try {
      return await fetchJobOffer(numericApplicationId);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  };

  const {
    data: offer,
    mutate: mutateOffer,
    error: offerError,
    isLoading: loadingOffer,
  } = useSWR<JobOffer | null>(numericApplicationId ? ['offer', numericApplicationId] : null, offerFetcher);

  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM);
  const [submittingStatus, setSubmittingStatus] = useState<JobOfferStatus | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const loadingState = initializing || loadingApplication || loadingOffer;

  const isApplicant = user && application && user.id === application.applicant;
  const offerStatus = offer?.status || 'pending';
  const statusStyle = STATUS_COLORS[offerStatus as JobOfferStatus] ?? STATUS_COLORS.pending;
  const canRespond = offer?.status === 'pending' && isApplicant;

  const jobSummary = useMemo(() => {
    if (!job) return [];
    return [
      { label: 'Location', value: job.location || `${job.location_city} ${job.location_state}`.trim() },
      { label: 'Employment type', value: job.employment_type },
      { label: 'Category', value: job.category },
      {
        label: 'Rate',
        value: job.hourly_rate
          ? `AUD ${job.hourly_rate}/hr`
          : job.fixed_salary
          ? `AUD ${job.fixed_salary}`
          : 'Not specified',
      },
    ];
  }, [job]);

  const documentTasks = useMemo(() => {
    return [
      {
        label: 'Tax File Number (TFN)',
        done: Boolean(user?.tfn && user.tfn.trim().length),
      },
      {
        label: 'Bank details',
        done: Boolean(
          (user?.bank_name || '').trim() &&
            (user?.bank_bsb || '').trim() &&
            (user?.bank_account_number || '').trim()
        ),
      },
    ];
  }, [user]);

  const scheduleUnlocked = offer?.status === 'accepted';
  const documentsUnlocked = offer?.status === 'accepted';

  const handleToggle = (field: keyof FormState) => () => {
    setFormState((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleRespond = async (nextStatus: JobOfferStatus) => {
    if (!numericApplicationId || !offer) return;
    setSubmittingStatus(nextStatus);
    setSubmitError(null);
    setSubmitSuccess(null);
    try {
      await updateJobOffer(numericApplicationId, { status: nextStatus });
      await Promise.allSettled([
        mutateOffer(),
        mutateApplication(),
      ]);
      if (nextStatus === 'accepted') {
        setSubmitSuccess('Offer accepted. Documents & scheduling have been unlocked.');
      } else if (nextStatus === 'declined') {
        setSubmitSuccess('Offer declined. The employer has been notified.');
      }
    } catch (error) {
      if (isAxiosError(error)) {
        const detail = (error.response?.data as { detail?: string })?.detail;
        setSubmitError(detail || 'Unable to update the offer status.');
      } else {
        setSubmitError('Unable to update the offer status.');
      }
    } finally {
      setSubmittingStatus(null);
    }
  };

  if (loadingState) {
    return (
      <Layout title="Offer response">
        <p className="text-slate-500">Loading contract details…</p>
      </Layout>
    );
  }

  if (unauthorized || !user) {
    return (
      <Layout title="Offer response">
        <p className="text-slate-500">Redirecting…</p>
      </Layout>
    );
  }

  if (!numericApplicationId) {
    return (
      <Layout title="Offer response">
        <p className="text-slate-500">Invalid contract link.</p>
      </Layout>
    );
  }

  if (applicationError || offerError || !offer) {
    return (
      <Layout title="Offer response">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <h1 className="text-xl font-semibold">Contract unavailable</h1>
          <p className="mt-2 text-sm">We could not find a contract for this application. Please contact support.</p>
        </div>
      </Layout>
    );
  }

  if (!isApplicant) {
    return (
      <Layout title="Offer response">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
          <h1 className="text-xl font-semibold">Not authorized</h1>
          <p className="mt-2 text-sm">Only the traveller who received this offer can respond.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Offer response">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 py-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">Offer response</p>
          <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">{job?.title || application?.job_title}</h1>
              <p className="text-sm text-slate-500">{offer.employer_name}</p>
            </div>
            <span className={clsx('inline-flex items-center rounded-full px-4 py-1 text-sm font-semibold ring-1', statusStyle)}>
              {offer.status.toUpperCase()}
            </span>
          </div>
          {jobSummary.length ? (
            <dl className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
              {jobSummary.map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                  <dt className="text-xs uppercase tracking-wide text-slate-400">{item.label}</dt>
                  <dd className="text-base font-medium text-slate-900">{item.value || '—'}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Contract summary</h2>
          <dl className="mt-4 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Start date</dt>
              <dd className="text-base font-medium text-slate-900">
                {new Date(offer.start_date).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">End date</dt>
              <dd className="text-base font-medium text-slate-900">
                {offer.end_date ? new Date(offer.end_date).toLocaleDateString() : 'Flexible'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Rate</dt>
              <dd className="text-base font-medium text-slate-900">
                {`${offer.rate_currency} ${offer.rate_amount} · ${offer.rate_type}`}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Contract type</dt>
              <dd className="text-base font-medium text-slate-900">{offer.contract_type}</dd>
            </div>
          </dl>
          {offer.accommodation_details && (
            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Accommodation</p>
              <p className="mt-1 text-sm text-slate-700">{offer.accommodation_details}</p>
            </div>
          )}
          {offer.notes && (
            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Notes</p>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{offer.notes}</p>
            </div>
          )}
        </section>

        {canRespond ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Confirm & respond</h2>
            <p className="mt-1 text-sm text-slate-500">
              Please confirm you can start on the proposed dates before responding to the offer. Your response notifies the employer instantly.
            </p>
            <form
              className="mt-4 space-y-4"
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                handleRespond('accepted');
              }}
            >
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  checked={formState.availabilityConfirmed}
                  onChange={handleToggle('availabilityConfirmed')}
                />
                <span>I confirm that I am available for the proposed start date.</span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  checked={formState.acknowledgement}
                  onChange={handleToggle('acknowledgement')}
                />
                <span>I understand that accepting locks in this role and unlocks onboarding documents.</span>
              </label>
              {submitError && <p className="text-sm text-red-600">{submitError}</p>}
              {submitSuccess && <p className="text-sm text-emerald-600">{submitSuccess}</p>}
              <div className="flex flex-col gap-3 md:flex-row">
                <button
                  type="submit"
                  disabled={
                    submittingStatus === 'accepted' ||
                    !formState.availabilityConfirmed ||
                    !formState.acknowledgement
                  }
                  className="flex-1 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-brand-300"
                >
                  {submittingStatus === 'accepted' ? 'Accepting…' : 'Accept offer'}
                </button>
                <button
                  type="button"
                  disabled={submittingStatus === 'declined'}
                  onClick={() => handleRespond('declined')}
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300 disabled:cursor-not-allowed"
                >
                  {submittingStatus === 'declined' ? 'Declining…' : 'Decline offer'}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className="rounded-3xl border border-slate-200 bg-slate-50/60 p-6 text-sm text-slate-600">
            {offer.status === 'accepted' ? (
              <p>You have accepted this offer. The employer has been notified and onboarding steps are now available.</p>
            ) : offer.status === 'declined' ? (
              <p>You declined this offer. The role is reopening for other travellers.</p>
            ) : offer.status === 'cancelled' ? (
              <p>The employer has cancelled this offer.</p>
            ) : (
              <p>This offer is no longer actionable.</p>
            )}
          </section>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Documents required</h2>
            <span
              className={clsx(
                'rounded-full px-3 py-1 text-xs font-semibold',
                documentsUnlocked ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
              )}
            >
              {documentsUnlocked ? 'Unlocked' : 'Locked until accepted'}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            TFN and bank details are required before your first shift.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {documentTasks.map((task) => (
              <div
                key={task.label}
                className={clsx(
                  'rounded-2xl border p-4',
                  task.done ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-slate-50'
                )}
              >
                <p className="text-sm font-semibold text-slate-900">{task.label}</p>
                <p className="text-xs text-slate-500">
                  {task.done ? 'Completed' : documentsUnlocked ? 'Pending' : 'Locked'}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/settings/profile"
              className={clsx(
                'rounded-full px-4 py-2 text-sm font-semibold shadow',
                documentsUnlocked
                  ? 'bg-brand-600 text-white hover:bg-brand-500'
                  : 'bg-slate-200 text-slate-500 cursor-not-allowed'
              )}
            >
              {documentsUnlocked ? 'Update documents' : 'Available after accepting'}
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Schedule & onboarding</h2>
            <span
              className={clsx(
                'rounded-full px-3 py-1 text-xs font-semibold',
                scheduleUnlocked ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
              )}
            >
              {scheduleUnlocked ? 'Unlocked' : 'Locked until accepted'}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Once accepted, you can coordinate shifts and onboarding tasks directly with the employer.
          </p>
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
            {scheduleUnlocked ? 'Shift planning tools will appear here soon.' : 'Accept the offer to unlock scheduling.'}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/messages"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:border-slate-300"
            >
              Message employer
            </Link>
          </div>
        </section>
      </div>
    </Layout>
  );
}
