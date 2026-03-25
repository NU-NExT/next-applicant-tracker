import { CircleUserRound, Menu, X } from "lucide-react";
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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

  useEffect(() => {
    setIsLoggedIn(Boolean(localStorage.getItem("auth_access_token")));
  }, []);

  return (
    <header
      ref={headerRef}
      className="fixed top-0 z-50 w-full border-b-2 border-emerald-700 bg-black text-white"
    >
      <nav aria-label="Main navigation" className="mx-auto flex h-16 items-center justify-between px-4">
        <a href="/" className="flex items-center gap-3 no-underline">
          <img src="/img/NExT Logo Solo.svg" alt="NExT Consulting Logo" className="h-[50px] w-auto object-contain" />
          <span className="text-[1.4rem] font-bold text-white">NExT Consulting | Apply</span>
        </a>

        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <a
              href="/profile"
              className="grid h-9 w-9 place-items-center rounded border border-white/70 bg-transparent text-white transition hover:bg-white/10"
              aria-label="My profile"
              title="My profile"
            >
              <CircleUserRound className="h-5 w-5" />
            </a>
          ) : null}
          <a
            href="/login?admin=1"
            className="rounded border border-white/70 px-3 py-1.5 text-sm text-white no-underline transition hover:bg-white/10"
          >
            Login
          </a>
        </div>
      </nav>

      
    </header>
  );
}
