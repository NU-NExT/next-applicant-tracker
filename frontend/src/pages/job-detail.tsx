import { useEffect, useState } from "react";
import { getJobDataById, type JobDataRecord } from "../api";
import { Header } from "../components/header";

type JobDetailPageProps = {
  jobId: string;
};

export function JobDetailPage({ jobId }: JobDetailPageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [job, setJob] = useState<JobDataRecord | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("auth_access_token");
    if (!token) {
      window.location.href = `/jobs/${jobId}/login`;
      return;
    }

    const numericJobId = Number(jobId);
    if (!Number.isInteger(numericJobId) || numericJobId <= 0) {
      setError("Invalid job ID.");
      setLoading(false);
      return;
    }

    void (async () => {
      try {
        const jobData = await getJobDataById(numericJobId);
        setJob(jobData);
      } catch {
        setError("Could not load this job.");
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId]);

  const title = job?.role?.trim() || "Untitled role";
  const description = job?.description?.trim() || "No description available.";

  return (
    <div className="min-h-screen bg-[#efefef]">
      <Header />

      <main className="mx-auto max-w-[1100px] px-4 pb-8 pt-24">
        <section className="py-2">
          <h1 className="text-4xl font-semibold text-[#1f1f1f]">{title}</h1>
          <div className="mt-3 h-[2px] w-full bg-[#1f6f5f]" />
          {loading ? <p className="mt-3 text-lg leading-8 text-[#2d2d2d]">Loading job description...</p> : null}
          {!loading && error ? <p className="mt-3 text-lg leading-8 text-[#2d2d2d]">{error}</p> : null}
          {!loading && !error ? <p className="mt-3 text-lg leading-8 text-[#2d2d2d]">{description}</p> : null}
          <div className="mt-6 flex justify-end">
            <a
              href={`/jobs/${jobId}/apply`}
              className="inline-flex rounded-md bg-[#1f6f5f] px-5 py-2 text-lg text-white no-underline"
            >
              Apply
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
