import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type MenuSection = {
  title: string;
  links: Array<{ label: string; href: string }>;
};

const sections: MenuSection[] = [
  {
    title: "About",
    links: [
      { label: "About Us", href: "/about#about" },
      { label: "Our History", href: "/about#history" },
      { label: "Our Values", href: "/about#values" },
    ],
  },
  {
    title: "Projects",
    links: [
      { label: "Types of Projects", href: "/projects#project-types" },
      { label: "Our Projects", href: "/projects#our-projects" },
    ],
  },
  {
    title: "Team",
    links: [
      { label: "Leadership", href: "/team#leadership" },
      { label: "Consultants", href: "/team#consultants" },
    ],
  },
  {
    title: "Contact",
    links: [
      { label: "For Clients", href: "/contact#clients" },
      { label: "For Applicants", href: "/contact#applicants" },
    ],
  },
  {
    title: "Careers",
    links: [
      { label: "Open Roles", href: "/job-board" },
    ],
  },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(64);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const updateHeight = () => setHeaderHeight(header.getBoundingClientRect().height);
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(header);
    window.addEventListener("resize", updateHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, []);

  return (
    <header
      ref={headerRef}
      className="fixed top-0 z-50 w-full border-b-2 border-emerald-700 bg-black text-white"
    >
      <nav aria-label="Main navigation" className="mx-auto flex h-16 items-center justify-between px-4">
        <a href="/" className="flex items-center gap-3 no-underline">
          <img src="/img/NExT Logo Solo.svg" alt="NExT Consulting Logo" className="h-[50px] w-auto object-contain" />
          <span className="text-[1.4rem] font-bold text-white">NExT Consulting</span>
        </a>

        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded border border-white/70 bg-transparent text-white transition hover:bg-white/10"
          aria-label="Toggle Menu"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <div
        aria-label="Navigation menu"
        className={`absolute left-0 w-full overflow-y-auto border-t-2 border-emerald-700 bg-black/95 transition-all duration-300 ease-out ${
          open ? "translate-y-0 opacity-100 visible" : "-translate-y-6 opacity-0 invisible"
        }`}
        style={{ top: `${headerHeight}px`, maxHeight: `calc(100vh - ${headerHeight}px)` }}
      >
        <div className="mx-auto grid max-w-[1200px] gap-6 px-6 py-6 md:grid-cols-3 lg:grid-cols-5">
          {sections.map((section) => (
            <div key={section.title} className="flex flex-col">
              <a href={section.links[0]?.href ?? "#"} className="mb-3 border-b border-white/30 pb-2 text-lg font-semibold">
                {section.title}
              </a>
              <div className="flex flex-col gap-2">
                {section.links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="rounded-none px-3 py-1.5 text-sm text-white/90 transition hover:bg-white/10"
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
