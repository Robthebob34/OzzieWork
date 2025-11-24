import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Layout } from '../../components/Layout';
import { Job, JobListParams, fetchJobs } from '../../lib/api';

const stateOptions = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'];

const radiusOptions = [25, 50, 100, 200];

export default function JobsPage() {
  const [formFilters, setFormFilters] = useState<JobListParams>({ radius_km: 50, limit: 24 });
  const [filters, setFilters] = useState<JobListParams>(formFilters);

  const { data, error, isLoading } = useSWR(['jobs', filters], ([, current]) => fetchJobs(current));

  const jobs: Job[] = useMemo(() => {
    if (Array.isArray(data)) return data as Job[];
    return (data?.results as Job[]) || [];
  }, [data]);

  const handleFilterChange = (field: keyof JobListParams) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = event.target.value;
    setFormFilters((prev) => ({ ...prev, [field]: value || undefined }));
  };

  const handleRadiusChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = Number(event.target.value);
    setFormFilters((prev) => ({ ...prev, radius_km: value }));
  };

  const handleFiltersSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters(formFilters);
  };

  const handleReset = () => {
    const resetFilters: JobListParams = { radius_km: 50, limit: 24 };
    setFormFilters(resetFilters);
    setFilters(resetFilters);
  };

  return (
    <Layout title="Browse Jobs">
      <div className="space-y-8">
        <header className="rounded-3xl border border-brand-100 bg-gradient-to-r from-brand-50 to-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-brand-600">Explore roles</p>
              <h1 className="text-3xl font-semibold text-slate-900">Newest gigs</h1>
              <p className="text-sm text-slate-600">Filter by state, region, or search any town up to a 200 km radius.</p>
            </div>
            <Link href="/apply" className="text-sm font-medium text-brand-600">
              Need help applying?
            </Link>
          </div>
          <form className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr_1fr_1fr]" onSubmit={handleFiltersSubmit}>
            <label className="text-sm font-medium text-slate-600">
              Search by town / suburb
              <input
                type="text"
                placeholder="e.g. Margaret River"
                value={formFilters.q || ''}
                onChange={handleFilterChange('q')}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-300 focus:ring-2 focus:ring-brand-200"
              />
            </label>
            <label className="text-sm font-medium text-slate-600">
              State / Territory
              <select
                value={formFilters.state || ''}
                onChange={handleFilterChange('state')}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-300 focus:ring-2 focus:ring-brand-200"
              >
                <option value="">All states</option>
                {stateOptions.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-600">
              Region
              <input
                type="text"
                placeholder="Far South West"
                value={formFilters.region || ''}
                onChange={handleFilterChange('region')}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-300 focus:ring-2 focus:ring-brand-200"
              />
            </label>
            <label className="text-sm font-medium text-slate-600">
              City / Town
              <input
                type="text"
                placeholder="Margaret River"
                value={formFilters.city || ''}
                onChange={handleFilterChange('city')}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-300 focus:ring-2 focus:ring-brand-200"
              />
            </label>
            <label className="text-sm font-medium text-slate-600 lg:col-span-2">
              Radius (km)
              <div className="mt-2 flex items-center gap-4">
                <input
                  type="range"
                  min={10}
                  max={200}
                  step={5}
                  value={formFilters.radius_km || 50}
                  onChange={handleRadiusChange}
                  className="flex-1"
                />
                <select
                  value={formFilters.radius_km || 50}
                  onChange={handleRadiusChange}
                  className="rounded-xl border border-slate-200 px-3 py-2"
                >
                  {radiusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option} km
                    </option>
                  ))}
                </select>
              </div>
            </label>
            <div className="flex items-end gap-3">
              <button
                type="submit"
                className="flex-1 rounded-full bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-brand-500"
              >
                Apply filters
              </button>
              <button type="button" className="text-sm text-slate-500" onClick={handleReset}>
                Reset
              </button>
            </div>
          </form>
        </header>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">Showing {jobs.length} roles</p>
              {filters.q && (
                <p className="text-xs text-slate-400">
                  Within {filters.radius_km || 50} km of <span className="font-medium text-slate-600">{filters.q}</span>
                </p>
              )}
            </div>
            <span className="text-sm text-slate-500">
              {filters.state ? `State: ${filters.state}` : 'All states'}
              {filters.region ? ` · Region: ${filters.region}` : ''}
              {filters.city ? ` · City: ${filters.city}` : ''}
            </span>
          </div>

          {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">Unable to load jobs. Please try again later.</p>}
          {isLoading && <p className="text-sm text-slate-500">Loading roles…</p>}

          <div className="grid gap-5 lg:grid-cols-2">
            {jobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-200">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-brand-600">{job.category.replace('_', ' ')}</p>
                    <h2 className="text-xl font-semibold text-slate-900">{job.title}</h2>
                    <p className="text-sm text-slate-500">
                      {job.location_city || job.location} · {job.location_state || 'Australia'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-brand-600">
                      {job.hourly_rate ? `AUD ${job.hourly_rate}/hr` : job.fixed_salary ? `AUD ${job.fixed_salary}` : 'Rate negotiable'}
                    </p>
                    <p className="text-xs text-slate-400">{job.employment_type.replace('_', ' ')}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600 line-clamp-3">{job.description}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  {job.start_date && <span>Starts {new Date(job.start_date).toLocaleDateString()}</span>}
                  {job.is_remote_friendly && <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">Remote friendly</span>}
                  {job.distance_km !== undefined && job.distance_km !== null && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{job.distance_km.toFixed(1)} km away</span>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {!isLoading && !jobs.length && !error && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500">
              <p>No jobs match these filters. Try another location or state.</p>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
