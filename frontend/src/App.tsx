import React, { useEffect, useState } from "react";
import { AdminApplicantStatsPage } from "./pages/admin-applicant-stats";
import { AdminDashboardPage } from "./pages/admin-dashboard";
import { AdminEditJobPostPage } from "./pages/admin-edit-job-post";
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
import { Footer } from "./components/Footer";

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

  let page: React.ReactNode;

  if (path === "/") {
    page = <JobBoardPage />;
  } else if (path === "/login") {
    const jobIdFromQuery = searchParams.get("job");
    page = <LoginPage jobId={jobIdFromQuery ?? undefined} />;
  } else if (path === "/job-board") {
    page = <JobBoardPage />;
  } else if (path === "/dashboard") {
    page = <DashboardPage />;
  } else if (path === "/admin-dashboard") {
    page = <AdminDashboardPage />;
  } else if (path === "/admin/applicant-stats") {
    page = <AdminApplicantStatsPage />;
  } else if (path === "/admin/edit-job-post") {
    page = <AdminEditJobPostPage />;
  } else if (path === "/admin/review-applications") {
    page = <AdminReviewApplicationsPage />;
  } else if (path === "/applicant-dashboard") {
    page = <ApplicantDashboardPage />;
  } else if (path === "/build-application") {
    page = <BuildApplicationPage />;
  } else if (path === "/auth/choose-account") {
    page = <AuthChooseAccountPage />;
  } else if (path === "/apply") {
    const positionCode = searchParams.get("position");
    page = <ApplicationWizardPage positionCode={positionCode ?? undefined} />;
  } else if (path === "/profile") {
    page = <ProfilePage />;
  } else if (path === "/consent") {
    page = <ConsentPage />;
  } else {
    const jobLoginMatch = path.match(/^\/jobs\/([^/]+)\/login$/);
    const jobApplyMatch = path.match(/^\/jobs\/([^/]+)\/apply$/);
    const jobDetailMatch = path.match(/^\/jobs\/([^/]+)$/);

    if (jobLoginMatch) {
      page = <LoginPage jobId={jobLoginMatch[1]} />;
    } else if (jobApplyMatch) {
      page = <ApplicationWizardPage jobId={jobApplyMatch[1]} />;
    } else if (jobDetailMatch) {
      page = <JobDetailPage jobId={jobDetailMatch[1]} />;
    } else {
      page = (
        <main className="flex-1 bg-[#f4f5f6] p-8">
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
              <a href="/jobs/1">/jobs/1</a>
            </li>
            <li>
              <a href="/jobs/1/login">/jobs/1/login</a>
            </li>
            <li>
              <a href="/jobs/1/apply">/jobs/1/apply</a>
            </li>
          </ul>
        </main>
      );
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {page}
      <Footer />
    </div>
  );
}
