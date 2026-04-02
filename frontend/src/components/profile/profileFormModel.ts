import type { ProfileFull, ProfileFullUpdatePayload } from "../../api";

export type ProfileFormData = {
  firstName: string;
  lastName: string;
  fullLegalName: string;
  preferredName: string;
  pronouns: string;
  email: string;
  expectedGraduationDate: string;
  currentYear: string;
  major: string;
  minor: string;
  concentration: string;
  gpa: string;
  githubUrl: string;
  linkedinUrl: string;
  clubs: string[];
  paidExperienceCount: string;
  unpaidExperienceCount: string;
  otherRelevantInformation: string;
};

export const EMPTY_PROFILE_FORM: ProfileFormData = {
  firstName: "",
  lastName: "",
  fullLegalName: "",
  preferredName: "",
  pronouns: "",
  email: "",
  expectedGraduationDate: "",
  currentYear: "",
  major: "",
  minor: "",
  concentration: "",
  gpa: "",
  githubUrl: "",
  linkedinUrl: "",
  clubs: [],
  paidExperienceCount: "0",
  unpaidExperienceCount: "0",
  otherRelevantInformation: "",
};

export const CURRENT_YEAR_OPTIONS = [
  "First Year",
  "Second Year",
  "Third Year",
  "Fourth Year",
  "Fifth Year+",
  "Graduate Student",
] as const;

export const GRADUATION_SEMESTER_OPTIONS = ["Fall", "Spring", "Summer 1", "Summer 2"] as const;

export const GRADUATION_YEAR_OPTIONS: string[] = (() => {
  const start = new Date().getFullYear();
  const span = 12;
  return Array.from({ length: span }, (_, i) => String(start + i));
})();

function readString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readStringWithFallback(...values: unknown[]): string {
  for (const value of values) {
    const parsed = readString(value);
    if (parsed) {
      return parsed;
    }
  }
  return "";
}

function normalizeCurrentYear(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized) return "";

  const map: Record<string, string> = {
    "freshman": "First Year",
    "first year": "First Year",
    "sophomore": "Second Year",
    "second year": "Second Year",
    "junior": "Third Year",
    "third year": "Third Year",
    "senior": "Fourth Year",
    "fourth year": "Fourth Year",
    "5th year+": "Fifth Year+",
    "5th year": "Fifth Year+",
    "fifth year+": "Fifth Year+",
    "fifth year": "Fifth Year+",
    "graduate student": "Graduate Student",
  };
  return map[normalized] ?? value;
}

export function parseClubList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

export function joinClubList(clubs: string[]): string {
  return clubs
    .map((club) => club.trim())
    .filter(Boolean)
    .join(", ");
}

