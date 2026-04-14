import { useEffect, useState } from "react";
import { AdminDashboardPage } from "./pages/admin-dashboard";
import { AdminEditJobPostPage } from "./pages/admin-edit-job-post";
import { AdminManageAccountsPage } from "./pages/admin-manage-accounts";
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

  if (path === "/admin/edit-job-post") {
    return <AdminEditJobPostPage />;
  }

  if (path === "/admin/review-applications") {
    return <AdminReviewApplicationsPage />;
  }

  if (path === "/admin/manage-accounts") {
    return <AdminManageAccountsPage />;
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

  if (path === "/apply") {
    const positionCode = searchParams.get("position");
    return <ApplicationWizardPage positionCode={positionCode ?? undefined} />;
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
    return <ApplicationWizardPage jobId={jobApplyMatch[1]} />;
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
          <a href="/admin/edit-job-post">/admin/edit-job-post</a>
        </li>
        <li>
          <a href="/admin/review-applications">/admin/review-applications</a>
        </li>
        <li>
          <a href="/admin/manage-accounts">/admin/manage-accounts</a>
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
