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
  id: number;
  release_date: string;
  end_date: string;
  semester: string;
  role: string;
  pay: number;
  description: string;
};

export type JobListingRecord = {
  id: number;
  date_created: string;
  date_end: string;
  job: string;
  description: string;
  questions?: Array<{
    id: number;
    job_listing_id: number;
    prompt: string;
    sort_order: number;
  }>;
};

export type JobListingCreatePayload = {
  date_created: string;
  date_end: string;
  job: string;
  description: string;
  questions?: Array<{ prompt: string; sort_order: number }>;
};

export type RepositoryQuestion = {
  prompt: string;
};

export type RepositoryRequestPayload = {
  job_listing_id: number;
  applicant_name: string;
  applicant_email: string;
  responses_json: string;
  status?: string;
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
  created_at: string;
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

export async function getJobListings(): Promise<JobListingRecord[]> {
  const response = await apiClient.get<JobListingRecord[]>("/api/job-listings");
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

export async function createRepositoryRequest(payload: RepositoryRequestPayload): Promise<void> {
  await apiClient.post("/api/repository-requests", payload);
}

export async function getRepositoryRequests(): Promise<RepositoryRequestRecord[]> {
  const response = await apiClient.get<RepositoryRequestRecord[]>("/api/repository-requests");
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
