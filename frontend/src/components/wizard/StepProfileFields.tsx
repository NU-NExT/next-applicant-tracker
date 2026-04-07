import { useState } from "react";
import type { ProfileFullUpdatePayload } from "../../api";
import { ProfileFieldsForm } from "../profile/ProfileFieldsForm";
import { profileFormToUpdatePayload, type ProfileFormData } from "../profile/profileFormModel";

export type { ProfileFormData };

type StepProfileFieldsProps = {
  data: ProfileFormData;
  onChange: (updates: Partial<ProfileFormData>) => void;
  onSaveAndNext: (payload: ProfileFullUpdatePayload, normalizedClubs: string[]) => Promise<void>;
  onBack: () => void;
};

export function StepProfileFields({
  data,
  onChange,
  onSaveAndNext,
  onBack,
}: StepProfileFieldsProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleNext = async () => {
    setError("");
    setSaving(true);
    try {
      const { payload, clubs } = profileFormToUpdatePayload(data);
      await onSaveAndNext(payload, clubs);
    } catch (err) {
      if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError("Failed to save profile. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-semibold text-[#1f1f1f]">Step 2: Profile Information</h2>
      <p className="text-sm text-[#4d4d4d]">
        This information is saved to your profile and reused for future applications.
      </p>

      <div className="space-y-6">
        <ProfileFieldsForm data={data} onChange={onChange} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="rounded-md border border-[#c7c7c7] px-5 py-2 text-[#333]">
          Back
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={handleNext}
          className="rounded-md bg-[#1f6f5f] px-5 py-2 text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : "Next"}
        </button>
      </div>
    </div>
  );
}
