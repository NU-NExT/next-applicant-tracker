import axios from "axios";

export type ApplicationRecord = {
  id: number;
  status: string;
  position_title: string;
  statement: string;
  resume_key?: string | null;
  transcript_key?: string | null;
  created_at: string;
};

export type JobDataRecord = {
  metadata_id?: number;
  id?: number;
  release_date: string;
  end_date: string;
  semester?: string | null;
  role?: string | null;
  pay: number;
  description?: string | null;
};

export type JobListingRecord = {
  id: number;
  code_id?: string | null;
  date_created: string;
  date_end: string;
  position_title?: string;
  position_code?: string;
  job: string;
  description: string;
  status?: string;
  required_skills?: string | null;
  target_start_date?: string | null;
  is_active?: boolean;
  candidate_intake_url?: string;
  ats_questions_url?: string | null;
  questions?: Array<{
    id: number;
    job_listing_id: number;
    prompt: string;
    sort_order: number;
    question_type?: string;
    character_limit?: number | null;
    question_bank_key?: string | null;
    question_config_json?: Record<string, unknown> | null;
    answer_type?: string;
    answer_bank_key?: string | null;
    answer_config_json?: Record<string, unknown> | null;
    is_global?: boolean;
  }>;
};

export type JobListingCreatePayload = {
  date_created: string;
  date_end: string;
  code_id?: string;
  position_title?: string;
  position_code?: string;
  job: string;
  description: string;
  status?: string;
  required_skills?: string;
  target_start_date?: string;
  is_active?: boolean;
  candidate_intake_url?: string;
  ats_questions_url?: string;
  questions?: Array<{
    prompt: string;
    sort_order: number;
    question_type?: string;
    character_limit?: number | null;
    question_bank_key?: string | null;
    question_config_json?: Record<string, unknown> | null;
    answer_type?: string;
    answer_bank_key?: string | null;
    answer_config_json?: Record<string, unknown> | null;
    is_global?: boolean;
  }>;
  global_question_ids?: number[];
};

export type RepositoryQuestion = {
  prompt: string;
  question_type?: string;
  character_limit?: number | null;
  question_bank_key?: string | null;
  question_config_json?: Record<string, unknown> | null;
  answer_type?: string;
  answer_bank_key?: string | null;
  answer_config_json?: Record<string, unknown> | null;
  is_global?: boolean;
};

export type RepositoryRequestPayload = {
  job_listing_id?: number;
  position_code?: string;
  applicant_name: string;
  applicant_email: string;
  responses_json: string;
  status?: string;
  profile_snapshot_json?: Record<string, unknown>;
  resume_s3_key?: string;
};

export type AdminApplicationRow = {
  job: string;
  status: string;
  date_opened?: string;
  date_closed?: string;
  total_submissions?: number;
};

export type DemographicsSummary = {
  total_submissions: number;
  applicants_with_edu_email: number;
  applicants_with_other_email: number;
};

export type RepositoryRequestRecord = {
  id: number;
  job_listing_id: number;
  applicant_name: string;
  applicant_email: string;
  status: string;
  responses_json: string;
  profile_snapshot_json?: Record<string, unknown>;
  resume_s3_key?: string | null;
  created_at: string;
};

export type UserProfile = {
  email: string;
  first_name: string;
  last_name: string;
  is_admin: boolean;
  is_active: boolean;
  consented_at?: string | null;
  user_metadata: Record<string, unknown>;
};

export type ProfileFull = {
  // User fields
  email: string;
  first_name: string;
  last_name: string;
  is_admin: boolean;
  is_active: boolean;
  consented_at?: string | null;
  user_metadata: Record<string, unknown>;
  // Profile fields
  full_legal_name: string | null;
  phone_number: string | null;
  pronouns: string | null;
  expected_graduation_date: string | null;
  current_year: string | null;
  coop_number: string | null;
  major: string | null;
  minor: string | null;
  concentration: string | null;
  college: string | null;
  gpa: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  personal_website_url: string | null;
  club: string | null;
  other_relevant_information: string | null;
  past_experience_count: number | null;
  unique_experience_count: number | null;
};

