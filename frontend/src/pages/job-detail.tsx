import { Header } from "../components/header";

type JobDetailPageProps = {
  jobId: string;
};

export function JobDetailPage({ jobId }: JobDetailPageProps) {
  return (
    <div className="min-h-screen bg-[#efefef]">
      <Header />

      <main className="mx-auto max-w-[1100px] px-4 pb-8 pt-24">
        <section className="rounded-md border border-[#c7c7c7] bg-[#d8d8d8] p-6">
          <h1 className="text-4xl font-semibold text-[#1f1f1f]">Job {jobId}</h1>
          <p className="mt-3 text-lg leading-8 text-[#2d2d2d]">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et
            dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex
            ea commodo consequat.
          </p>
          <a
            href={`/jobs/${jobId}/apply`}
            className="mt-6 inline-flex rounded-md bg-[#1f6f5f] px-5 py-2 text-lg text-white no-underline"
          >
            Apply
          </a>
        </section>
      </main>
    </div>
  );
}
