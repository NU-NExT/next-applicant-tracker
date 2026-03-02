import { Header } from "./components/header";

export function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#f2f3f4]">
      <Header />

      <main className="mx-auto max-w-[1140px] px-4 py-5 pt-24">
        <div className="grid grid-cols-[2fr_1fr] gap-[18px]">
          <Card title="My Tasks" height={220} />
          <Card title="About NExT" height={400} />
          <Card title="My Applications" height={160} />
        </div>
      </main>
    </div>
  );
}

type CardProps = {
  title: string;
  height: number;
};

function Card({ title, height }: CardProps) {
  return (
    <section className="box-border rounded-[2px] border border-[#d7d7d7] bg-white p-3" style={{ height }}>
      <h2 className="m-0 text-[28px] leading-[1.1] font-medium text-[#2d2d2d]">{title}</h2>
      <div className="mt-2 h-[calc(100%-40px)] border-t border-[#d9d9d9]" />
    </section>
  );
}