export type ProfileFullUpdatePayload = Partial<
  Pick<ProfileFull,
    | "first_name" | "last_name" | "full_legal_name" | "phone_number"
    | "pronouns"
    | "expected_graduation_date" | "current_year" | "coop_number"
    | "major" | "minor" | "concentration" | "college" | "gpa"
    | "github_url" | "linkedin_url" | "personal_website_url" | "club"
    | "other_relevant_information"
    | "past_experience_count" | "unique_experience_count"
  >
>;

export type FieldOptionRecord = {
  id: number;
  category: string;
  value: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type AuthLoginPayload = {
  email: string;
  password: string;
};

export type AuthLoginResponse = {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_admin: boolean;
};

export type AuthRegisterApplicantPayload = {
  email: string;
  password: string;
  return_to?: string;
};

export type AuthForgotPasswordPayload = {
  email: string;
};

export type AuthConfirmForgotPasswordPayload = {
  email: string;
  confirmation_code: string;
  new_password: string;
};

export type AuthCreateAdminPayload = {
  email: string;
  name: string;
};

export type AuthDeactivateAdminPayload = {
  email: string;
};

export type CandidateReviewSearchRow = {
  submission_id: number;
  candidate_name: string;
  candidate_email: string;
  major?: string | null;
  graduation_date?: string | null;
  coop_number?: string | null;
  year_grade_level?: string | null;
  college?: string | null;
  position_applied_for: string;
  cycle?: string | null;
  application_status: string;
};

export type ApplicationReviewScoreRecord = {
  id: number;
  application_submission_id: number;
  reviewer_user_id: number;
  reviewer_name: string;
  score: number;
  created_at: string;
};

export type ApplicationReviewCommentRecord = {
  id: number;
  application_submission_id: number;
  reviewer_user_id: number;
  reviewer_name: string;
  comment: string;
  created_at: string;
};

export type CandidateReviewDetail = {
  submission: RepositoryRequestRecord;
  position_title: string;
  position_code: string;
  global_profile_fields: Record<string, unknown>;
  position_question_answers: Array<Record<string, unknown>>;
  resume_view_url?: string | null;
  scores: ApplicationReviewScoreRecord[];
  comments: ApplicationReviewCommentRecord[];
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
  },
});

export async function getJobData(): Promise<JobDataRecord[]> {
  const response = await apiClient.get<JobDataRecord[]>("/api/job-data");
  return response.data;
}

export async function getJobDataById(jobId: number): Promise<JobDataRecord> {
  const response = await apiClient.get<JobDataRecord>(`/api/job-data/${jobId}`);
  return response.data;
}

export async function getJobListings(): Promise<JobListingRecord[]> {
  const response = await apiClient.get<JobListingRecord[]>("/api/job-listings");
  return response.data;
}

export async function getJobListingByPositionCode(positionCode: string): Promise<Record<string, unknown>> {
  const response = await apiClient.get<Record<string, unknown>>(`/api/job-listings/by-position-code/${positionCode}`);
  return response.data;
}

export async function createJobListing(payload: JobListingCreatePayload): Promise<JobListingRecord> {
  const response = await apiClient.post<JobListingRecord>("/api/job-listings", payload);
  return response.data;
}

export async function updateJobListing(
  jobListingId: number,
  payload: Partial<JobListingCreatePayload>
): Promise<JobListingRecord> {
  const response = await apiClient.patch<JobListingRecord>(`/api/job-listings/${jobListingId}`, payload);
  return response.data;
}

export async function getRepositoryQuestions(jobListingId: number): Promise<RepositoryQuestion[]> {
  const response = await apiClient.get<RepositoryQuestion[]>(`/api/repository/${jobListingId}/questions`);
  return response.data;
}

export async function getRepositoryQuestionsByPosition(positionCode: string): Promise<RepositoryQuestion[]> {
  const response = await apiClient.get<RepositoryQuestion[]>(`/api/repository/by-position/${positionCode}/questions`);
  return response.data;
}