export function parseOptionalNumber(value: string, fieldLabel: string, allowFloat = false): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = allowFloat ? Number(trimmed) : Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldLabel} must be a valid number.`);
  }
  return parsed;
}

function monthToSemester(month: number): string {
  if (month >= 1 && month <= 4) return "Spring";
  if (month >= 5 && month <= 6) return "Summer 1";
  if (month >= 7 && month <= 8) return "Summer 2";
  return "Fall";
}

function normalizeSemester(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
  if (normalized === "fall") return "Fall";
  if (normalized === "spring") return "Spring";
  if (normalized === "summer 1" || normalized === "summer1") return "Summer 1";
  if (normalized === "summer 2" || normalized === "summer2") return "Summer 2";
  return "";
}

export function splitExpectedGraduationDate(value: string): { year: string; semester: string } {
  const raw = value.trim();
  if (!raw) return { year: "", semester: "" };

  const yearFirst = raw.match(/^(\d{4})\s+(.+)$/);
  if (yearFirst) {
    const semester = normalizeSemester(yearFirst[2]);
    if (semester) return { year: yearFirst[1], semester };
  }

  const semesterFirst = raw.match(/^(.+)\s+(\d{4})$/);
  if (semesterFirst) {
    const semester = normalizeSemester(semesterFirst[1]);
    if (semester) return { year: semesterFirst[2], semester };
  }

  const monthNameMatch = raw.match(
    /^(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{4})$/i,
  );
  if (monthNameMatch) {
    const monthText = monthNameMatch[1].toLowerCase().slice(0, 3);
    const monthOrder = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const month = monthOrder.indexOf(monthText) + 1;
    if (month > 0) return { year: monthNameMatch[2], semester: monthToSemester(month) };
  }

  const isoDate = raw.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/);
  if (isoDate) {
    const month = Number.parseInt(isoDate[2], 10);
    if (month >= 1 && month <= 12) return { year: isoDate[1], semester: monthToSemester(month) };
  }

  const slashDate = raw.match(/^(\d{1,2})\/(\d{4})$/);
  if (slashDate) {
    const month = Number.parseInt(slashDate[1], 10);
    if (month >= 1 && month <= 12) return { year: slashDate[2], semester: monthToSemester(month) };
  }

  return { year: "", semester: "" };
}

export function joinExpectedGraduationDate(year: string, semester: string): string {
  const nextYear = year.trim();
  const nextSemester = normalizeSemester(semester);
  if (!nextYear || !nextSemester) return "";
  return `${nextYear} ${nextSemester}`;
}

export function profileFullToProfileForm(profile: ProfileFull): ProfileFormData {
  const metadata = asRecord(profile.user_metadata);
  const candidateProfile = asRecord(metadata.candidate_profile);
  const globalProfile = asRecord(metadata.global_profile);
  const firstName = readString(profile.first_name).trim();
  const lastName = readString(profile.last_name).trim();
  const fullLegalName = readStringWithFallback(
    profile.full_legal_name,
    candidateProfile.full_legal_name,
    globalProfile["Full legal name"],
  );
  const derivedFullLegalName = fullLegalName || [firstName, lastName].filter(Boolean).join(" ");

  const clubs =
    parseClubList(profile.club).length > 0
      ? parseClubList(profile.club)
      : parseClubList(candidateProfile.clubs).length > 0
        ? parseClubList(candidateProfile.clubs)
        : parseClubList(globalProfile["Clubs and extracurricular activities (list)"]);

  return {
    firstName,
    lastName,
    fullLegalName: derivedFullLegalName,
    preferredName: readStringWithFallback(candidateProfile.preferred_name, profile.first_name),
    pronouns: readStringWithFallback(profile.pronouns, candidateProfile.pronouns, globalProfile.Pronouns),
    email: readString(profile.email),
    expectedGraduationDate: readStringWithFallback(
      profile.expected_graduation_date,
      candidateProfile.expected_graduation_date,
      globalProfile["Expected graduation date"],
    ),
    currentYear: normalizeCurrentYear(
      readStringWithFallback(
        profile.current_year,
        candidateProfile.current_year,
        globalProfile["Current year / grade level"],
      ),
    ),
    major: readStringWithFallback(
      profile.major,
      candidateProfile.major,
      globalProfile["Major(s) - selected from a maintained dropdown list"],
    ),
    minor: readStringWithFallback(
      profile.minor,
      candidateProfile.minor,
      globalProfile["Minor(s) - selected from a maintained dropdown list (optional)"],
    ),
    concentration: readStringWithFallback(
      profile.concentration,
      candidateProfile.concentration,
      globalProfile["Concentration - selected from a maintained dropdown list (optional)"],
    ),
    gpa: readStringWithFallback(profile.gpa, candidateProfile.gpa, globalProfile["GPA (optional)"]),
    githubUrl: readStringWithFallback(profile.github_url, candidateProfile.github_url, globalProfile["GitHub URL (optional)"]),
    linkedinUrl: readStringWithFallback(
      profile.linkedin_url,
      candidateProfile.linkedin_url,
      globalProfile["LinkedIn URL (optional)"],
    ),
    clubs,
    paidExperienceCount:
      readStringWithFallback(
        profile.past_experience_count,
        candidateProfile.paid_experience_count,
        globalProfile["Count of paid work experiences since high school graduation"],
      ) || "0",
    unpaidExperienceCount:
      readStringWithFallback(
        profile.unique_experience_count,
        candidateProfile.unpaid_experience_count,
        globalProfile["Count of unpaid/volunteer experiences since high school graduation"],
      ) || "0",
    otherRelevantInformation: readStringWithFallback(
      profile.other_relevant_information,
      candidateProfile.other_relevant_information,
      globalProfile["Any other information that would be relevant"],
    ),
  };
}

export function profileFormToUpdatePayload(form: ProfileFormData): {
  payload: ProfileFullUpdatePayload;
  clubs: string[];
} {
  const firstName = form.firstName.trim();
  const lastName = form.lastName.trim();
  const fullLegalName = form.fullLegalName.trim() || `${firstName} ${lastName}`.trim();
  const preferredName = form.preferredName.trim();
  const pronouns = form.pronouns.trim();
  const expectedGraduationDate = form.expectedGraduationDate.trim();
  const currentYear = form.currentYear.trim();
  const major = form.major.trim();
  const minor = form.minor.trim();
  const concentration = form.concentration.trim();
  const githubUrl = form.githubUrl.trim();
  const linkedinUrl = form.linkedinUrl.trim();
  const clubs = form.clubs.map((club) => club.trim()).filter(Boolean);
  const paidExperienceCount = parseOptionalNumber(form.paidExperienceCount, "Paid experience count");
  const unpaidExperienceCount = parseOptionalNumber(form.unpaidExperienceCount, "Unpaid experience count");
  const gpa = parseOptionalNumber(form.gpa, "GPA", true);
  const otherRelevantInformation = form.otherRelevantInformation.trim();

  if (!firstName || !lastName || !fullLegalName || !expectedGraduationDate || !currentYear || !major || gpa === null || paidExperienceCount === null || unpaidExperienceCount === null) {
    throw new Error("Fill in all required fields before saving.");
  }

  return {
    payload: {
      first_name: firstName,
      last_name: lastName,
      full_legal_name: fullLegalName,
      pronouns,
      expected_graduation_date: expectedGraduationDate,
      current_year: currentYear,
      major,
      minor,
      concentration,
      gpa: form.gpa.trim(),
      github_url: githubUrl,
      linkedin_url: linkedinUrl,
      club: clubs.length > 0 ? joinClubList(clubs) : "",
      past_experience_count: paidExperienceCount ?? undefined,
      unique_experience_count: unpaidExperienceCount ?? undefined,
      other_relevant_information: otherRelevantInformation,
    },
    clubs,
  };
}
