import { useMemo, useState } from "react";

import { acceptDataConsent } from "../api";
import { Header } from "../components/header";

export function ConsentPage() {
  const [checked, setChecked] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const nextPath = useMemo(() => {
    const search = new URLSearchParams(window.location.search);
    return search.get("next") || "/applicant-dashboard";
  }, []);
  const token = localStorage.getItem("auth_access_token") ?? "";

  const onConfirm = async () => {
    if (!checked) {
      setStatusMessage("Please check the consent checkbox before proceeding.");
      return;
    }
    if (!token) {
      setStatusMessage("Session expired. Please sign in again.");
      return;
    }
    try {
      await acceptDataConsent(token);
      window.location.href = nextPath;
    } catch {
      setStatusMessage("Could not record consent right now. Try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#ececec]">
      <Header />
      <main className="mx-auto max-w-[900px] px-4 pb-8 pt-24">
        <section className="rounded border border-[#c7c7c7] bg-white p-5">
          <h1 className="text-3xl font-semibold text-[#1f1f1f]">Data Consent</h1>
          <p className="mt-2 text-sm text-[#333]">
            We collect profile details, application answers, status updates, scores/comments from reviewers, and your
            resume pointer. This data is used for candidate evaluation and recruiting operations. Access is limited to
            authorized admins and relevant platform services.
          </p>
          <label className="mt-4 flex items-start gap-2 text-sm text-[#222]">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            <span>I have read and consent to this data collection and processing policy.</span>
          </label>
          <button
            type="button"
            onClick={() => void onConfirm()}
            className="mt-4 rounded bg-[#1f6f5f] px-4 py-2 text-sm text-white"
          >
            Confirm and Continue
          </button>
          {statusMessage ? <p className="mt-2 text-sm text-[#444]">{statusMessage}</p> : null}
        </section>
      </main>
    </div>
  );
}
