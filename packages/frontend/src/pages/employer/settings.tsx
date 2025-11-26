import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { Layout } from '../../components/Layout';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';
import { EmployerProfile, fetchEmployerProfile, updateEmployerProfile } from '../../lib/api';

const SectionCard = ({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {description && <p className="text-sm text-slate-500">{description}</p>}
    </div>
    <div className="mt-4 grid gap-4 md:grid-cols-2">{children}</div>
  </section>
);

export default function EmployerSettingsPage() {
  const { initializing, user } = useAuthRedirect('/auth/login', { requiredRole: 'employer', unauthorizedRedirectTo: '/' });
  const [form, setForm] = useState<Partial<EmployerProfile>>({});
  const [socialLinksInput, setSocialLinksInput] = useState('');
  const [notificationPrefs, setNotificationPrefs] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initializing || !user?.is_employer) return;
    let cancelled = false;
    async function load() {
      try {
        const profile = await fetchEmployerProfile();
        if (cancelled) return;
        setForm(profile);
        setSocialLinksInput((profile.social_links || []).join('\n'));
        setNotificationPrefs(profile.notification_preferences || {});
      } catch {
        if (!cancelled) setError('Unable to load employer settings.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [initializing, user]);

  const handleInputChange = (field: keyof EmployerProfile) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, logo_url: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleNotificationToggle = (key: string) => {
    setNotificationPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const payload: Partial<EmployerProfile> = {
        ...form,
        social_links: socialLinksInput
          .split(/\n|,/)
          .map((link) => link.trim())
          .filter(Boolean),
        notification_preferences: notificationPrefs,
      };
      const updated = await updateEmployerProfile(payload);
      setForm(updated);
      setMessage('Employer profile updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save employer profile.');
    } finally {
      setSaving(false);
    }
  };

  if (initializing || loading) {
    return (
      <Layout title="Employer settings">
        <p className="text-slate-500">Loading settings…</p>
      </Layout>
    );
  }

  return (
    <Layout title="Employer settings">
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="rounded-3xl border border-brand-100 bg-gradient-to-r from-brand-50 via-white to-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-wider text-brand-600">Employer settings</p>
              <h1 className="text-3xl font-semibold text-slate-900">{form.company_name || 'Add your business name'}</h1>
              <p className="text-slate-600">Keep your hiring brand consistent and up-to-date.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleLogoUpload} />
              <button
                type="button"
                className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload logo
              </button>
              {form.logo_url && (
                <button
                  type="button"
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-500"
                  onClick={() => setForm((prev) => ({ ...prev, logo_url: '' }))}
                >
                  Remove logo
                </button>
              )}
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8 pb-24">
          {message && (
            <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700" role="status">
              {message}
            </div>
          )}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}

          <SectionCard title="Business identity" description="Company basics displayed publicly on your profile.">
            <label className="text-sm font-medium text-slate-600">
              Business name
              <input className="mt-1 w-full rounded-lg border px-3 py-2" value={form.company_name || ''} onChange={handleInputChange('company_name')} />
            </label>
            <label className="text-sm font-medium text-slate-600">
              Business category
              <input className="mt-1 w-full rounded-lg border px-3 py-2" value={form.business_category || ''} onChange={handleInputChange('business_category')} />
            </label>
            <label className="text-sm font-medium text-slate-600">
              ABN
              <input className="mt-1 w-full rounded-lg border px-3 py-2" value={form.abn || ''} onChange={handleInputChange('abn')} />
            </label>
            <label className="text-sm font-medium text-slate-600 md:col-span-2">
              Company description
              <textarea className="mt-1 w-full rounded-lg border px-3 py-2" rows={3} value={form.company_description || ''} onChange={handleInputChange('company_description')} />
            </label>
          </SectionCard>

          <SectionCard title="Contact information" description="Who should workers reach out to?">
            <label className="text-sm font-medium text-slate-600">
              Contact name
              <input className="mt-1 w-full rounded-lg border px-3 py-2" value={form.contact_name || ''} onChange={handleInputChange('contact_name')} />
            </label>
            <label className="text-sm font-medium text-slate-600">
              Contact phone
              <input className="mt-1 w-full rounded-lg border px-3 py-2" value={form.contact_phone || ''} onChange={handleInputChange('contact_phone')} />
            </label>
            <label className="text-sm font-medium text-slate-600">
              Contact email
              <input type="email" className="mt-1 w-full rounded-lg border px-3 py-2" value={form.contact_email || ''} onChange={handleInputChange('contact_email')} />
            </label>
            <label className="text-sm font-medium text-slate-600">
              Website
              <input className="mt-1 w-full rounded-lg border px-3 py-2" value={form.website || ''} onChange={handleInputChange('website')} placeholder="https://yourcompany.com" />
            </label>
          </SectionCard>

          <SectionCard title="Business address" description="Let applicants know where jobs are based.">
            <label className="text-sm font-medium text-slate-600">
              Street address
              <input className="mt-1 w-full rounded-lg border px-3 py-2" value={form.address_street || ''} onChange={handleInputChange('address_street')} />
            </label>
            <label className="text-sm font-medium text-slate-600">
              City
              <input className="mt-1 w-full rounded-lg border px-3 py-2" value={form.address_city || ''} onChange={handleInputChange('address_city')} />
            </label>
            <label className="text-sm font-medium text-slate-600">
              State / Territory
              <input className="mt-1 w-full rounded-lg border px-3 py-2" value={form.address_state || ''} onChange={handleInputChange('address_state')} />
            </label>
            <label className="text-sm font-medium text-slate-600">
              Postcode
              <input className="mt-1 w-full rounded-lg border px-3 py-2" value={form.address_postcode || ''} onChange={handleInputChange('address_postcode')} />
            </label>
          </SectionCard>

          <SectionCard title="Online presence" description="Share links to social channels and tools.">
            <label className="text-sm font-medium text-slate-600 md:col-span-2">
              Social links (one per line or comma separated)
              <textarea className="mt-1 w-full rounded-lg border px-3 py-2" rows={3} value={socialLinksInput} onChange={(e) => setSocialLinksInput(e.target.value)} placeholder="https://linkedin.com/company/yourbrand" />
            </label>
            <label className="text-sm font-medium text-slate-600 md:col-span-2">
              Logo preview
              <div className="mt-1 flex items-center gap-3">
                <div className="h-16 w-16 rounded-xl border border-dashed border-slate-300 bg-slate-50">
                  {form.logo_url ? <img src={form.logo_url} alt="Logo preview" className="h-full w-full rounded-xl object-cover" /> : <span className="flex h-full w-full items-center justify-center text-xs text-slate-400">No logo</span>}
                </div>
                <span className="text-xs text-slate-500">PNG/JPG, shown on your profile.</span>
              </div>
            </label>
          </SectionCard>

          <SectionCard title="Notifications" description="Pick where you want alerts sent.">
            <div className="md:col-span-2 grid gap-3">
              {['new_applications', 'job_updates', 'weekly_digest'].map((key) => (
                <label key={key} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={notificationPrefs[key] || false}
                    onChange={() => handleNotificationToggle(key)}
                  />
                  {key === 'new_applications' && 'Notify me when new applications arrive'}
                  {key === 'job_updates' && 'Notify me about job status changes'}
                  {key === 'weekly_digest' && 'Send me a weekly hiring digest'}
                </label>
              ))}
            </div>
          </SectionCard>

          <div className="sticky bottom-0 z-20 flex justify-end border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur">
            <button
              type="submit"
              className="rounded-full bg-brand-600 px-6 py-3 text-white font-medium shadow-md transition-colors hover:bg-brand-700 disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
