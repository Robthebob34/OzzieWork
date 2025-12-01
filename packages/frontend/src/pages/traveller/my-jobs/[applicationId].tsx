import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import clsx from 'clsx';
import { isAxiosError } from 'axios';

import { Layout } from '../../../components/Layout';
import { useAuthRedirect } from '../../../hooks/useAuthRedirect';
import {
  Job,
  JobOffer,
  Timesheet,
  TimesheetEntry,
  Payslip,
  fetchJob,
  fetchJobOffer,
  fetchTimesheet,
  fetchPayslip,
  submitTimesheet,
  updateTimesheet,
} from '../../../lib/api';

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  submitted: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
};

function EditableTimesheet({
  entries,
  onChangeEntry,
  onRemoveEntry,
  onAddEntry,
}: {
  entries: TimesheetEntry[];
  onChangeEntry: (index: number, field: keyof TimesheetEntry, value: string) => void;
  onRemoveEntry: (index: number) => void;
  onAddEntry: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-sm text-slate-600">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Hours</th>
              <th className="py-3 px-4">Notes</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr key={`${entry.entry_date}-${index}`} className="border-t border-slate-100">
                <td className="px-4 py-2">
                  <input
                    type="date"
                    value={entry.entry_date}
                    onChange={(event) => onChangeEntry(index, 'entry_date', event.target.value)}
                    disabled={Boolean(entry.is_locked)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-300 focus:ring-2 focus:ring-brand-200"
                    required
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={entry.hours_worked}
                    onChange={(event) => onChangeEntry(index, 'hours_worked', event.target.value)}
                    disabled={Boolean(entry.is_locked)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-300 focus:ring-2 focus:ring-brand-200"
                    required
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={entry.notes || ''}
                    onChange={(event) => onChangeEntry(index, 'notes', event.target.value)}
                    disabled={Boolean(entry.is_locked)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-300 focus:ring-2 focus:ring-brand-200"
                    placeholder="Optional"
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => onRemoveEntry(index)}
                    disabled={Boolean(entry.is_locked)}
                    className="text-xs font-semibold uppercase tracking-wide text-rose-500 hover:text-rose-400 disabled:text-slate-300"
                  >
                    Remove
                  </button>
                  {entry.is_locked && (
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Approved</p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={onAddEntry}
        className="rounded-full border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-600"
      >
        + Add day
      </button>
    </div>
  );
}

export default function TravellerJobDetailPage() {
  const router = useRouter();
  const applicationId = router.query.applicationId ? Number(router.query.applicationId) : null;
  const { user, initializing, unauthorized } = useAuthRedirect('/auth/login', {
    requiredRole: 'traveller',
    unauthorizedRedirectTo: '/',
  });

  const shouldFetch = Boolean(user?.is_traveller && applicationId);

  const {
    data: offer,
    error: offerError,
    isLoading: loadingOffer,
    mutate: mutateOffer,
  } = useSWR<JobOffer>(shouldFetch ? ['traveller-offer', applicationId] : null, () =>
    fetchJobOffer(applicationId as number)
  );

  const jobId = offer?.job;
  const { data: job } = useSWR<Job | null>(jobId ? ['job', jobId, 'traveller'] : null, () => fetchJob(jobId as number));
  const { data: timesheet, mutate: mutateTimesheet } = useSWR<Timesheet | null>(
    shouldFetch ? ['timesheet', applicationId] : null,
    () => fetchTimesheet(applicationId as number)
  );
  const { data: payslip, mutate: mutatePayslip } = useSWR<Payslip | null>(
    shouldFetch ? ['payslip', applicationId, 'traveller'] : null,
    () => fetchPayslip(applicationId as number)
  );

  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!timesheet) return;
    setEntries(
      timesheet.entries.length
        ? timesheet.entries.map((entry) => ({ ...entry }))
        : [
            {
              entry_date: '',
              hours_worked: '',
              notes: '',
              is_locked: false,
            },
          ]
    );
    setNotes(timesheet.traveller_notes || '');
  }, [timesheet]);

  const handleEntryChange = (index: number, field: keyof TimesheetEntry, value: string) => {
    setEntries((prev) => {
      const next = [...prev];
      if (next[index]?.is_locked) {
        return prev;
      }
      next[index] = {
        ...next[index],
        [field]: value,
      };
      return next;
    });
  };

  const handleRemoveEntry = (index: number) => {
    setEntries((prev) => {
      if (prev[index]?.is_locked) {
        return prev;
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleAddEntry = () => {
    setEntries((prev) => [
      ...prev,
      {
        entry_date: '',
        hours_worked: '',
        notes: '',
        is_locked: false,
      },
    ]);
  };

  const preparedEntries = useMemo(() => {
    return entries.filter((entry) => !entry.is_locked && entry.entry_date && entry.hours_worked);
  }, [entries]);

  const handleSaveDraft = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!applicationId) return;
    if (!preparedEntries.length) {
      setActionError('Add at least one new entry before saving.');
      return;
    }
    setSaving(true);
    setSubmitting(false);
    setActionMessage(null);
    setActionError(null);
    try {
      await updateTimesheet(applicationId, {
        entries: preparedEntries.map((entry) => ({
          entry_date: entry.entry_date,
          hours_worked: Number(entry.hours_worked),
          notes: entry.notes,
        })),
        traveller_notes: notes,
      });
      await Promise.all([mutateTimesheet(), mutateOffer(), mutatePayslip()]);
      setActionMessage('Timesheet saved as draft.');
    } catch (error) {
      if (isAxiosError(error)) {
        const detail = (error.response?.data as { detail?: string })?.detail;
        setActionError(detail || 'Unable to save timesheet.');
      } else {
        setActionError('Unable to save timesheet.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitTimesheet = async () => {
    if (!applicationId) return;
    if (!preparedEntries.length) {
      setActionError('Add at least one new entry before submitting.');
      return;
    }
    setSubmitting(true);
    setSaving(false);
    setActionMessage(null);
    setActionError(null);
    try {
      await updateTimesheet(applicationId, {
        entries: preparedEntries.map((entry) => ({
          entry_date: entry.entry_date,
          hours_worked: Number(entry.hours_worked),
          notes: entry.notes,
        })),
        traveller_notes: notes,
      });
      await submitTimesheet(applicationId);
      await Promise.all([mutateTimesheet(), mutateOffer()]);
      setActionMessage('Timesheet submitted. The employer has been notified.');
    } catch (error) {
      if (isAxiosError(error)) {
        const detail = (error.response?.data as { detail?: string })?.detail;
        setActionError(detail || 'Unable to submit timesheet.');
      } else {
        setActionError('Unable to submit timesheet.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const timesheetStatus = timesheet?.status || 'draft';
  const contractSummary = useMemo(() => {
    if (!offer) return [];
    return [
      { label: 'Employer', value: offer.employer_name || 'Employer' },
      { label: 'Contract type', value: offer.contract_type },
      { label: 'Rate', value: `${offer.rate_currency} ${offer.rate_amount} · ${offer.rate_type}` },
      {
        label: 'Dates',
        value: `${new Date(offer.start_date).toLocaleDateString()} → ${
          offer.end_date ? new Date(offer.end_date).toLocaleDateString() : 'Flexible'
        }`,
      },
    ];
  }, [offer]);

  if (initializing || !user) {
    return (
      <Layout title="My job">
        <p className="text-slate-500">Loading contract…</p>
      </Layout>
    );
  }

  if (unauthorized) {
    return (
      <Layout title="My job">
        <p className="text-red-600">You must be a traveller to access this page.</p>
      </Layout>
    );
  }

  if (offerError) {
    return (
      <Layout title="My job">
        <p className="text-red-600">Unable to load this job. It may not exist or you lack access.</p>
      </Layout>
    );
  }

  if (loadingOffer || !offer) {
    return (
      <Layout title="My job">
        <p className="text-slate-500">Loading job details…</p>
      </Layout>
    );
  }

  return (
    <Layout title={`My job · ${offer.job_title ?? 'Contract'}`}>
      <div className="space-y-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-brand-600">Accepted offer</p>
            <h1 className="text-3xl font-semibold text-slate-900">{offer.job_title || 'Job title'}</h1>
            <p className="text-sm text-slate-500">{offer.employer_name || 'Employer'}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="rounded-full bg-emerald-100 px-4 py-1 text-xs font-semibold text-emerald-700">
              {offer.status.replace('_', ' ').toUpperCase()}
            </span>
            <span className={clsx('rounded-full px-4 py-1 text-xs font-semibold', STATUS_BADGE[timesheetStatus])}>
              Timesheet: {timesheetStatus.toUpperCase()}
            </span>
          </div>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Contract summary</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {contractSummary.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">{item.label}</p>
                <p className="mt-1 text-base font-medium text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
          {offer.notes && (
            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-700">
              <p className="text-xs uppercase tracking-wide text-slate-400">Notes</p>
              <p className="mt-1 whitespace-pre-line">{offer.notes}</p>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Timesheet</h2>
              <p className="text-sm text-slate-500">
                Record your hours worked and submit them for employer approval.
              </p>
            </div>
            <Link
              href={`/messages`}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-300 hover:text-brand-600"
            >
              Message employer
            </Link>
          </div>

          <form onSubmit={handleSaveDraft} className="space-y-4">
            <EditableTimesheet
              entries={entries}
              onAddEntry={handleAddEntry}
              onChangeEntry={handleEntryChange}
              onRemoveEntry={handleRemoveEntry}
            />
            <label className="text-sm font-medium text-slate-700">
              Notes for employer (optional)
              <textarea
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-300 focus:ring-2 focus:ring-brand-200"
                rows={3}
                value={notes}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setNotes(event.target.value)}
              />
            </label>
            {actionError && <p className="text-sm text-red-600">{actionError}</p>}
            {actionMessage && <p className="text-sm text-emerald-600">{actionMessage}</p>}
            <div className="flex flex-col gap-3 md:flex-row">
              <button
                type="submit"
                disabled={saving || submitting || !preparedEntries.length}
                className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {saving ? 'Saving…' : 'Save draft'}
              </button>
              <button
                type="button"
                onClick={handleSubmitTimesheet}
                disabled={submitting || !preparedEntries.length}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-6 py-3 text-sm font-semibold text-emerald-700 shadow hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Submitting…' : 'Submit for approval'}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Approved days are locked for reference, but you can keep adding new entries anytime.
            </p>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Job details</h2>
          {job ? (
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p>
                <span className="font-semibold text-slate-900">Location:</span> {job.location || job.location_address}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Employment type:</span> {job.employment_type}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Category:</span> {job.category}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Description:</span> {job.description}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Loading job information…</p>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Payslip & documents</h2>
              <p className="text-sm text-slate-500">
                Once the employer processes payment, your WHV payslip PDF will appear here and in My Documents.
              </p>
            </div>
            <Link
              href="/traveller/documents"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-300 hover:text-brand-600"
            >
              Open My Documents
            </Link>
          </div>
          {payslip ? (
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Latest payslip</p>
                  <p className="text-xs text-slate-500">
                    {payslip.status === 'completed'
                      ? 'Ready to download. Saved automatically in your vault.'
                      : 'Processing… you will be notified when it is ready.'}
                  </p>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    <p>
                      <span className="font-semibold text-slate-900">Hours paid:</span> {Number(payslip.hour_count).toFixed(2)} h
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Net payment:</span> {payslip.rate_currency} {payslip.net_payment}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Pay period:</span>{' '}
                      {payslip.pay_period_start && payslip.pay_period_end
                        ? `${new Date(payslip.pay_period_start).toLocaleDateString()} → ${new Date(
                            payslip.pay_period_end
                          ).toLocaleDateString()}`
                        : '—'}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Tax withheld:</span> {payslip.rate_currency} {payslip.tax_withheld}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {payslip.pdf_url ? (
                    <a
                      href={payslip.pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
                    >
                      Download payslip
                    </a>
                  ) : (
                    <p className="text-xs text-amber-600">PDF is still generating…</p>
                  )}
                  <p className="text-xs text-slate-500">Stored also as a Payslip PDF document.</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No payslip yet. Your employer will generate one after approving hours.</p>
          )}
        </section>
      </div>
    </Layout>
  );
}
