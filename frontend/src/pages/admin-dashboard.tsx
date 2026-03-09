import { useEffect, useState } from "react";

import {
  getAdminOpenApplications,
  getAdminPastApplications,
  type AdminApplicationRow,
} from "../api";
import { Header } from "../components/header";

export function AdminDashboardPage() {
  const [openApplications, setOpenApplications] = useState<AdminApplicationRow[]>([]);
  const [pastApplications, setPastApplications] = useState<AdminApplicationRow[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const [open, past] = await Promise.all([getAdminOpenApplications(), getAdminPastApplications()]);
        setOpenApplications(open);
        setPastApplications(past);
      } catch {
        setOpenApplications([{ job: "Standard SWE", status: "submitted", date_opened: "2026-03-08", total_submissions: 10 }]);
        setPastApplications([{ job: "Job 0", status: "closed", date_closed: "2026-02-15" }]);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#ececec]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-4 pb-6 pt-24">
        <h1 className="mb-4 text-5xl font-medium text-[#1f1f1f]">Welcome, JCD!</h1>

        <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <section className="border border-[#c7c7c7] bg-[#d8d8d8] p-4 h-[clamp(220px,34vh,360px)]">
            <h2 className="border-b border-[#b5b5b5] pb-1 text-3xl text-[#2d2d2d]">Open Roles</h2>
            <div className="mt-3 space-y-3 text-[22px] text-[#2d2d2d]">
              {openApplications.map((row) => (
                <div key={`${row.job}-${row.date_opened}`} className="grid grid-cols-[1.2fr_1fr_1fr]">
                  <a href="/admin/review-applications" className="underline">
                    {row.job}
                  </a>
                  <p className="underline">{row.status}</p>
                  <p className="underline">{row.date_opened ?? "-"}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="border border-[#c7c7c7] bg-[#d8d8d8] p-4 h-[clamp(220px,34vh,360px)]">
            <h2 className="border-b border-[#b5b5b5] pb-1 text-3xl text-[#2d2d2d]">Quick Actions</h2>
            <div className="mt-4 flex flex-col gap-3">
              <a
                href="/build-application"
                className="w-fit rounded-md bg-[#1f6f5f] px-4 py-2 text-lg text-white no-underline"
              >
                Create New Job Post
              </a>
              <a
                href="/admin/applicant-stats"
                className="w-fit rounded-md bg-[#1f6f5f] px-4 py-2 text-lg text-white no-underline"
              >
                View Fall 2025 Applicant Stats
              </a>
              <a
                href="/admin/edit-job-post"
                className="w-fit rounded-md bg-[#1f6f5f] px-4 py-2 text-lg text-white no-underline"
              >
                Edit a Job Post
              </a>
              <a
                href="/admin/review-applications"
                className="w-fit rounded-md bg-[#1f6f5f] px-4 py-2 text-lg text-white no-underline"
              >
                Review Applications for [JOB 1]
              </a>
            </div>
          </section>
        </div>

        <section className="mt-5 border border-[#c7c7c7] bg-[#d8d8d8] p-4 h-[clamp(180px,26vh,280px)]">
          <h2 className="border-b border-[#b5b5b5] pb-1 text-3xl text-[#2d2d2d]">Past Applications</h2>
          <div className="mt-3 space-y-3 text-[22px] text-[#2d2d2d]">
            {pastApplications.map((row) => (
              <div key={`${row.job}-${row.date_closed}`} className="grid grid-cols-[1.4fr_1fr_1fr] gap-x-6">
                <p>{row.job}</p>
                <p>{row.status}</p>
                <p>{row.date_closed ?? "-"}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
