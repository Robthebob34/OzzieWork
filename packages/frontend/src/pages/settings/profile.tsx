import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Layout } from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';
import { JobHistoryEntry, PasswordChangePayload, UpdateProfilePayload } from '../../lib/api';

interface JobHistoryForm extends JobHistoryEntry {
  _key: string;
}

const createJobHistoryForm = (): JobHistoryForm => ({
  _key: Math.random().toString(36).slice(2, 11),
  employer_name: '',
  job_title: '',
  start_date: '',
  end_date: '',
  employer_comments: '',
  rating: 0,
});

const parseListInput = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
    </div>
    <div className="mt-4 grid gap-4 md:grid-cols-2">{children}</div>
  </section>
);

export default function ProfileSettingsPage() {
  const { user, initializing } = useAuthRedirect();
  const { updateProfile, updatePassword } = useAuth();

  const [form, setForm] = useState<UpdateProfilePayload>({});
  const [skillsInput, setSkillsInput] = useState('');
  const [languagesInput, setLanguagesInput] = useState('');
  const [jobHistory, setJobHistory] = useState<JobHistoryForm[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [passwordForm, setPasswordForm] = useState<PasswordChangePayload>({
    current_password: '',
    new_password: '',
    confirm_new_password: '',
  });
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const initialForm = useMemo(() => {
    if (!user) return {};
    return {
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      country_of_origin: user.country_of_origin,
      address_street: user.address_street,
      address_city: user.address_city,
      address_state: user.address_state,
      address_postcode: user.address_postcode,
      date_of_birth: user.date_of_birth,
      profile_picture_url: user.profile_picture_url,
      tfn: user.tfn,
      abn: user.abn,
      bank_name: user.bank_name,
      bank_bsb: user.bank_bsb,
      bank_account_number: user.bank_account_number,
      bio: user.bio,
      availability: user.availability,
      is_traveller: user.is_traveller,
      is_employer: user.is_employer,
    } satisfies UpdateProfilePayload;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setForm(initialForm);
    setSkillsInput((user.skills || []).join(', '));
    setLanguagesInput((user.languages || []).join(', '));
    setJobHistory(
      (user.job_history || []).map((entry) => ({
        ...entry,
        _key: `${entry.id ?? Math.random().toString(36).slice(2, 11)}`,
      }))
    );
  }, [user, initialForm]);

  const handleInputChange = (field: keyof UpdateProfilePayload) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, profile_picture_url: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleAddJobHistory = () => {
    setJobHistory((prev) => [...prev, createJobHistoryForm()]);
  };

  const handleJobHistoryChange = (key: string, field: keyof JobHistoryEntry, value: string) => {
    setJobHistory((prev) =>
      prev.map((entry) =>
        entry._key === key
          ? {
              ...entry,
              [field]: field === 'rating' ? Number(value) : value,
            }
          : entry
      )
    );
  };

  const handleRemoveJob = (key: string) => {
    setJobHistory((prev) => prev.filter((entry) => entry._key !== key));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const payload: UpdateProfilePayload = {
        ...form,
        skills: parseListInput(skillsInput),
        languages: parseListInput(languagesInput),
        job_history: jobHistory.map(({ _key, ...entry }) => ({
          ...entry,
          rating: Number(entry.rating || 0),
        })),
      };
      await updateProfile(payload);
      setMessage('Profile updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);
    if (passwordForm.new_password !== passwordForm.confirm_new_password) {
      setPasswordError('New passwords must match.');
      return;
    }
    setPasswordSaving(true);
    try {
      await updatePassword(passwordForm);
      setPasswordMessage('Password updated successfully.');
      setPasswordForm({ current_password: '', new_password: '', confirm_new_password: '' });
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Unable to update password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  if (initializing || !user) {
    return (
      <Layout title="Profile settings">
        <p className="text-slate-500">Loading settings…</p>
      </Layout>
    );
  }

  return (
    <Layout title="Profile settings">
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="rounded-3xl border border-brand-100 bg-gradient-to-r from-brand-50 via-white to-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-2xl bg-slate-100">
                {form.profile_picture_url ? (
                  <img src={form.profile_picture_url} alt={user.first_name || user.email} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-slate-400">
                    {(user.first_name || user.email)[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm uppercase tracking-wider text-brand-600">Profile settings</p>
                <h1 className="text-3xl font-semibold text-slate-900">{user.email}</h1>
                <p className="text-slate-600">Update your identity, compliance, banking, and work history.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              <button
                type="button"
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload photo
              </button>
              <button
                type="button"
                className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-500"
                onClick={() => setForm((prev) => ({ ...prev, profile_picture_url: '' }))}
              >
                Remove
              </button>
            </div>
          </div>
        </header>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-8 pb-24">
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

          <SectionCard title="Personal information">
            <label className="text-sm font-medium text-slate-600">
              First name
              <input className="mt-1 w-full rounded-lg border px-3 py-2" value={form.first_name || ''} onChange={handleInputChange('first_name')} />
            </label>
            <label className="text-sm font-medium text-slate-600">
              Last name
              <input className="mt-1 w-full rounded-lg border px-3 py-2" value={form.last_name || ''} onChange={handleInputChange('last_name')} />
            </label>
            <label className="text-sm font-medium text-slate-600">
              Email
              <input type="email" className="mt-1 w-full rounded-lg border px-3 py-2" value={form.email || ''} onChange={handleInputChange('email')} />
            </label>
            <label className="text-sm font-medium text-slate-600">
              Phone
              <input className="mt-1 w-full rounded-lg border px-3 py-2" value={form.phone || ''} onChange={handleInputChange('phone')} />
            </label>
            <label className="text-sm font-medium text-slate-600">
              Country of origin
              <input className="mt-1 w-full rounded-lg border px-3 py-2" value={form.country_of_origin || ''} onChange={handleInputChange('country_of_origin')} />
            </label>
            <label className="text-sm font-medium text-slate-600">
              Date of birth
              <input type="date" className="mt-1 w-full rounded-lg border px-3 py-2" value={form.date_of_birth || ''} onChange={handleInputChange('date_of_birth')} />
            </label>
          </SectionCard>

          <SectionCard title="Address">
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

          <SectionCard title="Compliance & availability">
            <label className="text-sm font-medium text-slate-600">
              TFN
              <input className="mt-1 w-full rounded-lg border px-3 py-2" value={form.tfn || ''} onChange={handleInputChange('tfn')} />
            </label>
            <label className="text-sm font-medium text-slate-600">
              ABN
              <input className="mt-1 w-full rounded-lg border px-3 py-2" value={form.abn || ''} onChange={handleInputChange('abn')} />
            </label>
            <label className="text-sm font-medium text-slate-600 md:col-span-2">
              Availability
              <input className="mt-1 w-full rounded-lg border px-3 py-2" value={form.availability || ''} onChange={handleInputChange('availability')} placeholder="e.g. Available now, From Jan 5, Weekdays only" />
            </label>
            <label className="text-sm font-medium text-slate-600 md:col-span-2">
              Bio
              <textarea className="mt-1 w-full rounded-lg border px-3 py-2" rows={3} value={form.bio || ''} onChange={handleInputChange('bio')} />
            </label>
          </SectionCard>

          <SectionCard title="Banking">
            <label className="text-sm font-medium text-slate-600">
              Bank name
              <input className="mt-1 w-full rounded-lg border px-3 py-2" value={form.bank_name || ''} onChange={handleInputChange('bank_name')} />
            </label>
            <label className="text-sm font-medium text-slate-600">
              BSB
              <input className="mt-1 w-full rounded-lg border px-3 py-2" value={form.bank_bsb || ''} onChange={handleInputChange('bank_bsb')} />
            </label>
            <label className="text-sm font-medium text-slate-600">
              Account number
              <input className="mt-1 w-full rounded-lg border px-3 py-2" value={form.bank_account_number || ''} onChange={handleInputChange('bank_account_number')} />
            </label>
          </SectionCard>

          <SectionCard title="Skills & languages">
            <label className="text-sm font-medium text-slate-600 md:col-span-2">
              Skills (comma separated)
              <textarea className="mt-1 w-full rounded-lg border px-3 py-2" rows={2} value={skillsInput} onChange={(e) => setSkillsInput(e.target.value)} placeholder="Hospitality, Barista, Customer service" />
            </label>
            <label className="text-sm font-medium text-slate-600 md:col-span-2">
              Languages (comma separated)
              <textarea className="mt-1 w-full rounded-lg border px-3 py-2" rows={2} value={languagesInput} onChange={(e) => setLanguagesInput(e.target.value)} placeholder="English, Spanish, Mandarin" />
            </label>
          </SectionCard>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Work history & ratings</h2>
              <button type="button" className="rounded-full border border-brand-500 px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50" onClick={handleAddJobHistory}>
                Add entry
              </button>
            </div>
            <div className="mt-4 space-y-6">
              {jobHistory.length === 0 && <p className="text-sm text-slate-500">No work history yet.</p>}
              {jobHistory.map((entry) => (
                <div key={entry._key} className="rounded-xl border border-slate-100 p-4 shadow-sm">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-sm font-medium text-slate-600">
                      Employer name
                      <input className="mt-1 w-full rounded-lg border px-3 py-2" value={entry.employer_name} onChange={(e) => handleJobHistoryChange(entry._key, 'employer_name', e.target.value)} />
                    </label>
                    <label className="text-sm font-medium text-slate-600">
                      Job title
                      <input className="mt-1 w-full rounded-lg border px-3 py-2" value={entry.job_title} onChange={(e) => handleJobHistoryChange(entry._key, 'job_title', e.target.value)} />
                    </label>
                    <label className="text-sm font-medium text-slate-600">
                      Start date
                      <input type="date" className="mt-1 w-full rounded-lg border px-3 py-2" value={entry.start_date} onChange={(e) => handleJobHistoryChange(entry._key, 'start_date', e.target.value)} />
                    </label>
                    <label className="text-sm font-medium text-slate-600">
                      End date
                      <input type="date" className="mt-1 w-full rounded-lg border px-3 py-2" value={entry.end_date || ''} onChange={(e) => handleJobHistoryChange(entry._key, 'end_date', e.target.value)} />
                    </label>
                    <label className="text-sm font-medium text-slate-600">
                      Rating (0-5)
                      <input type="number" min={0} max={5} step={0.1} className="mt-1 w-full rounded-lg border px-3 py-2" value={entry.rating} onChange={(e) => handleJobHistoryChange(entry._key, 'rating', e.target.value)} />
                    </label>
                    <label className="text-sm font-medium text-slate-600 md:col-span-2">
                      Employer comments
                      <textarea className="mt-1 w-full rounded-lg border px-3 py-2" rows={2} value={entry.employer_comments || ''} onChange={(e) => handleJobHistoryChange(entry._key, 'employer_comments', e.target.value)} />
                    </label>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button type="button" className="text-sm text-red-600 hover:underline" onClick={() => handleRemoveJob(entry._key)}>
                      Remove entry
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

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

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Change password</h2>
          <p className="text-sm text-slate-600">Choose a strong password you don’t reuse elsewhere.</p>
          {passwordMessage && (
            <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700" role="status">
              {passwordMessage}
            </div>
          )}
          {passwordError && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {passwordError}
            </div>
          )}
          <form onSubmit={handlePasswordSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-600">
              Current password
              <input type="password" className="mt-1 w-full rounded-lg border px-3 py-2" value={passwordForm.current_password} onChange={(e) => setPasswordForm((prev) => ({ ...prev, current_password: e.target.value }))} required />
            </label>
            <label className="text-sm font-medium text-slate-600">
              New password
              <input type="password" className="mt-1 w-full rounded-lg border px-3 py-2" value={passwordForm.new_password} onChange={(e) => setPasswordForm((prev) => ({ ...prev, new_password: e.target.value }))} required />
            </label>
            <label className="text-sm font-medium text-slate-600">
              Confirm new password
              <input type="password" className="mt-1 w-full rounded-lg border px-3 py-2" value={passwordForm.confirm_new_password} onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm_new_password: e.target.value }))} required />
            </label>
            <div className="flex items-end justify-end">
              <button type="submit" className="rounded-lg bg-slate-900 px-6 py-3 text-white font-medium hover:bg-slate-800 disabled:opacity-50" disabled={passwordSaving}>
                {passwordSaving ? 'Updating…' : 'Update password'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </Layout>
  );
}
