import { useEffect, useState } from "react";
import { AdminApplicantStatsPage } from "./pages/admin-applicant-stats";
import { AdminDashboardPage } from "./pages/admin-dashboard";
import { AdminEditJobPostPage } from "./pages/admin-edit-job-post";
import { AdminPositionsPage } from "./pages/admin-positions";
import { AdminReviewApplicationsPage } from "./pages/admin-review-applications";
import { ApplicantDashboardPage } from "./pages/applicant-dashboard";
import { AuthChooseAccountPage } from "./pages/auth-choose-account";
import { BuildApplicationPage } from "./pages/build-application";
import { ConsentPage } from "./pages/consent";
import { DashboardPage } from "./pages/dashboard";
import { JobDetailPage } from "./pages/job-detail";
import { JobBoardPage } from "./pages/job-board";
import { LoginPage } from "./pages/login";
import { ProfilePage } from "./pages/profile";
import { ApplicationWizardPage } from "./pages/application-wizard";

function normalizePath(pathname: string): string {
  return pathname.replace(/\/+$/, "") || "/";
}

export function App() {
  const [path, setPath] = useState(() => normalizePath(window.location.pathname));
  const searchParams = new URLSearchParams(window.location.search);

  useEffect(() => {
    const syncRoute = () => setPath(normalizePath(window.location.pathname));
    window.addEventListener("popstate", syncRoute);

    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  if (path === "/") {
    return <JobBoardPage />;
  }

  if (path === "/login") {
    const jobIdFromQuery = searchParams.get("job");
    return <LoginPage jobId={jobIdFromQuery ?? undefined} />;
  }

  if (path === "/job-board") {
    return <JobBoardPage />;
  }

  if (path === "/dashboard") {
    return <DashboardPage />;
  }

  if (path === "/admin-dashboard") {
    return <AdminDashboardPage />;
  }

  if (path === "/admin/applicant-stats") {
    return <AdminApplicantStatsPage />;
  }

  if (path === "/admin/edit-job-post") {
    return <AdminEditJobPostPage />;
  }

  if (path === "/admin/review-applications") {
    return <AdminReviewApplicationsPage />;
  }

  if (path === "/admin/positions") {
    return <AdminPositionsPage />;
  }

  if (path === "/applicant-dashboard") {
    return <ApplicantDashboardPage />;
  }

  if (path === "/build-application") {
    return <BuildApplicationPage />;
  }

  if (path === "/auth/choose-account") {
    return <AuthChooseAccountPage />;
  }

  if (path === "/jobs") {
    const cycleSlug = searchParams.get("cycle");
    const positionTitle = searchParams.get("title");
    return <JobDetailPage cycleSlug={cycleSlug ?? undefined} positionTitle={positionTitle ?? undefined} />;
  }

  if (path === "/apply") {
    const cycleSlug = searchParams.get("cycle");
    const positionTitle = searchParams.get("title");
    if (cycleSlug && positionTitle) {
      return <ApplicationWizardPage cycleSlug={cycleSlug} positionTitle={positionTitle} />;
    }
    const positionCode = searchParams.get("position");
    return <ApplicationWizardPage positionCode={positionCode ?? undefined} />;
  }

  const applyCycleTitleMatch = path.match(/^\/apply\/([^/]+)\/([^/]+)$/);
  if (applyCycleTitleMatch) {
    return <ApplicationWizardPage cycleSlug={applyCycleTitleMatch[1]} positionTitle={applyCycleTitleMatch[2]} />;
  }

  const applySlugMatch = path.match(/^\/apply\/([^/]+)$/);
  if (applySlugMatch) {
    return <ApplicationWizardPage listingSlug={applySlugMatch[1]} />;
  }

  if (path === "/profile") {
    return <ProfilePage />;
  }

  if (path === "/consent") {
    return <ConsentPage />;
  }

  const jobLoginMatch = path.match(/^\/jobs\/([^/]+)\/login$/);
  if (jobLoginMatch) {
    return <LoginPage jobId={jobLoginMatch[1]} />;
  }

  const jobApplyMatch = path.match(/^\/jobs\/([^/]+)\/apply$/);
  if (jobApplyMatch) {
    const rawIdentifier = jobApplyMatch[1];
    const isNumericIdentifier = /^\d+$/.test(rawIdentifier);
    return isNumericIdentifier
      ? <ApplicationWizardPage jobId={rawIdentifier} />
      : <ApplicationWizardPage listingSlug={rawIdentifier} />;
  }

  const jobCycleTitleMatch = path.match(/^\/jobs\/([^/]+)\/([^/]+)$/);
  if (jobCycleTitleMatch) {
    return <JobDetailPage cycleSlug={jobCycleTitleMatch[1]} positionTitle={jobCycleTitleMatch[2]} />;
  }

  const jobDetailMatch = path.match(/^\/jobs\/([^/]+)$/);
  if (jobDetailMatch) {
    return <JobDetailPage jobId={jobDetailMatch[1]} />;
  }

  return (
    <main className="min-h-screen bg-[#f4f5f6] p-8">
      <h1 className="text-2xl font-semibold">Route not found</h1>
      <p>Available mockup routes:</p>
      <ul className="list-inside list-disc">
        <li>
          <a href="/">/</a>
        </li>
        <li>
          <a href="/login">/login</a>
        </li>
        <li>
          <a href="/dashboard">/dashboard</a>
        </li>
        <li>
          <a href="/admin-dashboard">/admin-dashboard</a>
        </li>
        <li>
          <a href="/admin/applicant-stats">/admin/applicant-stats</a>
        </li>
        <li>
          <a href="/admin/edit-job-post">/admin/edit-job-post</a>
        </li>
        <li>
          <a href="/admin/review-applications">/admin/review-applications</a>
        </li>
        <li>
          <a href="/applicant-dashboard">/applicant-dashboard</a>
        </li>
        <li>
          <a href="/build-application">/build-application</a>
        </li>
        <li>
          <a href="/auth/choose-account">/auth/choose-account</a>
        </li>
        <li>
          <a href="/jobs/fall-2026/software-engineer">/jobs/fall-2026/software-engineer</a>
        </li>
        <li>
          <a href="/jobs/1/login">/jobs/1/login</a>
        </li>
        <li>
          <a href="/apply/fall-2026/software-engineer">/apply/fall-2026/software-engineer</a>
        </li>
      </ul>
    </main>
  );
}
