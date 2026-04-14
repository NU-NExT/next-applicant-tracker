import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getAdminOpenApplications,
  getAdminPastApplications,
  type AdminApplicationRow,
} from "../api";
import {
  AdminActionLink,
  AdminEmptyState,
  AdminErrorBanner,
  AdminPageHeader,
  AdminPageShell,
  AdminSectionCard,
} from "../components/admin/admin-ui";
import { Header } from "../components/header";
import { slugifyUrlValue } from "../lib/utils";

export function AdminDashboardPage() {
  const token = localStorage.getItem("auth_access_token") ?? "";
  const userName = (localStorage.getItem("auth_user_name") ?? "User").trim() || "User";
  const [openApplications, setOpenApplications] = useState<AdminApplicationRow[]>([]);
  const [pastApplications, setPastApplications] = useState<AdminApplicationRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    if (!token) {
      setOpenApplications([]);
      setPastApplications([]);
      setErrorMessage("No active session found. Please sign in from /login first.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    try {
      const [open, past] = await Promise.all([getAdminOpenApplications(), getAdminPastApplications()]);
      setOpenApplications(open);
      setPastApplications(past);
    } catch {
      setOpenApplications([]);
      setPastApplications([]);
      setErrorMessage("Could not load dashboard data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      }),
    []
  );

  const formatDate = (rawDate: string | undefined) => {
    if (!rawDate) return "—";
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return rawDate;
    return dateFormatter.format(parsed);
  };

  const buildReviewHref = (row: AdminApplicationRow) => {
    const cycleSlug = (row.cycle_slug ?? "").trim() || "uncategorized";
    const positionSlug = (row.position_slug ?? "").trim() || slugifyUrlValue(row.job);
    return `/admin/review-applications/${cycleSlug}/${positionSlug}`;
  };

  return (
    <>
      <Header />
      <AdminPageShell>
        <AdminPageHeader
          title={`Welcome, ${userName}`}
          subtitle=""
          actions={
            <>
              <AdminActionLink href="/admin/manage-accounts">
                Manage Users
              </AdminActionLink>
              <AdminActionLink href="/admin/positions">
                Manage Positions
              </AdminActionLink>
            </>
          }
        />

        {errorMessage ? <AdminErrorBanner message={errorMessage} onRetry={() => void loadDashboard()} /> : null}

        <div className="grid gap-4">
          <AdminSectionCard
            title="Open Roles"
            description="Live listings with submission volume and cycle dates."
            bodyClassName="max-h-[460px] overflow-auto pr-1"
          >
            {isLoading ? <p className="text-sm text-[#4d4d4d]">Loading open roles...</p> : null}
            {!isLoading && openApplications.length === 0 ? (
              <AdminEmptyState
                title="No open roles"
                message="Published roles will appear here once their listing window is active."
              />
            ) : null}
            {!isLoading
              ? openApplications.map((row) => {
                  const reviewHref = buildReviewHref(row);
                  return (
                  <article key={`${row.listing_id ?? row.job}-${row.date_end ?? ""}`} className="rounded-md border border-[#c7c7c7] bg-[#f3f3f3] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <a
                        href={reviewHref}
                        className="text-lg font-semibold text-[#1f1f1f] no-underline hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6f5f] focus-visible:ring-offset-2"
                      >
                        {row.job}
                      </a>
                      <span className="rounded-full bg-[#e4f2ef] px-2 py-0.5 text-xs font-semibold text-[#1f6f5f]">
                        {row.total_submissions ?? 0} submissions
                      </span>
                    </div>
                    <div className="mt-2 grid gap-1 text-xs text-[#4e4e4e] sm:grid-cols-2">
                      <p>Posted: {formatDate(row.date_posted)}</p>
                      <p>Closes: {formatDate(row.date_end)}</p>
                    </div>
                    <div className="mt-2">
                      <AdminActionLink href={reviewHref} variant="secondary" className="px-3 py-1 text-xs">
                        Review applicants
                      </AdminActionLink>
                    </div>
                  </article>
                  );
                })
              : null}
          </AdminSectionCard>
        </div>

        <AdminSectionCard
          className="mt-5"
          title="Past Roles"
          description="Recently closed listings available for review history."
        >
          {isLoading ? <p className="text-sm text-[#4d4d4d]">Loading past roles...</p> : null}
          {!isLoading && pastApplications.length === 0 ? (
            <AdminEmptyState
              title="No past roles"
              message="Closed role cycles will appear here after listing end dates pass."
            />
          ) : null}
          {!isLoading
            ? pastApplications.map((row) => {
                const reviewHref = buildReviewHref(row);
                return (
                <article key={`${row.listing_id ?? row.job}-${row.date_end ?? ""}`} className="rounded-md border border-[#c7c7c7] bg-[#f3f3f3] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <a
                      href={reviewHref}
                      className="text-lg font-semibold text-[#1f1f1f] no-underline hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6f5f] focus-visible:ring-offset-2"
                    >
                      {row.job}
                    </a>
                    <span className="text-xs font-medium uppercase tracking-wide text-[#5b5b5b]">Closed Cycle</span>
                  </div>
                  <div className="mt-2 grid gap-1 text-xs text-[#4e4e4e] sm:grid-cols-2">
                    <p>Posted: {formatDate(row.date_posted)}</p>
                    <p>Closed: {formatDate(row.date_end)}</p>
                  </div>
                </article>
                );
              })
            : null}
        </AdminSectionCard>
      </AdminPageShell>
    </>
  );
}
