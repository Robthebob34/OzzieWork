import Link from 'next/link';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import clsx from 'clsx';

import { Layout } from '../../components/Layout';
import { fetchPublicProfile, PublicProfile } from '../../lib/api';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';

function InfoPill({ label, value }: { label: string; value: string | undefined | null }) {
  if (!value) return null;
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600" key={`${label}-${value}`}>
      {value}
    </span>
  );
}

function ComplianceBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div
      className={clsx(
        'flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm',
        ok ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-rose-100 bg-rose-50 text-rose-600'
      )}
    >
      <span className="text-lg" aria-hidden>
        {ok ? '✓' : '✕'}
      </span>
      <span>{label}</span>
    </div>
  );
}

export default function PublicProfilePage() {
  const { user, initializing, unauthorized } = useAuthRedirect();
  const router = useRouter();
  const profileId = Number(router.query.id);

  const { data, error, isLoading } = useSWR<PublicProfile>(
    !Number.isNaN(profileId) && user ? ['public-profile', profileId] : null,
    () => fetchPublicProfile(profileId)
  );

  if (initializing || !user) {
    return (
      <Layout title="Profile">
        <p className="text-slate-500">Loading profile…</p>
      </Layout>
    );
  }

  if (unauthorized) {
    return (
      <Layout title="Profile">
        <p className="text-rose-600">You must be logged in to view profiles.</p>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Profile">
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">Unable to load this profile.</p>
      </Layout>
    );
  }

  if (isLoading || !data) {
    return (
      <Layout title="Profile">
        <p className="text-slate-500">Loading profile…</p>
      </Layout>
    );
  }

  const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ') || 'Traveller';
  const personaLabel = data.is_employer ? 'Employer' : 'Traveller';

  return (
    <Layout title={`${fullName} — Profile`}>
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="rounded-3xl border border-brand-100 bg-gradient-to-r from-brand-50 via-white to-white p-6 sm:p-10 shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-2xl bg-slate-100">
                {data.profile_picture_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.profile_picture_url} alt={fullName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-slate-400">
                    {(fullName || personaLabel)[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm uppercase tracking-wider text-brand-600">{personaLabel}</p>
                <h1 className="text-3xl font-semibold text-slate-900">{fullName}</h1>
                <p className="text-slate-600">{data.bio || 'No bio provided yet.'}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  {data.address_city && <span>{data.address_city}</span>}
                  {data.address_state && <span>· {data.address_state}</span>}
                  {data.country_of_origin && <span>· {data.country_of_origin}</span>}
                </div>
              </div>
            </div>
            {typeof data.global_rating === 'number' && (
              <div className="flex flex-col items-start gap-2 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-amber-700">
                <span className="text-xs uppercase tracking-wide">Rating</span>
                <span className="text-2xl font-semibold">{data.global_rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <ComplianceBadge label="TFN on file" ok={data.has_tfn} />
          <ComplianceBadge label="ABN on file" ok={data.has_abn} />
          <ComplianceBadge label="Bank details on file" ok={data.has_bank_details} />
        </section>

        {data.availability && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Availability</h2>
            <p className="mt-2 text-sm text-slate-600">{data.availability}</p>
          </section>
        )}

        {(data.skills?.length || data.languages?.length) && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Expertise</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {data.skills?.map((skill) => (
                <InfoPill key={`skill-${skill}`} label="Skill" value={skill} />
              ))}
              {data.languages?.map((language) => (
                <InfoPill key={`language-${language}`} label="Language" value={language} />
              ))}
            </div>
          </section>
        )}

        {data.job_history && data.job_history.length > 0 && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Experience</h2>
            <div className="mt-4 space-y-4">
              {data.job_history.map((job) => (
                <div key={`${job.employer_name}-${job.job_title}-${job.start_date}`} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{job.job_title}</p>
                      <p className="text-xs uppercase text-slate-500">{job.employer_name}</p>
                    </div>
                    <p className="text-xs text-slate-500">
                      {new Date(job.start_date).toLocaleDateString()} — {job.end_date ? new Date(job.end_date).toLocaleDateString() : 'Present'}
                    </p>
                  </div>
                  {job.employer_comments && <p className="mt-2 text-sm text-slate-600">“{job.employer_comments}”</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {data.certifications && data.certifications.length > 0 && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Certifications</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {data.certifications.map((cert) => (
                <div key={cert.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <p className="font-semibold text-slate-800">{cert.name}</p>
                  <p className="text-xs text-slate-500">
                    {cert.issued_date ? `Issued ${new Date(cert.issued_date).toLocaleDateString()}` : 'Issue date unknown'}
                  </p>
                  {cert.expiry_date && <p className="text-xs text-slate-500">Expires {new Date(cert.expiry_date).toLocaleDateString()}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {data.is_employer && data.employer_profile && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Business details</h2>
            <p className="mt-2 text-sm text-slate-600">{data.employer_profile.company_description || 'No description provided yet.'}</p>
            <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
              {data.employer_profile.company_name && <p><strong>Name:</strong> {data.employer_profile.company_name}</p>}
              {data.employer_profile.business_category && <p><strong>Category:</strong> {data.employer_profile.business_category}</p>}
              {data.employer_profile.website && (
                <p>
                  <strong>Website:</strong>{' '}
                  <a href={data.employer_profile.website} target="_blank" rel="noreferrer" className="text-brand-600 underline">
                    {data.employer_profile.website}
                  </a>
                </p>
              )}
            </div>
          </section>
        )}

        <div className="text-center text-sm text-slate-500">
          <Link href="/messages" className="text-brand-600">
            ← Back to messages
          </Link>
        </div>
      </div>
    </Layout>
  );
}
