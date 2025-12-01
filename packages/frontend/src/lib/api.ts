import axios, { AxiosError, AxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
const TOKEN_STORAGE_KEY = 'whj.auth.tokens';

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface ApplicationCardMessageMetadata {
  kind: 'application_card';
  application_id: number;
  job_id: number;
  job_title?: string | null;
  traveller_name?: string;
  status?: string;
  cover_letter_preview?: string;
  submitted_at?: string | null;
}

export interface ConversationSummary {
  id: number;
  job?: number | null;
  job_title?: string | null;
  employer: number;
  employer_name?: string;
  traveller: number;
  traveller_name?: string;
  other_participant_name?: string;
  last_message_at: string;
  last_message_preview?: string;
}

export interface MessageEnvelope {
  id: number;
  conversation: number;
  sender: number;
  sender_name?: string;
  body: string;
  created_at: string;
  is_system: boolean;
  message_type?: string;
  metadata?: JobOfferMessageMetadata | ApplicationCardMessageMetadata | Record<string, unknown> | null;
}

export type JobOfferStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';
export type JobOfferRateType = 'hourly' | 'daily';

export interface JobOfferMessageMetadata {
  kind: 'job_offer';
  offer_id: number;
  application_id: number;
  job_id: number;
  job_title?: string | null;
  employer_name?: string;
  status: JobOfferStatus;
  contract_type: 'casual';
  rate_type: JobOfferRateType;
  rate_amount: string;
  rate_currency: string;
  start_date: string;
  end_date?: string | null;
  accommodation_details?: string;
}

export interface JobOffer {
  id: number;
  application: number;
  job: number;
  job_title?: string | null;
  employer: number;
  employer_name?: string;
  traveller: number;
  traveller_name?: string;
  contract_type: 'casual';
  start_date: string;
  end_date?: string | null;
  rate_type: JobOfferRateType;
  rate_amount: string;
  rate_currency: string;
  accommodation_details?: string;
  notes?: string;
  status: JobOfferStatus;
  created_at: string;
  updated_at: string;
  timesheet?: Timesheet;
}

export type TimesheetStatus = 'draft' | 'submitted' | 'approved';

export interface TimesheetEntry {
  entry_date: string;
  hours_worked: string;
  notes?: string;
  is_locked?: boolean;
  is_paid?: boolean;
}

export interface Timesheet {
  status: TimesheetStatus;
  traveller_notes?: string;
  employer_notes?: string;
  submitted_at?: string | null;
  approved_at?: string | null;
  entries: TimesheetEntry[];
}

export type TravellerDocumentCategory =
  | 'timesheet_pdf'
  | 'payslip_pdf'
  | 'payslip_aba'
  | 'compliance_image'
  | 'other';

export interface TravellerDocument {
  id: number;
  title: string;
  category: TravellerDocumentCategory;
  file: string;
  file_url: string;
  mime_type?: string;
  size_bytes?: number;
  source_type?: string;
  source_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface UploadTravellerDocumentPayload {
  title: string;
  category?: TravellerDocumentCategory;
  file: File;
}

export type PayslipStatus = 'processing' | 'completed' | 'failed';

export interface Payslip {
  id: number;
  status: PayslipStatus;
  hour_count: string;
  rate_amount: string;
  rate_currency: string;
  gross_amount: string;
  commission_amount: string;
  super_amount: string;
  net_before_tax: string;
  tax_withheld: string;
  net_payment: string;
  pay_period_start?: string | null;
  pay_period_end?: string | null;
  payment_method?: string;
  employer_name?: string;
  employer_address?: string;
  employer_abn?: string;
  traveller_name?: string;
  traveller_address?: string;
  traveller_tfn?: string;
  metadata?: Record<string, unknown>;
  instructions_status?: 'pending' | 'instructions_generated' | 'awaiting_bank_import' | 'completed';
  aba_generated_at?: string | null;
  pdf_url?: string;
  aba_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateJobOfferPayload {
  start_date: string;
  end_date?: string | null;
  rate_type: JobOfferRateType;
  rate_amount: number;
  rate_currency: string;
  accommodation_details?: string;
  notes?: string;
  contract_type?: 'casual';
}

export type UpdateJobOfferPayload = Partial<CreateJobOfferPayload & { status: JobOfferStatus }>;

export interface ApplicationRecord {
  id: number;
  job: number;
  job_title?: string | null;
  applicant: number;
  applicant_username?: string;
  applicant_name?: string;
  applicant_profile_summary?: string;
  applicant_availability?: string;
  applicant_bio?: string;
  applicant_skills?: string[];
  applicant_profile_picture_url?: string;
  cover_letter?: string;
  status: string;
  offer?: JobOffer | null;
  submitted_at: string;
  updated_at: string;
}

export interface CreateApplicationPayload {
  job: number;
  cover_letter?: string;
  status?: string;
}

export interface SendConversationPayload {
  traveller_id: number;
  employer_id: number;
  job_id?: number;
  body: string;
}

export interface SendConversationResponse {
  conversation: ConversationSummary;
  message: MessageEnvelope;
}

export interface JobHistoryEntry {
  id?: number;
  employer_name: string;
  job_title: string;
  start_date: string;
  end_date?: string | null;
  employer_comments?: string;
  rating: number;
}

export interface CertificationRecord {
  id: number;
  name: string;
  issued_date?: string | null;
  expiry_date?: string | null;
}

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  is_traveller: boolean;
  is_employer: boolean;
  employer_profile?: EmployerProfile | null;
  phone?: string;
  country_of_origin?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_postcode?: string;
  date_of_birth?: string | null;
  profile_picture_url?: string;
  tfn?: string;
  abn?: string;
  bank_name?: string;
  bank_bsb?: string;
  bank_account_number?: string;
  bio?: string;
  availability?: string;
  skills?: string[];
  languages?: string[];
  global_rating?: number;
  job_history?: JobHistoryEntry[];
}

export interface EmployerProfile {
  id: number;
  company_name?: string;
  company_description?: string;
  abn?: string;
  is_suspended?: boolean;
  business_category?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  website?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_postcode?: string;
  logo_url?: string;
  social_links?: string[];
  notification_preferences?: Record<string, boolean>;
  average_rating?: number;
  rating_count?: number;
  worker_history?: EmployerWorkerHistoryEntry[];
}

export interface EmployerWorkerHistoryEntry {
  id: number;
  worker_name: string;
  job_title?: string;
  start_date?: string | null;
  end_date?: string | null;
  rating?: number | null;
  notes?: string;
}

export interface EmployerStatsPayload {
  counts: {
    total: number;
    active: number;
    draft: number;
    closed: number;
  };
  active_jobs: JobSummary[];
  draft_jobs: JobSummary[];
  closed_jobs: JobSummary[];
  average_rating?: number;
  rating_count?: number;
  recent_comments: Array<{
    worker_name: string;
    notes?: string;
    rating?: number | null;
    start_date?: string | null;
    end_date?: string | null;
  }>;
}

export interface JobSummary {
  id: number;
  title: string;
  description: string;
  location: string;
  hourly_rate: string;
  currency: string;
  is_remote_friendly: boolean;
  start_date?: string | null;
  end_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Job extends JobSummary {
  category: string;
  employment_type: string;
  location_address: string;
  location_city: string;
  location_state: string;
  location_region: string;
  location_latitude?: string | null;
  location_longitude?: string | null;
  is_live: boolean;
  fixed_salary: string | null;
  work_hours_per_day: string | null;
  days_per_week: string | null;
  accommodation_provided: boolean;
  accommodation_cost: string | null;
  transport_provided: boolean;
  experience_required: boolean;
  skills: string;
  language_requirements: string;
  certifications_required: string;
  status: string;
  employer: number;
  employer_name?: string;
  employer_user_id?: number;
  distance_km?: number | null;
}

export interface CreateJobPayload {
  title: string;
  description: string;
  category: string;
  employment_type: string;
  location: string;
  location_address?: string;
  location_city?: string;
  location_state?: string;
  location_region?: string;
  is_live?: boolean;
  hourly_rate?: string | number | null;
  fixed_salary?: string | number | null;
  currency?: string;
  is_remote_friendly?: boolean;
  work_hours_per_day?: string | number | null;
  days_per_week?: string | number | null;
  accommodation_provided?: boolean;
  accommodation_cost?: string | number | null;
  transport_provided?: boolean;
  start_date: string;
  end_date?: string | null;
  experience_required?: boolean;
  skills?: string;
  language_requirements?: string;
  certifications_required?: string;
}

export interface JobListParams {
  state?: string;
  region?: string;
  city?: string;
  q?: string;
  radius_km?: number;
  limit?: number;
}

export interface UserProfile extends AuthUser {}

export interface PublicProfile {
  id: number;
  first_name?: string;
  last_name?: string;
  profile_picture_url?: string;
  bio?: string;
  availability?: string;
  country_of_origin?: string;
  address_city?: string;
  address_state?: string;
  skills?: string[];
  languages?: string[];
  job_history?: JobHistoryEntry[];
  certifications?: CertificationRecord[];
  employer_profile?: EmployerProfile | null;
  is_traveller: boolean;
  is_employer: boolean;
  global_rating?: number;
  has_tfn: boolean;
  has_abn: boolean;
  has_bank_details: boolean;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface RegisterPayload {
  email: string;
  password: string;
  confirm_password: string;
  role: 'traveller' | 'employer';
  first_name?: string;
  last_name?: string;
  phone?: string;
  country_of_origin?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UpdateProfilePayload {
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  country_of_origin?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_postcode?: string;
  date_of_birth?: string | null;
  profile_picture_url?: string;
  tfn?: string;
  abn?: string;
  bank_name?: string;
  bank_bsb?: string;
  bank_account_number?: string;
  bio?: string;
  availability?: string;
  skills?: string[];
  languages?: string[];
  job_history?: JobHistoryEntry[];
  is_traveller?: boolean;
  is_employer?: boolean;
}

export interface PasswordChangePayload {
  current_password: string;
  new_password: string;
  confirm_new_password: string;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

let inMemoryTokens: AuthTokens | null = null;
let refreshPromise: Promise<AuthTokens> | null = null;

function persistTokens(tokens: AuthTokens | null) {
  inMemoryTokens = tokens;
  if (typeof window !== 'undefined') {
    if (tokens) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }
  if (tokens) {
    api.defaults.headers.common.Authorization = `Bearer ${tokens.access}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export function setAuthTokens(tokens: AuthTokens) {
  persistTokens(tokens);
}

export function clearAuthTokens() {
  persistTokens(null);
}

export function getStoredTokens(): AuthTokens | null {
  if (inMemoryTokens) {
    return inMemoryTokens;
  }
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as AuthTokens;
    persistTokens(parsed);
    return parsed;
  } catch (error) {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    return null;
  }
}

async function refreshTokens(): Promise<AuthTokens> {
  const existing = getStoredTokens();
  if (!existing?.refresh) {
    throw new Error('No refresh token available');
  }
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE_URL}/auth/token/refresh/`, { refresh: existing.refresh })
      .then(({ data }) => {
        const updated: AuthTokens = {
          access: data.access,
          refresh: data.refresh ?? existing.refresh,
        };
        persistTokens(updated);
        return updated;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = (error.config || {}) as AxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const tokens = await refreshTokens();
        originalRequest.headers = {
          ...(originalRequest.headers || {}),
          Authorization: `Bearer ${tokens.access}`,
        };
        return api(originalRequest);
      } catch (refreshError) {
        clearAuthTokens();
      }
    }
    return Promise.reject(error);
  }
);

export async function registerUser(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/users/auth/register/', payload);
  return data;
}

export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/users/auth/login/', payload);
  return data;
}

export async function logoutUser(refresh: string) {
  return api.post('/users/auth/logout/', { refresh });
}

export async function fetchCurrentUser(): Promise<UserProfile> {
  const { data } = await api.get<UserProfile>('/users/me/');
  return data;
}

export async function updateUserProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
  const { data } = await api.patch<UserProfile>('/users/me/', payload);
  return data;
}

export async function changePassword(payload: PasswordChangePayload) {
  return api.post('/users/auth/password-change/', payload);
}

export async function fetchEmployerProfile(): Promise<EmployerProfile> {
  const { data } = await api.get<EmployerProfile>('/users/employers/profile/');
  return data;
}

export async function updateEmployerProfile(payload: Partial<EmployerProfile>): Promise<EmployerProfile> {
  const { data } = await api.patch<EmployerProfile>('/users/employers/profile/', payload);
  return data;
}

export async function fetchEmployerStats(): Promise<EmployerStatsPayload> {
  const { data } = await api.get<EmployerStatsPayload>('/users/employers/stats/');
  return data;
}

export async function fetchTravellerDocuments(): Promise<TravellerDocument[]> {
  const { data } = await api.get<TravellerDocument[]>('/users/documents/');
  return data;
}

export async function uploadTravellerDocument(payload: UploadTravellerDocumentPayload): Promise<TravellerDocument> {
  const formData = new FormData();
  formData.append('title', payload.title);
  formData.append('file', payload.file);
  if (payload.category) {
    formData.append('category', payload.category);
  }
  const { data } = await api.post<TravellerDocument>('/users/documents/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function deleteTravellerDocument(id: number): Promise<void> {
  await api.delete(`/users/documents/${id}/`);
}

export async function fetchEmployerJobs(): Promise<Job[]> {
  const { data } = await api.get<Job[]>('/jobs/mine/');
  return data;
}

export async function fetchPublicProfile(profileId: number): Promise<PublicProfile> {
  const { data } = await api.get<PublicProfile>(`/users/profiles/${profileId}/`);
  return data;
}

export async function fetchApplications(params: { jobId?: number } = {}): Promise<ApplicationRecord[]> {
  const query: Record<string, number> = {};
  if (params.jobId) {
    query.job_id = params.jobId;
  }
  const { data } = await api.get<ApplicationRecord[]>('/applications/', { params: query });
  return data;
}

export async function fetchApplication(applicationId: number): Promise<ApplicationRecord> {
  const { data } = await api.get<ApplicationRecord>(`/applications/${applicationId}/`);
  return data;
}

export async function createApplication(payload: CreateApplicationPayload): Promise<ApplicationRecord> {
  const { data } = await api.post<ApplicationRecord>('/applications/', payload);
  return data;
}

export async function fetchJobOffer(applicationId: number): Promise<JobOffer> {
  const { data } = await api.get<JobOffer>(`/applications/${applicationId}/offer/`);
  return data;
}

export async function createJobOffer(
  applicationId: number,
  payload: CreateJobOfferPayload
): Promise<JobOffer> {
  const { data } = await api.post<JobOffer>(`/applications/${applicationId}/offer/`, payload);
  return data;
}

export async function updateJobOffer(
  applicationId: number,
  payload: UpdateJobOfferPayload
): Promise<JobOffer> {
  const { data } = await api.patch<JobOffer>(`/applications/${applicationId}/offer/`, payload);
  return data;
}

export async function fetchEmployerWorkers(): Promise<JobOffer[]> {
  const { data } = await api.get<JobOffer[]>('/applications/my-workers/');
  return data;
}

export async function fetchTravellerJobs(): Promise<JobOffer[]> {
  const { data } = await api.get<JobOffer[]>('/applications/my-jobs/');
  return data;
}

export interface UpdateTimesheetPayload {
  entries: Array<{
    entry_date: string;
    hours_worked: number | string;
    notes?: string;
  }>;
  traveller_notes?: string;
}

export async function fetchTimesheet(applicationId: number): Promise<Timesheet> {
  const { data } = await api.get<Timesheet>(`/applications/${applicationId}/timesheet/`);
  return data;
}

export async function updateTimesheet(applicationId: number, payload: UpdateTimesheetPayload): Promise<Timesheet> {
  const { data } = await api.put<Timesheet>(`/applications/${applicationId}/timesheet/`, payload);
  return data;
}

export async function submitTimesheet(applicationId: number): Promise<Timesheet> {
  const { data } = await api.post<Timesheet>(`/applications/${applicationId}/timesheet/submit/`);
  return data;
}

export async function approveTimesheet(
  applicationId: number,
  payload: { employer_notes?: string }
): Promise<Timesheet> {
  const { data } = await api.post<Timesheet>(`/applications/${applicationId}/timesheet/approve/`, payload);
  return data;
}

export async function fetchPayslip(applicationId: number): Promise<Payslip | null> {
  const response = await api.get<Payslip>(`/applications/${applicationId}/payslip/`, {
    validateStatus: (status) => Boolean(status && [200, 404].includes(status)),
  });
  if (response.status === 404) {
    return null;
  }
  return response.data;
}

export async function createPayslip(applicationId: number): Promise<Payslip> {
  const { data } = await api.post<Payslip>(`/applications/${applicationId}/payslip/`);
  return data;
}

export async function confirmPayslipInstructions(applicationId: number): Promise<Payslip> {
  const { data } = await api.post<Payslip>(`/applications/${applicationId}/payslip/confirm-instructions/`);
  return data;
}

export async function fetchJobs(params: JobListParams = {}) {
  const query: Record<string, string | number> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query[key] = value;
  });
  if (!query.limit) {
    query.limit = 24;
  }
  const { data } = await api.get('/jobs/', { params: query });
  return data;
}

export async function fetchJob(id: string | number) {
  const { data } = await api.get(`/jobs/${id}/`);
  return data;
}

export async function createJob(payload: CreateJobPayload): Promise<Job> {
  const { data } = await api.post<Job>('/jobs/', payload);
  return data;
}

export async function sendConversationMessage(payload: SendConversationPayload): Promise<SendConversationResponse> {
  const { data } = await api.post<SendConversationResponse>('/messaging/conversations/send/', payload);
  return data;
}

export async function fetchConversations(): Promise<ConversationSummary[]> {
  const { data } = await api.get<ConversationSummary[]>('/messaging/conversations/');
  return data;
}

export async function fetchConversationMessages(conversationId: number): Promise<MessageEnvelope[]> {
  const { data } = await api.get<MessageEnvelope[]>(`/messaging/conversations/${conversationId}/messages/`);
  return data;
}

export async function sendConversationReply(conversationId: number, body: string): Promise<MessageEnvelope> {
  const { data } = await api.post<MessageEnvelope>(`/messaging/conversations/${conversationId}/messages/`, { body });
  return data;
}

export default api;
