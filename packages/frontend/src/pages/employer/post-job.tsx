import { FormEvent, ReactNode, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Layout } from '../../components/Layout';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';
import { CreateJobPayload, createJob } from '../../lib/api';

const jobCategories = [
  { label: 'Farming', value: 'farming' },
  { label: 'Hospitality', value: 'hospitality' },
  { label: 'Construction', value: 'construction' },
  { label: 'Tourism', value: 'tourism' },
  { label: 'Logistics', value: 'logistics' },
  { label: 'Retail', value: 'retail' },
  { label: 'Other', value: 'other' },
];

const employmentTypes = [
  { label: 'Casual', value: 'casual' },
  { label: 'Part-time', value: 'part_time' },
  { label: 'Full-time', value: 'full_time' },
  { label: 'Contract', value: 'contract' },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="mt-4 grid gap-4">{children}</div>
    </section>
  );
}

type FormState = {
  title: string;
  description: string;
  category: string;
  employment_type: string;
  location: string;
  location_address: string;
  location_city: string;
  location_state: string;
  location_region: string;
  start_date: string;
  end_date: string;
  hourly_rate: string;
  fixed_salary: string;
  currency: string;
  work_hours_per_day: string;
  days_per_week: string;
  is_remote_friendly: boolean;
  accommodation_provided: boolean;
  accommodation_cost: string;
  transport_provided: boolean;
  experience_required: boolean;
  skills: string;
  certifications_required: string;
  language_requirements: string;
  is_live: boolean;
};

const initialForm: FormState = {
  title: '',
  description: '',
  category: jobCategories[0]?.value ?? 'other',
  employment_type: employmentTypes[0]?.value ?? 'casual',
  location: '',
  location_address: '',
  location_city: '',
  location_state: '',
  location_region: '',
  start_date: '',
  end_date: '',
  hourly_rate: '',
  fixed_salary: '',
  currency: 'AUD',
  work_hours_per_day: '',
  days_per_week: '',
  is_remote_friendly: false,
  accommodation_provided: false,
  accommodation_cost: '',
  transport_provided: false,
  experience_required: false,
  skills: '',
  certifications_required: '',
  language_requirements: '',
  is_live: true,
};

