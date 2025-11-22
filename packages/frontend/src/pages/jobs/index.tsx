import useSWR from 'swr';
import Link from 'next/link';
import { Layout } from '../../components/Layout';
import { fetchJobs } from '../../lib/api';

const fetcher = async () => fetchJobs();

export default function JobsPage() {
  const { data, error } = useSWR('jobs', fetcher);

  if (error) {
    return (
      <Layout title="Jobs - Working Holiday Jobs">
        <p className="text-red-600">Unable to load jobs. Please try again later.</p>
      </Layout>
    );
  }

  const jobs = data?.results || [];

  return (
    <Layout title="Browse Jobs">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Newest gigs</h1>
        <Link href="/apply" className="text-brand-600 text-sm">
          Need help applying?
        </Link>
      </div>
      <div className="grid gap-4">
        {jobs.map((job: any) => (
          <Link key={job.id} href={`/jobs/${job.id}`} className="rounded-xl border bg-white p-5 hover:shadow">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">{job.title}</h2>
              <span className="text-sm text-brand-600">{job.currency} {job.hourly_rate}/hr</span>
            </div>
            <p className="text-sm text-slate-500">{job.location}</p>
            <p className="mt-2 text-slate-700">{job.description?.slice(0, 180)}...</p>
          </Link>
        ))}
        {!jobs.length && <p className="text-slate-500">No jobs yet. Seed the database to start.</p>}
      </div>
    </Layout>
  );
}
