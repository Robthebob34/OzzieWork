import { FormEvent, useMemo, useState } from 'react';
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
  Payslip,
  approveTimesheet,
  fetchJob,
  fetchJobOffer,
  fetchPayslip,
  createPayslip,
  confirmPayslipInstructions,
} from '../../../lib/api';

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  submitted: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
};

const OFFER_STATUS_BADGE: Record<string, string> = {
  accepted: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-slate-100 text-slate-600',
  declined: 'bg-rose-100 text-rose-700',
};

function TimesheetEntries({ timesheet }: { timesheet: Timesheet | undefined }) {
  if (!timesheet || timesheet.entries.length === 0) {
    return <p className="text-sm text-slate-500">No hours have been recorded yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-slate-600">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="py-2 pr-4">Date</th>
            <th className="py-2 pr-4">Hours</th>
            <th className="py-2">Notes</th>
            <th className="py-2 pl-4">Payment</th>
          </tr>
        </thead>
        <tbody>
          {timesheet.entries.map((entry) => (
            <tr key={entry.entry_date} className="border-t border-slate-100">
              <td className="py-2 pr-4 text-slate-900">
                {new Date(entry.entry_date).toLocaleDateString()}
              </td>
              <td className="py-2 pr-4 font-semibold text-slate-900">{entry.hours_worked} h</td>
              <td className="py-2 text-slate-600">{entry.notes || '—'}</td>
              <td className="py-2 pl-4 text-sm font-medium text-slate-700">
                {entry.is_locked ? (
                  entry.is_paid ? (
                    <span className="text-emerald-600">Paid</span>
                  ) : (
                    <span className="text-amber-600">Awaiting pay</span>
                  )
                ) : (
                  <span className="text-slate-400">Pending approval</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function WorkerDetailPage() {
  const router = useRouter();
  const applicationId = router.query.applicationId ? Number(router.query.applicationId) : null;
  const { user, initializing, unauthorized } = useAuthRedirect('/auth/login', {
    requiredRole: 'employer',
    unauthorizedRedirectTo: '/',
  });

  const shouldFetch = Boolean(user?.is_employer && applicationId);

  const {
    data: offer,
    error: offerError,
    isLoading: loadingOffer,
    mutate: mutateOffer,
  } = useSWR<JobOffer>(shouldFetch ? ['offer', applicationId, 'worker-detail'] : null, () =>
    fetchJobOffer(applicationId as number)
  );

  const jobId = offer?.job;
  const { data: job } = useSWR<Job | null>(jobId ? ['job', jobId, 'worker-detail'] : null, () => fetchJob(jobId as number));
  const { data: payslip, mutate: mutatePayslip } = useSWR<Payslip | null>(
    shouldFetch ? ['payslip', applicationId, 'worker-detail'] : null,
    () => fetchPayslip(applicationId as number)
  );

  const [approving, setApproving] = useState(false);
  const [employerNotes, setEmployerNotes] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [confirmingInstructions, setConfirmingInstructions] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmSuccess, setConfirmSuccess] = useState<string | null>(null);

  const handleApprove = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!applicationId || !offer) return;
    setApproving(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await approveTimesheet(applicationId, { employer_notes: employerNotes || undefined });
      await mutateOffer();
      setEmployerNotes('');
      setActionSuccess('Timesheet approved and traveller notified.');
    } catch (error) {
      if (isAxiosError(error)) {
        const detail = (error.response?.data as { detail?: string })?.detail;
        setActionError(detail || 'Unable to approve timesheet.');
      } else {
        setActionError('Unable to approve timesheet.');
      }
    } finally {
      setApproving(false);
    }
  };

  const timesheetStatus = offer?.timesheet?.status || 'draft';
  const canApprove = timesheetStatus === 'submitted';
  const pendingHours = useMemo(() => {
    if (!offer?.timesheet?.entries) return 0;
    return offer.timesheet.entries.reduce((sum, entry) => {
      if (entry.is_locked && !entry.is_paid) {
        return sum + Number(entry.hours_worked || 0);
      }
      return sum;
    }, 0);
  }, [offer]);
  const canPay = timesheetStatus === 'approved' && pendingHours > 0;
  const instructionsStatus = payslip?.instructions_status ?? null;
  const showConfirmButton = Boolean(
    instructionsStatus && instructionsStatus !== 'completed' && payslip?.aba_url
  );

  const handlePayNow = async () => {
    if (!applicationId) return;
    setPaying(true);
    setPayError(null);
    setPaySuccess(null);
    try {
      const createdPayslip = await createPayslip(applicationId);
      if (createdPayslip?.aba_url && typeof window !== 'undefined') {
        window.open(createdPayslip.aba_url, '_blank', 'noopener');
      }
      await Promise.all([mutateOffer(), mutatePayslip()]);
      setPaySuccess('Payment initiated. ABA instructions generated for download.');
    } catch (error) {
      if (isAxiosError(error)) {
        const detail = (error.response?.data as { detail?: string })?.detail;
        setPayError(detail || 'Unable to generate payslip.');
      } else {
        setPayError('Unable to generate payslip.');
      }
    } finally {
      setPaying(false);
    }
  };

  const handleConfirmInstructions = async () => {
    if (!applicationId) return;
    setConfirmingInstructions(true);
    setConfirmError(null);
    setConfirmSuccess(null);
    try {
      await confirmPayslipInstructions(applicationId);
      await Promise.all([mutateOffer(), mutatePayslip()]);
      setConfirmSuccess('Marked as awaiting bank import.');
    } catch (error) {
      if (isAxiosError(error)) {
        const detail = (error.response?.data as { detail?: string })?.detail;
        setConfirmError(detail || 'Unable to confirm bank transfer.');
      } else {
        setConfirmError('Unable to confirm bank transfer.');
      }
    } finally {
      setConfirmingInstructions(false);
    }
  };

  const contractDetails = useMemo(() => {
    if (!offer) return [];
    return [
      { label: 'Contract type', value: offer.contract_type },
      { label: 'Rate', value: `${offer.rate_currency} ${offer.rate_amount} · ${offer.rate_type}` },
      {
        label: 'Dates',
        value: `${new Date(offer.start_date).toLocaleDateString()} → ${
          offer.end_date ? new Date(offer.end_date).toLocaleDateString() : 'Flexible'
        }`,
      },
      { label: 'Status', value: offer.status.replace('_', ' ') },
    ];
  }, [offer]);

  if (initializing || !user) {
    return (
      <Layout title="Worker details">
        <p className="text-slate-500">Loading contract…</p>
      </Layout>
    );
  }

  if (unauthorized) {
    return (
      <Layout title="Worker details">
        <p className="text-red-600">You must be an employer to access this page.</p>
      </Layout>
    );
  }

  if (offerError) {
    return (
      <Layout title="Worker details">
        <p className="text-red-600">Unable to load this worker. It may not exist or you lack access.</p>
      </Layout>
    );
  }

  if (loadingOffer || !offer) {
    return (
      <Layout title="Worker details">
        <p className="text-slate-500">Loading worker data…</p>
      </Layout>
    );
  }

  return (
    <Layout title={`Worker · ${offer.traveller_name ?? 'Traveller'}`}>
      <div className="space-y-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-brand-600">Active contract</p>
            <h1 className="text-3xl font-semibold text-slate-900">{offer.traveller_name}</h1>
            <p className="text-sm text-slate-500">{offer.job_title || 'Untitled job'}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <span
              className={clsx(
                'rounded-full px-4 py-1 text-xs font-semibold',
                OFFER_STATUS_BADGE[offer.status] || 'bg-slate-100 text-slate-600'
              )}
            >
              {offer.status.replace('_', ' ').toUpperCase()}
            </span>
            <span
              className={clsx('rounded-full px-4 py-1 text-xs font-semibold', STATUS_BADGE[timesheetStatus])}
            >
              Timesheet: {timesheetStatus.toUpperCase()}
            </span>
          </div>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Contract overview</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {contractDetails.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">{item.label}</p>
                <p className="mt-1 text-base font-medium text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
          {offer.notes && (
            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm text-slate-700">
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
                Review the traveller's submitted hours and approve once everything looks correct.
              </p>
            </div>
            <Link
              href={`/messages`}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-300 hover:text-brand-600"
            >
              Message traveller
            </Link>
          </div>
          <TimesheetEntries timesheet={offer.timesheet} />

          <form onSubmit={handleApprove} className="space-y-3">
            <label className="text-sm font-medium text-slate-700">
              Employer notes (optional)
              <textarea
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-300 focus:ring-2 focus:ring-brand-200"
                rows={3}
                value={employerNotes}
                onChange={(event) => setEmployerNotes(event.target.value)}
                disabled={!canApprove || approving}
              />
            </label>
            {actionError && <p className="text-sm text-red-600">{actionError}</p>}
            {actionSuccess && <p className="text-sm text-emerald-600">{actionSuccess}</p>}
            <button
              type="submit"
              disabled={!canApprove || approving}
              className={clsx(
                'rounded-full px-6 py-3 text-sm font-semibold text-white shadow',
                canApprove ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-200 text-slate-500 cursor-not-allowed'
              )}
            >
              {approving ? 'Approving…' : 'Approve timesheet'}
            </button>
            {!canApprove && (
              <p className="text-xs text-slate-500">
                You can approve once the traveller submits their hours. Draft or already approved timesheets cannot be
                approved again.
              </p>
            )}
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
            <p className="mt-4 text-sm text-slate-500">Loading job details…</p>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Payments & payroll</h2>
              <p className="text-sm text-slate-500">
                Pay approved hours, automatically deducting OzzieWork commission and Working Holiday tax.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">Approved unpaid hours:</span> {pendingHours.toFixed(2)} h
              </p>
              {timesheetStatus !== 'approved' && (
                <p className="text-xs text-slate-500">Hours become payable once the timesheet is approved.</p>
              )}
            </div>
            <button
              type="button"
              onClick={handlePayNow}
              disabled={!canPay || paying}
              className={clsx(
                'rounded-full px-6 py-3 text-sm font-semibold shadow',
                canPay ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-slate-200 text-slate-500 cursor-not-allowed'
              )}
            >
              {paying ? 'Processing…' : 'Pay worker now'}
            </button>
          </div>
          {payError && <p className="text-sm text-red-600">{payError}</p>}
          {paySuccess && <p className="text-sm text-emerald-600">{paySuccess}</p>}
          {confirmError && <p className="text-sm text-red-600">{confirmError}</p>}
          {confirmSuccess && <p className="text-sm text-emerald-600">{confirmSuccess}</p>}
          {payslip ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: 'Latest payslip status', value: payslip.status.toUpperCase() },
                  { label: 'Hours paid', value: `${Number(payslip.hour_count).toFixed(2)} h` },
                  { label: 'Gross', value: `${payslip.rate_currency} ${payslip.gross_amount}` },
                  { label: 'Commission (1%)', value: `${payslip.rate_currency} ${payslip.commission_amount}` },
                  { label: 'Superannuation (11%)', value: `${payslip.rate_currency} ${payslip.super_amount}` },
                  { label: 'Tax withheld (15%)', value: `${payslip.rate_currency} ${payslip.tax_withheld}` },
                  { label: 'Net payment', value: `${payslip.rate_currency} ${payslip.net_payment}` },
                  {
                    label: 'Pay period',
                    value:
                      payslip.pay_period_start && payslip.pay_period_end
                        ? `${new Date(payslip.pay_period_start).toLocaleDateString()} → ${new Date(
                            payslip.pay_period_end
                          ).toLocaleDateString()}`
                        : '—',
                  },
                  { label: 'Payment method', value: payslip.payment_method?.replace('_', ' ') || '—' },
                  {
                    label: 'Instruction status',
                    value: (payslip.instructions_status || 'pending').replace(/_/g, ' ').toUpperCase(),
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">{item.label}</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Payslip PDF</p>
                  <p className="text-xs text-slate-500">
                    A copy is also stored under the traveller's My Documents vault for their records.
                  </p>
                </div>
                {payslip.pdf_url ? (
                  <a
                    href={payslip.pdf_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
                  >
                    Download PDF
                  </a>
                ) : (
                  <p className="text-sm text-amber-600">Rendering PDF… refresh shortly.</p>
                )}
              </div>
              {payslip.aba_url ? (
                <div className="mt-2 flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">ABA batch file</p>
                    <p className="text-xs text-slate-500">
                      Upload this file to your online banking portal to process the three payments (commission, worker, tax).
                    </p>
                    <p className="text-xs text-slate-500">
                      Statut : {payslip.instructions_status?.replace(/_/g, ' ') || '—'}
                    </p>
                  </div>
                  <a
                    href={payslip.aba_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
                  >
                    Download ABA file
                  </a>
                </div>
              ) : null}
              {showConfirmButton ? (
                <button
                  type="button"
                  onClick={handleConfirmInstructions}
                  disabled={confirmingInstructions}
                  className="w-full rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-brand-300"
                >
                  {confirmingInstructions ? 'Confirming…' : 'Confirm bank transfer executed'}
                </button>
              ) : null}
              {instructionsStatus === 'awaiting_bank_import' ? (
                <p className="text-sm text-slate-500">
                  Instructions marked as awaiting bank import. You can re-download the ABA file anytime above.
                </p>
              ) : null}
              {instructionsStatus === 'completed' ? (
                <p className="text-sm text-emerald-600">
                  Bank transfer confirmed. Traveller has been notified and payslip is archived.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-slate-500">No payslip has been generated yet.</p>
          )}
        </section>
      </div>
    </Layout>
  );
}