export default function PostJobPage() {
  const router = useRouter();
  const { user, initializing, unauthorized } = useAuthRedirect('/auth/login', {
    requiredRole: 'employer',
    unauthorizedRedirectTo: '/',
  });
  const [formData, setFormData] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const locationLabel = useMemo(() => {
    if (!formData.location_city && !formData.location_state) {
      return formData.location;
    }
    return [formData.location_city, formData.location_state].filter(Boolean).join(', ');
  }, [formData.location, formData.location_city, formData.location_state]);

  if (initializing || !user) {
    return (
      <Layout title="Post a Job">
        <p className="text-slate-500">Checking your account…</p>
      </Layout>
    );
  }

  if (unauthorized) {
    return (
      <Layout title="Post a Job">
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          Only employer accounts can access the job posting tool.
        </div>
      </Layout>
    );
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const target = event.target;
    const { name, value } = target;
    const nextValue =
      target instanceof HTMLInputElement && target.type === 'checkbox' ? target.checked : value;
    setFormData((prev) => ({
      ...prev,
      [name]: nextValue,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }

  function validateForm(): Record<string, string> {
    const nextErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      nextErrors.title = 'Title is required.';
    }
    if (!formData.description.trim()) {
      nextErrors.description = 'Description is required.';
    }
    if (!formData.location.trim()) {
      nextErrors.location = 'Location is required.';
    }
    if (!formData.start_date) {
      nextErrors.start_date = 'Start date is required.';
    }
    if (!formData.hourly_rate && !formData.fixed_salary) {
      nextErrors.hourly_rate = 'Provide either an hourly rate or fixed salary.';
      nextErrors.fixed_salary = 'Provide either an hourly rate or fixed salary.';
    }
    if (formData.accommodation_provided && !formData.accommodation_cost) {
      nextErrors.accommodation_cost = 'Please include a cost or mark it as 0.';
    }
    return nextErrors;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setServerError(null);
    const payload: CreateJobPayload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      category: formData.category,
      employment_type: formData.employment_type,
      location: formData.location.trim(),
      location_address: formData.location_address.trim() || undefined,
      location_city: formData.location_city.trim() || undefined,
      location_state: formData.location_state.trim() || undefined,
      location_region: formData.location_region.trim() || undefined,
      is_remote_friendly: formData.is_remote_friendly,
      is_live: formData.is_live,
      hourly_rate: formData.hourly_rate ? Number(formData.hourly_rate) : null,
      fixed_salary: formData.fixed_salary ? Number(formData.fixed_salary) : null,
      currency: formData.currency,
      work_hours_per_day: formData.work_hours_per_day ? Number(formData.work_hours_per_day) : null,
      days_per_week: formData.days_per_week ? Number(formData.days_per_week) : null,
      accommodation_provided: formData.accommodation_provided,
      accommodation_cost: formData.accommodation_provided
        ? formData.accommodation_cost
          ? Number(formData.accommodation_cost)
          : 0
        : null,
      transport_provided: formData.transport_provided,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      experience_required: formData.experience_required,
      skills: formData.skills,
      language_requirements: formData.language_requirements,
      certifications_required: formData.certifications_required,
    };

    try {
      await createJob(payload);
      router.push('/employer/dashboard');
    } catch (error: any) {
      const backendErrors = error?.response?.data;
      if (backendErrors && typeof backendErrors === 'object') {
        const extractedErrors: Record<string, string> = {};
        Object.entries(backendErrors).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            extractedErrors[key] = value.join(' ');
          } else if (typeof value === 'string') {
            extractedErrors[key] = value;
          }
        });
        setErrors(extractedErrors);
      } else {
        setServerError('Unable to post job. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function fieldClass(name: keyof FormState) {
    return [
      'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-300',
      errors[name] ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 hover:border-slate-300',
    ].join(' ');
  }

  return (
    <Layout title="Post a Job">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-3xl border border-brand-100 bg-gradient-to-r from-brand-50 to-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-wider text-brand-600">Create listing</p>
          <h1 className="text-3xl font-semibold text-slate-900">Share a new opportunity</h1>
          <p className="mt-2 text-sm text-slate-600">
            Complete the sections below to publish your role to travellers. You can save as draft by leaving the
            “Live” toggle off.
          </p>
        </header>

        {serverError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <Section title="Job basics">
            <div>
              <label className="text-sm font-medium text-slate-800" htmlFor="title">
                Title *
              </label>
              <input id="title" name="title" className={fieldClass('title')} value={formData.title} onChange={handleChange} />
              {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800" htmlFor="description">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                rows={5}
                className={fieldClass('description')}
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe duties, team and what makes this job special."
              />
              {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-800" htmlFor="category">
                  Category
                </label>
                <select id="category" name="category" className={fieldClass('category')} value={formData.category} onChange={handleChange}>
                  {jobCategories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-800" htmlFor="employment_type">
                  Employment type
                </label>
                <select
                  id="employment_type"
                  name="employment_type"
                  className={fieldClass('employment_type')}
                  value={formData.employment_type}
                  onChange={handleChange}
                >
                  {employmentTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-800" htmlFor="location">
                  Location name (farm, venue etc.) *
                </label>
                <input
                  id="location"
                  name="location"
                  className={fieldClass('location')}
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g. Riverlands Farm"
                />
                {errors.location && <p className="mt-1 text-xs text-red-600">{errors.location}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-sm" htmlFor="location_address">
                    Street address
                  </label>
                  <input id="location_address" name="location_address" className={fieldClass('location_address')} value={formData.location_address} onChange={handleChange} />
                </div>
                <div>
                  <label className="text-sm" htmlFor="location_city">
                    City
                  </label>
                  <input id="location_city" name="location_city" className={fieldClass('location_city')} value={formData.location_city} onChange={handleChange} />
                </div>
                <div>
                  <label className="text-sm" htmlFor="location_state">
                    State
                  </label>
                  <input id="location_state" name="location_state" className={fieldClass('location_state')} value={formData.location_state} onChange={handleChange} />
                </div>
                <div>
                  <label className="text-sm" htmlFor="location_region">
                    Region
                  </label>
                  <input id="location_region" name="location_region" className={fieldClass('location_region')} value={formData.location_region} onChange={handleChange} placeholder="e.g. Northern Rivers" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                id="is_remote_friendly"
                name="is_remote_friendly"
                checked={formData.is_remote_friendly}
                onChange={handleChange}
              />
              <label htmlFor="is_remote_friendly">Remote friendly</label>
              <span className="text-slate-400">{locationLabel || 'Location details pending'}</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <input id="is_live" name="is_live" type="checkbox" checked={formData.is_live} onChange={handleChange} className="h-4 w-4" />
              <div>
                <label htmlFor="is_live" className="text-sm font-semibold text-slate-800">
                  Publish immediately
                </label>
                <p className="text-xs text-slate-500">Uncheck to save as draft and hide from travellers.</p>
              </div>
            </div>
          </Section>

          <Section title="Dates">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-800" htmlFor="start_date">
                  Start date *
                </label>
                <input id="start_date" name="start_date" type="date" className={fieldClass('start_date')} value={formData.start_date} onChange={handleChange} />
                {errors.start_date && <p className="mt-1 text-xs text-red-600">{errors.start_date}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-800" htmlFor="end_date">
                  End date (optional)
                </label>
                <input id="end_date" name="end_date" type="date" className={fieldClass('end_date')} value={formData.end_date} onChange={handleChange} />
              </div>
            </div>
          </Section>

          <Section title="Pay & hours">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-800" htmlFor="hourly_rate">
                  Hourly rate (AUD)
                </label>
                <input id="hourly_rate" name="hourly_rate" type="number" step="0.25" min="0" className={fieldClass('hourly_rate')} value={formData.hourly_rate} onChange={handleChange} />
                {errors.hourly_rate && <p className="mt-1 text-xs text-red-600">{errors.hourly_rate}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-800" htmlFor="fixed_salary">
                  Fixed salary (AUD)
                </label>
                <input
                  id="fixed_salary"
                  name="fixed_salary"
                  type="number"
                  min="0"
                  className={fieldClass('fixed_salary')}
                  value={formData.fixed_salary}
                  onChange={handleChange}
                />
                {errors.fixed_salary && <p className="mt-1 text-xs text-red-600">{errors.fixed_salary}</p>}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-800" htmlFor="work_hours_per_day">
                  Work hours per day
                </label>
                <input
                  id="work_hours_per_day"
                  name="work_hours_per_day"
                  type="number"
                  step="0.5"
                  min="0"
                  className={fieldClass('work_hours_per_day')}
                  value={formData.work_hours_per_day}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-800" htmlFor="days_per_week">
                  Days per week
                </label>
                <input
                  id="days_per_week"
                  name="days_per_week"
                  type="number"
                  step="0.5"
                  min="0"
                  className={fieldClass('days_per_week')}
                  value={formData.days_per_week}
                  onChange={handleChange}
                />
              </div>
            </div>
          </Section>

          <Section title="Benefits">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="accommodation_provided" name="accommodation_provided" checked={formData.accommodation_provided} onChange={handleChange} />
              <label className="text-sm font-medium" htmlFor="accommodation_provided">
                Accommodation provided
              </label>
            </div>
            {formData.accommodation_provided && (
              <div>
                <label className="text-sm font-medium text-slate-800" htmlFor="accommodation_cost">
                  Accommodation cost per week (AUD)
                </label>
                <input
                  id="accommodation_cost"
                  name="accommodation_cost"
                  type="number"
                  min="0"
                  className={fieldClass('accommodation_cost')}
                  value={formData.accommodation_cost}
                  onChange={handleChange}
                />
                {errors.accommodation_cost && <p className="mt-1 text-xs text-red-600">{errors.accommodation_cost}</p>}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input type="checkbox" id="transport_provided" name="transport_provided" checked={formData.transport_provided} onChange={handleChange} />
              <label className="text-sm font-medium" htmlFor="transport_provided">
                Transport provided
              </label>
            </div>
          </Section>

          <Section title="Requirements">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="experience_required" name="experience_required" checked={formData.experience_required} onChange={handleChange} />
              <label className="text-sm font-medium" htmlFor="experience_required">
                Previous experience required
              </label>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800" htmlFor="skills">
                Skills list (comma separated)
              </label>
              <input id="skills" name="skills" className={fieldClass('skills')} value={formData.skills} onChange={handleChange} placeholder="e.g. tractor operation, barista" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800" htmlFor="certifications_required">
                Certifications required
              </label>
              <input
                id="certifications_required"
                name="certifications_required"
                className={fieldClass('certifications_required')}
                value={formData.certifications_required}
                onChange={handleChange}
                placeholder="e.g. RSA, White Card"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800" htmlFor="language_requirements">
                Language requirements
              </label>
              <input
                id="language_requirements"
                name="language_requirements"
                className={fieldClass('language_requirements')}
                value={formData.language_requirements}
                onChange={handleChange}
                placeholder="e.g. English, conversational Spanish"
              />
            </div>
          </Section>

          <div className="sticky bottom-6 flex justify-end rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-lg shadow-brand-100/50 backdrop-blur">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? 'Posting…' : 'Post job'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
