import { useEffect, useState } from "react";
import { AdminDashboardPage } from "./pages/admin-dashboard";
import { ApplicantDashboardPage } from "./pages/applicant-dashboard";
import { DashboardPage } from "./pages/dashboard";
import { JobBoardPage } from "./pages/job-board";
import { LoginPage } from "./pages/login";

function normalizePath(pathname: string): string {
  return pathname.replace(/\/+$/, "") || "/";
}

export function App() {
  const [path, setPath] = useState(() => normalizePath(window.location.pathname));

  useEffect(() => {
    const syncRoute = () => setPath(normalizePath(window.location.pathname));
    window.addEventListener("popstate", syncRoute);

    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  if (path === "/login" || path === "/") {
    return <LoginPage />;
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

  if (path === "/applicant-dashboard") {
    return <ApplicantDashboardPage />;
  }

  return (
    <main className="min-h-screen bg-[#f4f5f6] p-8">
      <h1 className="text-2xl font-semibold">Route not found</h1>
      <p>Available mockup routes:</p>
      <ul className="list-inside list-disc">
        <li>
          <a href="/login">/login</a>
        </li>
        <li>
          <a href="/job-board">/job-board</a>
        </li>
        <li>
          <a href="/dashboard">/dashboard</a>
        </li>
        <li>
          <a href="/admin-dashboard">/admin-dashboard</a>
        </li>
        <li>
          <a href="/applicant-dashboard">/applicant-dashboard</a>
        </li>
      </ul>
    </main>
  );
}
