import { useEffect, useMemo, useState } from "react";

import {
  getAdminJobListings,
  getAdminOpenApplications,
  getAdminPastApplications,
  type AdminJobListingRecord,
  type AdminApplicationRow,
} from "../api";
import { Header } from "../components/header";

export function AdminDashboardPage() {
  const token = localStorage.getItem("auth_access_token") ?? "";
  const [openApplications, setOpenApplications] = useState<AdminApplicationRow[]>([]);
  const [pastApplications, setPastApplications] = useState<AdminApplicationRow[]>([]);
  const [jobListings, setJobListings] = useState<AdminJobListingRecord[]>([]);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const [open, past, listings] = await Promise.all([
          getAdminOpenApplications(),
          getAdminPastApplications(),
          getAdminJobListings(token),
        ]);
        setOpenApplications(open);
        setPastApplications(past);
        setJobListings(listings);
      } catch {
        setOpenApplications([{ job: "Standard SWE", date_posted: "2026-03-08", date_end: "2026-04-30", total_submissions: 10 }]);
        setPastApplications([{ job: "Job 0", date_posted: "2026-01-15", date_end: "2026-02-15" }]);
        setJobListings([]);
      }
    })();
  }, [token]);

  const quickActions = useMemo(() => {
    const now = new Date();
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

    const hasUnpostedJobs = jobListings.some((listing) => !listing.listing_date_posted);

    const hasPostedJobs = jobListings.some((listing) => {
      if (!listing.listing_date_posted) return false;
      const postedAt = new Date(listing.listing_date_posted);
      return !Number.isNaN(postedAt.getTime()) && postedAt <= now;
    });

    const hasRecentlyClosedCycle = pastApplications.some((row) => {
      if (!row.date_end) return false;
      const closedAt = new Date(row.date_end);
      if (Number.isNaN(closedAt.getTime()) || closedAt > now) return false;
      return now.getTime() - closedAt.getTime() <= ninetyDaysMs;
    });

    return {
      canEditUnposted: hasUnpostedJobs,
      canReviewApplicants: hasPostedJobs || hasRecentlyClosedCycle,
    };
  }, [jobListings, pastApplications]);

  return (
    <div className="min-h-screen bg-[#ececec]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-4 pb-6 pt-24">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-5xl font-medium text-[#1f1f1f]">Welcome, {localStorage.getItem("auth_user_name") ?? "User"}!</h1>
          <a
            href="/admin/manage-accounts"
            className="rounded-md bg-[#1f6f5f] px-4 py-2 text-lg text-white no-underline"
          >
            Manage Users
          </a>
        </div>

        <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <section className="border border-[#c7c7c7] bg-[#d8d8d8] p-4 h-[clamp(220px,34vh,360px)]">
            <h2 className="border-b border-[#b5b5b5] pb-1 text-3xl text-[#2d2d2d]">Open Roles</h2>
            <div className="mt-3 space-y-3 text-[22px] text-[#2d2d2d]">
              {openApplications.map((row) => (
                <div key={`${row.job}-${row.date_end ?? ""}`} className="grid grid-cols-[1fr_1fr_1fr]">
                  <a href="/admin/review-applications" className="underline">
                    {row.job}
                  </a>
                  <p className="text-sm">Date posted: {row.date_posted ?? "-"}</p>
                  <p className="text-sm">Date end: {row.date_end ?? "-"}</p>
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
              {quickActions.canEditUnposted ? (
                <a
                  href="/admin/edit-job-post"
                  className="w-fit rounded-md bg-[#1f6f5f] px-4 py-2 text-lg text-white no-underline"
                >
                  Edit Unposted Job Posts
                </a>
              ) : null}
              {quickActions.canReviewApplicants ? (
                <a
                  href="/admin/review-applications"
                  className="w-fit rounded-md bg-[#1f6f5f] px-4 py-2 text-lg text-white no-underline"
                >
                  Review Applicants
                </a>
              ) : null}
            </div>
          </section>
        </div>

        <section className="mt-5 border border-[#c7c7c7] bg-[#d8d8d8] p-4 h-[clamp(180px,26vh,280px)]">
          <h2 className="border-b border-[#b5b5b5] pb-1 text-3xl text-[#2d2d2d]">Past Roles</h2>
          <div className="mt-3 space-y-3 text-[22px] text-[#2d2d2d]">
            {pastApplications.map((row) => (
              <div key={`${row.job}-${row.date_end ?? ""}`} className="grid grid-cols-[1fr_1fr_1fr]">
                <a href="/admin/review-applications" className="underline">
                  {row.job}
                </a>
                <p>Date posted: {row.date_posted ?? "-"}</p>
                <p>Date end: {row.date_end ?? "-"}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
