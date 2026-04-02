import { useEffect, useRef, useState } from "react";

import {
  CURRENT_YEAR_OPTIONS,
  GRADUATION_SEMESTER_OPTIONS,
  GRADUATION_YEAR_OPTIONS,
  joinExpectedGraduationDate,
  splitExpectedGraduationDate,
  type ProfileFormData,
} from "./profileFormModel";

type ProfileFieldsFormProps = {
  data: ProfileFormData;
  onChange: (updates: Partial<ProfileFormData>) => void;
};

export function ProfileFieldsForm({ data, onChange }: ProfileFieldsFormProps) {
  const clubInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const fullLegalFromParts = (firstName: string, lastName: string) => `${firstName} ${lastName}`.trim();
  const [graduationYear, setGraduationYear] = useState("");
  const [graduationSemester, setGraduationSemester] = useState("");

  useEffect(() => {
    const parsed = splitExpectedGraduationDate(data.expectedGraduationDate);
    const hasCompleteIncomingValue = Boolean(parsed.year && parsed.semester);
    const incomingIsBlank = !parsed.year && !parsed.semester;
    const localIsBlank = !graduationYear && !graduationSemester;

    if (!hasCompleteIncomingValue && !(incomingIsBlank && localIsBlank)) {
      return;
    }

    if (parsed.year !== graduationYear) {
      setGraduationYear(parsed.year);
    }
    if (parsed.semester !== graduationSemester) {
      setGraduationSemester(parsed.semester);
    }
  }, [data.expectedGraduationDate, graduationYear, graduationSemester]);

  const updateFirstName = (firstName: string) => {
    onChange({
      firstName,
      fullLegalName: fullLegalFromParts(firstName, data.lastName),
    });
  };

  const updateLastName = (lastName: string) => {
    onChange({
      lastName,
      fullLegalName: fullLegalFromParts(data.firstName, lastName),
    });
  };

  const updateGraduation = (year: string, semester: string) => {
    setGraduationYear(year);
    setGraduationSemester(semester);

    if (!year || !semester) {
      onChange({ expectedGraduationDate: "" });
      return;
    }

    onChange({ expectedGraduationDate: joinExpectedGraduationDate(year, semester) });
  };

  const updateClub = (index: number, value: string) => {
    onChange({
      clubs: data.clubs.map((club, clubIndex) => (clubIndex === index ? value : club)),
    });
  };

  const addClub = () => {
    onChange({ clubs: [...data.clubs, ""] });
  };

  const insertClubAfter = (index: number) => {
    onChange({
      clubs: [...data.clubs.slice(0, index + 1), "", ...data.clubs.slice(index + 1)],
    });
    requestAnimationFrame(() => {
      clubInputRefs.current[index + 1]?.focus();
    });
  };

  const removeClub = (index: number) => {
    onChange({
      clubs: data.clubs.filter((_, clubIndex) => clubIndex !== index),
    });
  };

  return (
    <>
      <div className="space-y-4">
        <h2 className="border-b border-[#d8d8d8] pb-2 text-lg font-semibold text-[#1f1f1f]">About Me</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block max-w-md text-sm">
            First name *
            <input
              value={data.firstName}
              onChange={(e) => updateFirstName(e.target.value)}
              className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2"
              required
            />
          </label>

          <label className="block max-w-md text-sm">
            Last name *
            <input
              value={data.lastName}
              onChange={(e) => updateLastName(e.target.value)}
              className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2"
              required
            />
          </label>

          <label className="block max-w-md text-sm">
            Preferred name
            <input
              value={data.preferredName}
              onChange={(e) => onChange({ preferredName: e.target.value })}
              className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2"
            />
          </label>

          <label className="block max-w-md text-sm">
            Pronouns
            <input
              value={data.pronouns}
              onChange={(e) => onChange({ pronouns: e.target.value })}
              className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2"
              placeholder="e.g. she/her"
            />
          </label>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="border-b border-[#d8d8d8] pb-2 text-lg font-semibold text-[#1f1f1f]">Academics</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block max-w-md text-sm">
            Expected graduation date *
            <div className="mt-1 flex flex-wrap gap-2">
              <select
                value={graduationYear}
                onChange={(e) => updateGraduation(e.target.value, graduationSemester)}
                className="w-[8.5rem] rounded border border-[#d0d0d0] px-2 py-1.5 text-sm"
                required
              >
                <option value="">Select year</option>
                {GRADUATION_YEAR_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <select
                value={graduationSemester}
                onChange={(e) => updateGraduation(graduationYear, e.target.value)}
                className="w-[9.5rem] rounded border border-[#d0d0d0] px-2 py-1.5 text-sm"
                required
              >
                <option value="">Select semester</option>
                {GRADUATION_SEMESTER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="block max-w-md text-sm">
            Current year *
            <select
              value={data.currentYear}
              onChange={(e) => onChange({ currentYear: e.target.value })}
              className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2"
              required
            >
              <option value="">Select current year</option>
              {CURRENT_YEAR_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block max-w-md text-sm">
            Major *
            <input
              value={data.major}
              onChange={(e) => onChange({ major: e.target.value })}
              className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2"
              required
            />
          </label>

          <label className="block max-w-md text-sm">
            Minor
            <input
              value={data.minor}
              onChange={(e) => onChange({ minor: e.target.value })}
              className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2"
            />
          </label>

          <label className="block max-w-md text-sm">
            Concentration
            <input
              value={data.concentration}
              onChange={(e) => onChange({ concentration: e.target.value })}
              className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2"
            />
          </label>

          <label className="block max-w-md text-sm">
            GPA *
            <input
              type="number"
              min="0"
              max="4.0"
              step="0.01"
              value={data.gpa}
              onChange={(e) => onChange({ gpa: e.target.value })}
              className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2"
              required
            />
          </label>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="border-b border-[#d8d8d8] pb-2 text-lg font-semibold text-[#1f1f1f]">Experience</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block max-w-md text-sm">
            <span className="flex items-center gap-2">
              <span>Paid co-op/internship count *</span>
              <span className="group relative inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#b8b8b8] text-[10px] text-[#555]">
                ?
                <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-56 -translate-x-1/2 rounded border border-[#d0d0d0] bg-white px-2 py-1 text-xs text-[#333] shadow-sm group-hover:block">
                  Paid co-ops/interships you have completed related to your major
                </span>
              </span>
            </span>
            <input
              type="number"
              min="0"
              value={data.paidExperienceCount}
              onChange={(e) => onChange({ paidExperienceCount: e.target.value })}
              className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2"
              required
            />
          </label>

          <label className="block max-w-md text-sm">
            Unpaid co-op/internship count *
            <input
              type="number"
              min="0"
              value={data.unpaidExperienceCount}
              onChange={(e) => onChange({ unpaidExperienceCount: e.target.value })}
              className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2"
              required
            />
          </label>

          <label className="block max-w-md text-sm">
            GitHub URL
            <input
              type="url"
              value={data.githubUrl}
              onChange={(e) => onChange({ githubUrl: e.target.value })}
              className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2"
            />
          </label>

          <label className="block max-w-md text-sm">
            LinkedIn URL
            <input
              type="url"
              value={data.linkedinUrl}
              onChange={(e) => onChange({ linkedinUrl: e.target.value })}
              className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2"
            />
          </label>
        </div>
      </div>

      <div className="max-w-3xl text-sm">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div>
            <p className="font-medium text-[#1f1f1f]">Clubs and extracurricular activities</p>
            <p className="text-xs text-[#666]">Add one club per row.</p>
          </div>
          <button
            type="button"
            onClick={addClub}
            className="rounded border border-[#b8b8b8] px-3 py-1.5 text-xs text-[#1f1f1f]"
          >
            Add club
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {data.clubs.length === 0 ? (
            <p className="rounded border border-dashed border-[#d0d0d0] px-3 py-3 text-sm text-[#666]">No clubs added yet.</p>
          ) : null}

          {data.clubs.map((club, index) => (
            <div key={`club-${index}`} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                ref={(element) => {
                  clubInputRefs.current[index] = element;
                }}
                value={club}
                onChange={(e) => updateClub(index, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    insertClubAfter(index);
                  }
                }}
                className="w-full rounded border border-[#d0d0d0] px-3 py-2"
                placeholder="Club or extracurricular"
              />
              <button
                type="button"
                onClick={() => removeClub(index)}
                className="rounded border border-[#b8b8b8] px-3 py-2 text-xs text-[#7a1d1d]"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <label className="block max-w-3xl text-sm">
        <p className="font-medium text-[#1f1f1f]">Additional information</p>
        <textarea
          value={data.otherRelevantInformation}
          onChange={(e) => onChange({ otherRelevantInformation: e.target.value })}
          className="mt-1 h-28 w-full rounded border border-[#d0d0d0] px-3 py-2 [font-family:inherit]"
          placeholder="Anything else you'd like reviewers to know (e.g. portfolio, personal website, notable distinctions)"
        />
      </label>
    </>
  );
}
