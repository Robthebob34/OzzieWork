import { useState } from 'react';
import { Layout } from '../components/Layout';

export default function ApplyPage() {
  const [form, setForm] = useState({ jobId: '', note: '' });

  return (
    <Layout title="Apply for jobs">
      <div className="max-w-xl space-y-6">
        <h1 className="text-3xl font-semibold">Quick application</h1>
        <p className="text-slate-600">
          Placeholder form that will submit to the backend once auth + applications API wiring is complete.
        </p>
        <form className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
          <label className="block text-sm font-medium">
            Job ID
            <input
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={form.jobId}
              onChange={(e) => setForm((prev) => ({ ...prev, jobId: e.target.value }))}
              placeholder="123"
            />
          </label>
          <label className="block text-sm font-medium">
            Cover letter
            <textarea
              className="mt-1 w-full rounded-md border px-3 py-2"
              rows={4}
              value={form.note}
              onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
              placeholder="Share experience, availability, etc."
            />
          </label>
          <button
            type="button"
            className="inline-flex rounded-md bg-brand-500 px-4 py-2 text-white disabled:opacity-50"
            disabled
          >
            Submit (coming soon)
          </button>
        </form>
      </div>
    </Layout>
  );
}
