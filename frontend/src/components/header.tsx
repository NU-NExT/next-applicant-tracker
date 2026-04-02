import { CircleUserRound, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { getMyProfile } from "../api";

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
  const [identityLabel, setIdentityLabel] = useState("");
  const headerRef = useRef<HTMLElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(64);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

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
    if (!profileMenuOpen) return;
    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (profileMenuRef.current?.contains(target)) return;
      setProfileMenuOpen(false);
    };
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileMenuOpen(false);
    };
    window.addEventListener("mousedown", onClickOutside);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("keydown", onEsc);
    };
  }, [profileMenuOpen]);

  const logout = () => {
    localStorage.removeItem("auth_access_token");
    localStorage.removeItem("auth_id_token");
    localStorage.removeItem("auth_refresh_token");
    localStorage.removeItem("auth_user_name");
    localStorage.removeItem("auth_user_email");
    localStorage.removeItem("auth_is_admin");
    setIsLoggedIn(false);
    setIdentityLabel("");
    setProfileMenuOpen(false);
    window.location.href = "/";
  };

  useEffect(() => {
    let cancelled = false;

    const syncAuthState = async () => {
      const token = localStorage.getItem("auth_access_token");
      const loggedIn = Boolean(token);
      setIsLoggedIn(loggedIn);
      if (!loggedIn) {
        setIdentityLabel("");
        return;
      }

      const cachedName = (localStorage.getItem("auth_user_name") ?? "").trim();
      const cachedEmail = (localStorage.getItem("auth_user_email") ?? "").trim();
      const cachedIdentity = cachedName || cachedEmail;
      if (cachedIdentity) {
        setIdentityLabel(cachedIdentity);
      }

      if (!token) return;
      try {
        const profile = await getMyProfile(token);
        if (cancelled) return;
        const nextName = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || profile.email;
        setIdentityLabel(nextName);
        localStorage.setItem("auth_user_name", nextName);
        localStorage.setItem("auth_user_email", profile.email);
      } catch {
        // If token is stale/invalid, clear auth state for consistent header behavior.
        if (cancelled) return;
        setIsLoggedIn(false);
        setIdentityLabel("");
        localStorage.removeItem("auth_access_token");
        localStorage.removeItem("auth_id_token");
        localStorage.removeItem("auth_refresh_token");
        localStorage.removeItem("auth_user_name");
        localStorage.removeItem("auth_user_email");
        localStorage.removeItem("auth_is_admin");
      }
    };

    void syncAuthState();

    const onStorage = () => {
      void syncAuthState();
    };
    const onFocus = () => {
      void syncAuthState();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
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
          <span className="text-[1.4rem] font-bold text-white">NExT Consulting | Apply</span>
        </a>

        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <div ref={profileMenuRef} className="relative flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 border-none bg-transparent px-2 text-white transition hover:bg-white/10"
                aria-label="Account menu"
                title={identityLabel || "Account menu"}
                aria-expanded={profileMenuOpen}
                onClick={() => setProfileMenuOpen((prev) => !prev)}
              >
                {identityLabel ? (
                  <span className="hidden items-center text-xs leading-none text-white/90 md:inline-flex">{identityLabel}</span>
                ) : null}
                <CircleUserRound className="h-5 w-5" />
              </button>
              <AnimatePresence>
                {profileMenuOpen ? (
                  <motion.div
                    className="absolute right-0 top-11 w-full bg-black text-white shadow-lg"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    <a
                      href="/profile"
                      className="block px-3 py-2 text-sm text-white no-underline transition hover:bg-white/10"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      My profile
                    </a>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm text-white transition hover:bg-white/10"
                      onClick={logout}
                    >
                      Logout
                    </button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ) : (
            <a
              href="/login"
              className="rounded px-3 py-1.5 text-sm text-white no-underline transition hover:bg-white/10"
            >
              Login
            </a>
          )}
        </div>
      </nav>

      
    </header>
  );
}
