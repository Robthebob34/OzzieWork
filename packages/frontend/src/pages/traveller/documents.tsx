import { ChangeEvent, FormEvent, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import clsx from 'clsx';

import { Layout } from '../../components/Layout';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';
import {
  TravellerDocument,
  TravellerDocumentCategory,
  deleteTravellerDocument,
  fetchTravellerDocuments,
  uploadTravellerDocument,
} from '../../lib/api';

const CATEGORY_LABELS: Record<TravellerDocumentCategory, string> = {
  timesheet_pdf: 'Timesheet PDF',
  payslip_pdf: 'Payslip PDF',
  payslip_aba: 'Payslip ABA',
  compliance_image: 'Compliance Image',
  other: 'Other',
};

const isImage = (mime?: string) => (mime || '').startsWith('image/');

const humanFileSize = (bytes?: number) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

export default function TravellerDocumentsPage() {
  const { user, initializing, unauthorized } = useAuthRedirect('/auth/login', {
    requiredRole: 'traveller',
    unauthorizedRedirectTo: '/',
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    data: documents,
    mutate,
    isLoading,
    error,
  } = useSWR<TravellerDocument[]>(user ? ['traveller-documents'] : null, fetchTravellerDocuments);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TravellerDocumentCategory>('other');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const recentDocs = useMemo(() => {
    if (!documents?.length)
      return { compliance: [], timesheets: [], payslips: [], uploads: [], instructions: [] };
    const compliance = documents.filter((doc) => doc.category === 'compliance_image');
    const timesheets = documents.filter((doc) => doc.category === 'timesheet_pdf');
    const payslips = documents.filter((doc) => doc.category === 'payslip_pdf');
    const instructions = documents.filter((doc) => doc.category === 'payslip_aba');
    const uploads = documents.filter((doc) => doc.category === 'other');
    return { compliance, timesheets, payslips, uploads, instructions };
  }, [documents]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file || null);
    if (file && !title.trim()) {
      setTitle(file.name.replace(/\.[^.]+$/, ''));
    }
  };

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile || !title.trim()) {
      setUploadError('Select a file and enter a title.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      await uploadTravellerDocument({ title: title.trim(), category, file: selectedFile });
      setTitle('');
      setSelectedFile(null);
      setCategory('other');
      fileInputRef.current?.value && (fileInputRef.current.value = '');
      await mutate();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Unable to upload document.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this document?')) return;
    setDeletingId(id);
    try {
      await deleteTravellerDocument(id);
      await mutate();
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert('Unable to delete document.');
    } finally {
      setDeletingId(null);
    }
  };

  if (initializing || !user) {
    return (
      <Layout title="My Documents">
        <p className="text-slate-500">Loading your profile…</p>
      </Layout>
    );
  }

  if (unauthorized) {
    return (
      <Layout title="My Documents">
        <p className="text-slate-500">Redirecting…</p>
      </Layout>
    );
  }

  return (
    <Layout title="My Documents">
      <div className="space-y-8">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-brand-500">Traveller vault</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">My documents</h1>
          <p className="mt-1 text-sm text-slate-500">
            Upload compliance photos or download system-generated payslips and timesheets in one place.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Upload a document</h2>
          <form className="mt-4 space-y-4" onSubmit={handleUpload}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-slate-600">
                Title
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  placeholder="e.g. TFN photo"
                />
              </label>
              <label className="text-sm text-slate-600">
                Category
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as TravellerDocumentCategory)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
                >
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/*"
                onChange={handleFileChange}
                className="text-sm text-slate-600"
              />
              {selectedFile && (
                <span className="text-xs text-slate-500">
                  Selected: {selectedFile.name} ({humanFileSize(selectedFile.size)})
                </span>
              )}
            </div>
            {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
            <button
              type="submit"
              disabled={uploading}
              className="rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-brand-300"
            >
              {uploading ? 'Uploading…' : 'Upload document'}
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Your vault</h2>
            {isLoading && <p className="text-sm text-slate-400">Loading…</p>}
          </div>
          {error && (
            <p className="mt-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Unable to load your documents.
            </p>
          )}
          {!documents?.length && !isLoading ? (
            <p className="mt-4 text-sm text-slate-500">No documents yet. Upload a file above to get started.</p>
          ) : (
            <div className="mt-6 space-y-8">
              {recentDocs.timesheets.length ? (
                <DocumentSection
                  title="Timesheet exports"
                  subtitle="Timesheet PDFs created by the platform."
                  documents={recentDocs.timesheets}
                  deletingId={deletingId}
                  onDelete={handleDelete}
                />
              ) : null}
              {recentDocs.payslips.length ? (
                <DocumentSection
                  title="Payslips"
                  subtitle="Payslip exports created by the platform."
                  documents={recentDocs.payslips}
                  deletingId={deletingId}
                  onDelete={handleDelete}
                />
              ) : null}
              {recentDocs.instructions.length ? (
                <DocumentSection
                  title="Bank instructions"
                  subtitle="ABA files generated after employers click Pay Now."
                  documents={recentDocs.instructions}
                  deletingId={deletingId}
                  onDelete={handleDelete}
                />
              ) : null}
              {recentDocs.compliance.length ? (
                <DocumentSection
                  title="Compliance photos"
                  subtitle="IDs, visas, TFN, ABN screenshots."
                  documents={recentDocs.compliance}
                  deletingId={deletingId}
                  onDelete={handleDelete}
                />
              ) : null}
              {recentDocs.uploads.length ? (
                <DocumentSection
                  title="Personal uploads"
                  subtitle="Other files you've stored for quick access."
                  documents={recentDocs.uploads}
                  deletingId={deletingId}
                  onDelete={handleDelete}
                />
              ) : null}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

function DocumentSection({
  title,
  subtitle,
  documents,
  deletingId,
  onDelete,
}: {
  title: string;
  subtitle: string;
  documents: TravellerDocument[];
  deletingId: number | null;
  onDelete: (id: number) => void;
}) {
  return (
    <div>
      <div className="mb-3">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {documents.map((doc) => (
          <article key={doc.id} className="flex gap-4 rounded-2xl border border-slate-200 p-4 shadow-sm">
            <PreviewThumbnail document={doc} />
            <div className="flex flex-1 flex-col">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{doc.title}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    {CATEGORY_LABELS[doc.category as TravellerDocumentCategory] || 'Document'} · {humanFileSize(doc.size_bytes)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => window.open(doc.file_url, '_blank')}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300"
                >
                  Download
                </button>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                <span>Added {new Date(doc.created_at).toLocaleDateString()}</span>
                <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden />
                <button
                  type="button"
                  onClick={() => onDelete(doc.id)}
                  disabled={deletingId === doc.id}
                  className={clsx(
                    'text-rose-600 hover:text-rose-500 disabled:cursor-not-allowed disabled:text-rose-300',
                    deletingId === doc.id && 'animate-pulse'
                  )}
                >
                  {deletingId === doc.id ? 'Removing…' : 'Remove'}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function PreviewThumbnail({ document }: { document: TravellerDocument }) {
  if (isImage(document.mime_type)) {
    return (
      <div className="h-20 w-20 overflow-hidden rounded-2xl bg-slate-100">
        <img src={document.file_url} alt={document.title} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-50 text-sm font-semibold text-slate-500">
      {document.mime_type?.includes('pdf') ? 'PDF' : 'FILE'}
    </div>
  );
}
