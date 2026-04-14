import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getAdminJobListings,
  getAdminOpenApplications,
  getAdminPastApplications,
  type AdminJobListingRecord,
  type AdminApplicationRow,
} from "../api";
import {
  AdminActionLink,
  AdminEmptyState,
  AdminErrorBanner,
  AdminKpiTile,
  AdminPageHeader,
  AdminPageShell,
  AdminSectionCard,
} from "../components/admin/admin-ui";
import { Header } from "../components/header";

export function AdminDashboardPage() {
  const token = localStorage.getItem("auth_access_token") ?? "";
  const hasSession = token.length > 0;
  const userName = (localStorage.getItem("auth_user_name") ?? "User").trim() || "User";
  const [openApplications, setOpenApplications] = useState<AdminApplicationRow[]>([]);
  const [pastApplications, setPastApplications] = useState<AdminApplicationRow[]>([]);
  const [jobListings, setJobListings] = useState<AdminJobListingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    if (!token) {
      setOpenApplications([]);
      setPastApplications([]);
      setJobListings([]);
      setErrorMessage("No active session found. Please sign in from /login first.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
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
      setOpenApplications([]);
      setPastApplications([]);
      setJobListings([]);
      setErrorMessage("Could not load dashboard data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

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

  const openRoleCount = openApplications.length;
  const totalOpenSubmissions = openApplications.reduce((sum, row) => sum + (row.total_submissions ?? 0), 0);
  const pastRoleCount = pastApplications.length;
  const draftRoleCount = jobListings.filter((listing) => !listing.listing_date_posted).length;

  const availableQuickActions = [
    {
      key: "create-job-post",
      visible: hasSession,
      href: "/build-application",
      label: "Create New Job Post",
    },
    {
      key: "edit-unposted",
      visible: hasSession && quickActions.canEditUnposted,
      href: "/admin/edit-job-post",
      label: "Edit Unposted Job Posts",
    },
    {
      key: "review-applicants",
      visible: hasSession && quickActions.canReviewApplicants,
      href: "/admin/review-applications",
      label: "Review Applicants",
    },
  ].filter((item) => item.visible);

  return (
    <>
      <Header />
      <AdminPageShell>
        <AdminPageHeader
          title={`Welcome, ${userName}`}
          subtitle="Review active hiring cycles, track submission volume, and jump into admin workflows."
          actions={
            <AdminActionLink href="/admin/manage-accounts">
              Manage Users
            </AdminActionLink>
          }
        />

        {errorMessage ? <AdminErrorBanner message={errorMessage} onRetry={() => void loadDashboard()} /> : null}

        <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Dashboard KPIs">
          <AdminKpiTile label="Open Roles" value={openRoleCount} />
          <AdminKpiTile label="Open Submissions" value={totalOpenSubmissions} />
          <AdminKpiTile label="Past Roles" value={pastRoleCount} />
          <AdminKpiTile label="Draft Roles" value={draftRoleCount} />
        </section>

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
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
              ? openApplications.map((row) => (
                  <article key={`${row.job}-${row.date_end ?? ""}`} className="rounded-md border border-[#c7c7c7] bg-[#f3f3f3] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <a
                        href="/admin/review-applications"
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
                      <AdminActionLink href="/admin/review-applications" variant="secondary" className="px-3 py-1 text-xs">
                        Review applicants
                      </AdminActionLink>
                    </div>
                  </article>
                ))
              : null}
          </AdminSectionCard>

          <AdminSectionCard
            title="Quick Actions"
            description="Common tasks for managing listings and applicants."
          >
            {!hasSession ? (
              <AdminEmptyState
                title="Sign in required"
                message="Sign in as an admin to access dashboard actions."
              />
            ) : null}
            {hasSession && availableQuickActions.length === 0 ? (
              <AdminEmptyState
                title="No actions available"
                message="Action links appear when there are draft roles or active/recent review cycles."
              />
            ) : null}
            {availableQuickActions.map((action) => (
              <AdminActionLink key={action.key} href={action.href} block>
                {action.label}
              </AdminActionLink>
            ))}
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
            ? pastApplications.map((row) => (
                <article key={`${row.job}-${row.date_end ?? ""}`} className="rounded-md border border-[#c7c7c7] bg-[#f3f3f3] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <a
                      href="/admin/review-applications"
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
              ))
            : null}
        </AdminSectionCard>
      </AdminPageShell>
    </>
  );
}
