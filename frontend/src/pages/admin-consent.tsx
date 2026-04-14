import { useEffect, useState } from "react";
import { createConsentVersion, getLatestConsent, type ConsentVersionRecord } from "../api";
import { Header } from "../components/header";

export function AdminConsentPage() {
  const [current, setCurrent] = useState<ConsentVersionRecord | null>(null);
  const [newText, setNewText] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const record = await getLatestConsent();
        setCurrent(record);
      } catch {
        // No consent version exists yet
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!newText.trim()) return;
    setSaving(true);
    setStatus("");
    try {
      const record = await createConsentVersion(newText.trim());
      setCurrent(record);
      setNewText("");
      setStatus("Consent text saved.");
    } catch {
      setStatus("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#ececec]">
      <Header />
      <main className="mx-auto max-w-[800px] px-4 pb-6 pt-24 space-y-8">
        <h1 className="text-4xl font-medium text-[#1f1f1f]">Consent Text</h1>

        {current && (
          <section className="rounded-md bg-white p-6 shadow-sm space-y-2">
            <h2 className="text-lg font-semibold text-[#1f1f1f]">Current Version</h2>
            <p className="text-sm text-[#888]">
              Added on {new Date(current.consent_version_created_at).toLocaleString()}
            </p>
            <p className="text-sm text-[#444] whitespace-pre-wrap">{current.consent_text}</p>
          </section>
        )}

        <section className="rounded-md bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-[#1f1f1f]">Add New Version</h2>
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            rows={6}
            placeholder="Enter new consent text..."
            className="w-full rounded-md border border-[#c7c7c7] px-3 py-2 text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#1f6f5f]"
          />
          {status && (
            <p className={`text-sm ${status.startsWith("Failed") ? "text-red-600" : "text-[#1f6f5f]"}`}>
              {status}
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              disabled={saving || !newText.trim()}
              onClick={handleSave}
              className="rounded-md bg-[#1f6f5f] px-5 py-2 text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Consent Text"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
