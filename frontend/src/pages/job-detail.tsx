import { useEffect, useState } from "react";
import {
  getJobDataById,
  getPublicJobListingByCycleTitle,
  getPublicJobListingBySlug,
  type JobDataRecord,
  type PublicJobListingRecord,
} from "../api";
import { Header } from "../components/header";
import { slugifyUrlValue } from "../lib/utils";

type JobDetailPageProps = {
  jobId?: string;
  cycleSlug?: string;
  positionTitle?: string;
};

export function JobDetailPage({ jobId, cycleSlug, positionTitle }: JobDetailPageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [job, setJob] = useState<JobDataRecord | null>(null);
  const [listing, setListing] = useState<PublicJobListingRecord | null>(null);
  const normalizedCycleSlug = (cycleSlug ?? "").trim().toLowerCase();
  const normalizedPositionTitle = (positionTitle ?? "").trim();
  const hasCycleAndTitle = normalizedCycleSlug.length > 0 && normalizedPositionTitle.length > 0;
  const normalizedJobId = (jobId ?? "").trim();
  const numericJobId = Number(normalizedJobId);
  const isNumericJobId = Number.isInteger(numericJobId) && numericJobId > 0;

  useEffect(() => {
    const token = localStorage.getItem("auth_access_token");
    if (!token) {
      const nextPath = `${window.location.pathname}${window.location.search}`;
      window.location.href = `/login?next=${encodeURIComponent(nextPath)}`;
      return;
    }

    void (async () => {
      try {
        if (hasCycleAndTitle) {
          const listingData = await getPublicJobListingByCycleTitle(normalizedCycleSlug, normalizedPositionTitle);
          setListing(listingData);
          setJob(null);
        } else if (isNumericJobId) {
          const jobData = await getJobDataById(numericJobId);
          setJob(jobData);
          setListing(null);
        } else {
          const listingData = await getPublicJobListingBySlug(normalizedJobId.toLowerCase());
          setListing(listingData);
          setJob(null);
        }
      } catch {
        setError("Could not load this job.");
      } finally {
        setLoading(false);
      }
    })();
  }, [hasCycleAndTitle, isNumericJobId, normalizedCycleSlug, normalizedJobId, normalizedPositionTitle, numericJobId]);

  const title = listing?.position_title?.trim() || job?.role?.trim() || "Untitled role";
  const description = listing?.description?.trim() || job?.description?.trim() || "No description available.";
  const applyPath = listing?.cycle_slug && listing?.position_title
    ? `/apply/${listing.cycle_slug}/${slugifyUrlValue(listing.position_title)}`
    : isNumericJobId
      ? `/jobs/${normalizedJobId}/apply`
      : `/apply/${normalizedJobId}`;

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
              href={applyPath}
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