export async function createRepositoryRequest(payload: RepositoryRequestPayload, accessToken: string): Promise<void> {
  await apiClient.post("/api/repository-requests", payload, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function getRepositoryRequests(): Promise<RepositoryRequestRecord[]> {
  const response = await apiClient.get<RepositoryRequestRecord[]>("/api/repository-requests");
  return response.data;
}

export async function getMyRepositoryRequests(accessToken: string): Promise<RepositoryRequestRecord[]> {
  const response = await apiClient.get<RepositoryRequestRecord[]>("/api/repository-requests/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
}

export async function uploadResumePdf(file: File, accessToken: string): Promise<{ resume_s3_key: string; resume_view_url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiClient.post<{ resume_s3_key: string; resume_view_url: string }>(
    "/api/repository-requests/upload-resume",
    formData,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
}

export async function getSubmissionResumeViewUrl(
  submissionId: number,
  accessToken: string
): Promise<{ resume_view_url: string }> {
  const response = await apiClient.get<{ resume_view_url: string }>(
    `/api/repository-requests/${submissionId}/resume-view-url`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return response.data;
}

export async function getAdminOpenApplications(): Promise<AdminApplicationRow[]> {
  const response = await apiClient.get<AdminApplicationRow[]>("/api/admin/open-applications");
  return response.data;
}

export async function getAdminPastApplications(): Promise<AdminApplicationRow[]> {
  const response = await apiClient.get<AdminApplicationRow[]>("/api/admin/past-applications");
  return response.data;
}

export async function getAdminDemographicsSummary(): Promise<DemographicsSummary> {
  const response = await apiClient.get<DemographicsSummary>("/api/admin/demographics-summary");
  return response.data;
}

export async function authLogin(payload: AuthLoginPayload): Promise<AuthLoginResponse> {
  const response = await apiClient.post<AuthLoginResponse>("/api/auth/login", payload);
  return response.data;
}

export async function authRegisterApplicant(payload: AuthRegisterApplicantPayload): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>("/api/auth/register-applicant", payload);
  return response.data;
}

export async function authForgotPassword(payload: AuthForgotPasswordPayload): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>("/api/auth/forgot-password", payload);
  return response.data;
}

export async function authConfirmForgotPassword(
  payload: AuthConfirmForgotPasswordPayload
): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>("/api/auth/confirm-forgot-password", payload);
  return response.data;
}

export async function authCreateAdmin(
  payload: AuthCreateAdminPayload,
  accessToken: string
): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>("/api/auth/admin/create-admin", payload, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
}

export async function authDeactivateAdmin(
  payload: AuthDeactivateAdminPayload,
  accessToken: string
): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>("/api/auth/admin/deactivate", payload, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
}

export async function getMyProfile(accessToken: string): Promise<UserProfile> {
  const response = await apiClient.get<UserProfile>("/api/profile/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
}

export async function updateMyProfile(
  accessToken: string,
  payload: Partial<Pick<UserProfile, "first_name" | "last_name">> & { user_metadata?: Record<string, unknown> }
): Promise<UserProfile> {
  const response = await apiClient.patch<UserProfile>("/api/profile/me", payload, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
}

export async function acceptDataConsent(accessToken: string): Promise<UserProfile> {
  const response = await apiClient.post<UserProfile>(
    "/api/profile/consent",
    {},
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return response.data;
}

export async function getMyFullProfile(accessToken: string): Promise<ProfileFull> {
  const response = await apiClient.get<ProfileFull>("/api/profile/me/extended", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
}

export async function updateMyFullProfile(
  accessToken: string,
  payload: ProfileFullUpdatePayload
): Promise<ProfileFull> {
  const response = await apiClient.patch<ProfileFull>("/api/profile/me/extended", payload, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
}

export async function searchCandidateReviews(
  accessToken: string,
  filters: Record<string, string>
): Promise<CandidateReviewSearchRow[]> {
  const response = await apiClient.get<CandidateReviewSearchRow[]>("/api/admin/review/search", {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: filters,
  });
  return response.data;
}

export async function getCandidateReviewDetail(
  submissionId: number,
  accessToken: string
): Promise<CandidateReviewDetail> {
  const response = await apiClient.get<CandidateReviewDetail>(`/api/admin/review/applications/${submissionId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
}

export async function addCandidateReviewScore(
  submissionId: number,
  score: number,
  accessToken: string
): Promise<ApplicationReviewScoreRecord> {
  const response = await apiClient.post<ApplicationReviewScoreRecord>(
    `/api/admin/review/applications/${submissionId}/scores`,
    { score },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return response.data;
}

export async function addCandidateReviewComment(
  submissionId: number,
  comment: string,
  accessToken: string
): Promise<ApplicationReviewCommentRecord> {
  const response = await apiClient.post<ApplicationReviewCommentRecord>(
    `/api/admin/review/applications/${submissionId}/comments`,
    { comment },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return response.data;
}

export async function exportCandidateReviewsCsv(
  accessToken: string,
  filters: Record<string, string>
): Promise<Blob> {
  const response = await apiClient.get<Blob>("/api/admin/review/export.csv", {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: filters,
    responseType: "blob",
  });
  return response.data;
}

export async function getFieldOptions(category?: string): Promise<FieldOptionRecord[]> {
  const response = await apiClient.get<FieldOptionRecord[]>("/api/admin/field-options", {
    params: category ? { category } : undefined,
  });
  return response.data;
}

export async function createFieldOption(
  payload: { category: string; value: string; sort_order?: number; is_active?: boolean },
  accessToken: string
): Promise<FieldOptionRecord> {
  const response = await apiClient.post<FieldOptionRecord>("/api/admin/field-options", payload, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
}

export async function deleteFieldOption(optionId: number, accessToken: string): Promise<void> {
  await apiClient.delete(`/api/admin/field-options/${optionId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export type ConsentVersionRecord = {
  consent_version_id: number;
  consent_text: string;
  consent_version_created_at: string;
};

export async function getLatestConsent(): Promise<ConsentVersionRecord> {
  const response = await apiClient.get<ConsentVersionRecord>("/api/consent/latest");
  return response.data;
}

export async function createConsentVersion(consentText: string): Promise<ConsentVersionRecord> {
  const response = await apiClient.post<ConsentVersionRecord>("/api/consent/", { consent_text: consentText });
  return response.data;
}

export type ApplicationConsentRecord = {
  application_consent_id: number;
  user_id: number;
  job_listing_id: number;
  application_submission_id: number | null;
  consented_at: string;
  consent_text: string;
  is_active: boolean;
};

export async function recordApplicationConsent(
  jobListingId: number,
  consentText: string,
  accessToken: string,
  applicationSubmissionId?: number,
): Promise<ApplicationConsentRecord> {
  const response = await apiClient.post<ApplicationConsentRecord>(
    "/api/consent/application-consent",
    { job_listing_id: jobListingId, consent_text: consentText, application_submission_id: applicationSubmissionId ?? null },
    { headers: { Authorization: `Bearer ${accessToken}` } },
    
// ── Admin position management ─────────────────────────────────────────────-
export type AdminJobListingRecord = {
  listing_id: number;
  code_id: string | null;
  position_title: string;
  description: string;
  required_skills: string | null;
  target_start_date: string | null;
  listing_date_end: string | null;
  nuworks_url: string | null;
  nuworks_position_id: string | null;
  is_active: boolean;
  listing_date_created: string;
  intake_url: string;
  application_count: number;
  question_count: number;
};

export type AdminJobListingCreatePayload = {
  position_title: string;
  code_id: string;
  description: string;
  required_skills?: string;
  target_start_date: string | null;
  listing_date_end: string | null;
  nuworks_url: string | null;
  nuworks_position_id: string | null;
  global_question_ids?: number[];
};

export type AdminJobListingUpdatePayload = Partial<
  Omit<AdminJobListingCreatePayload, "code_id"> & { is_active: boolean }
>;

export async function getAdminJobListings(
  token: string,
  isActive?: boolean
): Promise<AdminJobListingRecord[]> {
  const params = isActive !== undefined ? { is_active: isActive } : {};
  const response = await apiClient.get<AdminJobListingRecord[]>("/api/job-listings/admin", {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return response.data;
}

export async function getAdminJobListing(
  token: string,
  id: number
): Promise<AdminJobListingRecord> {
  const response = await apiClient.get<AdminJobListingRecord>(`/api/job-listings/admin/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function createAdminJobListing(
  token: string,
  payload: AdminJobListingCreatePayload
): Promise<AdminJobListingRecord> {
  const response = await apiClient.post<AdminJobListingRecord>("/api/job-listings/admin", payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function updateAdminJobListing(
  token: string,
  id: number,
  payload: AdminJobListingUpdatePayload
): Promise<AdminJobListingRecord> {
  const response = await apiClient.patch<AdminJobListingRecord>(
    `/api/job-listings/admin/${id}`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
}

export async function deactivateApplicationConsent(
  consentId: number,
  accessToken: string,
): Promise<ApplicationConsentRecord> {
  const response = await apiClient.patch<ApplicationConsentRecord>(
    `/api/consent/application-consent/${consentId}/deactivate`,
    {},
    { headers: { Authorization: `Bearer ${accessToken}` } },
export async function deactivateJobListing(
  token: string,
  id: number
): Promise<AdminJobListingRecord> {
  const response = await apiClient.patch<AdminJobListingRecord>(
    `/api/job-listings/admin/${id}/deactivate`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
}

// ── Position question management ───────────────────────────────────────────

export type PositionQuestionRecord = {
  question_id: number;
  prompt: string;
  sort_order: number;
  character_limit: number | null;
};

export async function getPositionQuestions(
  token: string,
  listingId: number
): Promise<PositionQuestionRecord[]> {
  const response = await apiClient.get<PositionQuestionRecord[]>(
    `/api/job-listings/admin/${listingId}/questions`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
}

export async function createPositionQuestion(
  token: string,
  listingId: number,
  payload: { prompt: string; character_limit: number | null }
): Promise<PositionQuestionRecord> {
  const response = await apiClient.post<PositionQuestionRecord>(
    `/api/job-listings/admin/${listingId}/questions`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
}

export async function updatePositionQuestion(
  token: string,
  listingId: number,
  questionId: number,
  payload: { prompt?: string; character_limit?: number | null }
): Promise<PositionQuestionRecord> {
  const response = await apiClient.patch<PositionQuestionRecord>(
    `/api/job-listings/admin/${listingId}/questions/${questionId}`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
}

export async function deletePositionQuestion(
  token: string,
  listingId: number,
  questionId: number
): Promise<void> {
  await apiClient.delete(`/api/job-listings/admin/${listingId}/questions/${questionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function reorderPositionQuestions(
  token: string,
  listingId: number,
  questionIds: number[]
): Promise<PositionQuestionRecord[]> {
  const response = await apiClient.patch<PositionQuestionRecord[]>(
    `/api/job-listings/admin/${listingId}/questions/reorder`,
    { question_ids: questionIds },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
}

// ── Global question bank management ──────────────────────────────────────────

export type GlobalQuestionRecord = {
  question_id: number;
  prompt: string;
  sort_order: number;
  question_type_id: number;
  character_limit: number | null;
};

export async function getGlobalQuestionBank(
  token: string
): Promise<GlobalQuestionRecord[]> {
  const response = await apiClient.get<GlobalQuestionRecord[]>(
    "/api/job-listings/admin/global-questions",
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
}

export async function getPositionGlobalQuestions(
  token: string,
  listingId: number
): Promise<GlobalQuestionRecord[]> {
  const response = await apiClient.get<GlobalQuestionRecord[]>(
    `/api/job-listings/admin/${listingId}/global-questions`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
}

export async function setPositionGlobalQuestions(
  token: string,
  listingId: number,
  questionIds: number[]
): Promise<GlobalQuestionRecord[]> {
  const response = await apiClient.put<GlobalQuestionRecord[]>(
    `/api/job-listings/admin/${listingId}/global-questions`,
    { question_ids: questionIds },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
}
