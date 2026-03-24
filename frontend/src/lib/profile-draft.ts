import type { UserProfile } from "../api";

export type ProfileDraft = {
  fullName: string;
  preferredName: string;
  expectedGraduationDate: string;
  currentCollegeYear: string;
  major: string;
  minor: string;
  concentration: string;
  gpa: string;
  githubUrl: string;
  linkedinUrl: string;
  clubsExtracurriculars: string;
  paidExperienceCount: string;
  unpaidExperienceCount: string;
};

export const COLLEGE_YEAR_OPTIONS = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate", "Other"];

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalizeMetadataKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function toDisplayString(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
}

function normalizeDateValue(value: string): string {
  if (!value) {
    return "";
  }
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}/.test(trimmed) ? trimmed.slice(0, 10) : trimmed;
}

export function pickMetadataString(source: Record<string, unknown>, candidates: string[]): string {
  for (const candidate of candidates) {
    const value = toDisplayString(source[candidate]);
    if (value) {
      return value;
    }
  }

  const normalizedMap = new Map<string, unknown>();
  Object.entries(source).forEach(([key, value]) => {
    normalizedMap.set(normalizeMetadataKey(key), value);
  });

  for (const candidate of candidates) {
    const value = toDisplayString(normalizedMap.get(normalizeMetadataKey(candidate)));
    if (value) {
      return value;
    }
  }

  return "";
}

export function emptyProfileDraft(): ProfileDraft {
  return {
    fullName: "",
    preferredName: "",
    expectedGraduationDate: "",
    currentCollegeYear: "",
    major: "",
    minor: "",
    concentration: "",
    gpa: "",
    githubUrl: "",
    linkedinUrl: "",
    clubsExtracurriculars: "",
    paidExperienceCount: "",
    unpaidExperienceCount: "",
  };
}

export function buildProfileDraft(profile: UserProfile): ProfileDraft {
  const userMetadata = asRecord(profile.user_metadata);
  const globalProfile = asRecord(userMetadata.global_profile);
  const fullName = `${profile.first_name} ${profile.last_name}`.trim();

  return {
    fullName,
    preferredName: pickMetadataString(userMetadata, ["preferred_name", "preferredName"]),
    expectedGraduationDate: normalizeDateValue(pickMetadataString(globalProfile, ["Expected graduation date"])),
    currentCollegeYear: pickMetadataString(globalProfile, ["Current year / grade level"]),
    major: pickMetadataString(globalProfile, ["Major(s) - selected from a maintained dropdown list"]),
    minor: pickMetadataString(globalProfile, ["Minor(s) - selected from a maintained dropdown list (optional)"]),
    concentration: pickMetadataString(globalProfile, ["Concentration - selected from a maintained dropdown list (optional)"]),
    gpa: pickMetadataString(globalProfile, ["GPA (optional)"]),
    githubUrl: pickMetadataString(globalProfile, ["Github URL (optional)", "GitHub URL (optional)"]),
    linkedinUrl: pickMetadataString(globalProfile, ["Linkedin URL (optional)", "LinkedIn URL (optional)"]),
    clubsExtracurriculars: pickMetadataString(globalProfile, ["Clubs and extracurricular activities (list)"]),
    paidExperienceCount: pickMetadataString(globalProfile, ["Count of paid work experiences since high school graduation"]),
    unpaidExperienceCount: pickMetadataString(globalProfile, ["Count of unpaid/volunteer experiences since high school graduation"]),
  };
}

export function buildApplicantName(draft: ProfileDraft, profile: UserProfile | null): string {
  const fullName = draft.fullName.trim();
  if (fullName) {
    return fullName;
  }
  if (profile) {
    const fallbackName = `${profile.first_name} ${profile.last_name}`.trim();
    if (fallbackName) {
      return fallbackName;
    }
  }
  return "Applicant";
}

export function buildProfileSnapshot(profile: UserProfile, draft: ProfileDraft): Record<string, unknown> {
  const userMetadata = asRecord(profile.user_metadata);
  const globalProfile = asRecord(userMetadata.global_profile);

  return {
    email: profile.email,
    first_name: profile.first_name,
    last_name: profile.last_name,
    full_name: draft.fullName,
    preferred_name: draft.preferredName,
    user_metadata: {
      ...userMetadata,
      preferred_name: draft.preferredName,
      global_profile: {
        ...globalProfile,
        "Full legal name": draft.fullName,
        "Preferred name": draft.preferredName,
        "Expected graduation date": draft.expectedGraduationDate,
        "Current year / grade level": draft.currentCollegeYear,
        "Major(s) - selected from a maintained dropdown list": draft.major,
        "Minor(s) - selected from a maintained dropdown list (optional)": draft.minor,
        "Concentration - selected from a maintained dropdown list (optional)": draft.concentration,
        "GPA (optional)": draft.gpa,
        "Github URL (optional)": draft.githubUrl,
        "Linkedin URL (optional)": draft.linkedinUrl,
        "Clubs and extracurricular activities (list)": draft.clubsExtracurriculars,
        "Count of paid work experiences since high school graduation": draft.paidExperienceCount,
        "Count of unpaid/volunteer experiences since high school graduation": draft.unpaidExperienceCount,
      },
    },
  };
}
