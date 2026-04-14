import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

type AdminPageShellProps = {
  children: ReactNode;
  className?: string;
};

type AdminPageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
};

type AdminSectionCardProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

type AdminKpiTileProps = {
  label: string;
  value: number | string;
  helperText?: string;
  className?: string;
};

type AdminActionLinkProps = {
  children: ReactNode;
  href: string;
  className?: string;
  variant?: "primary" | "secondary";
  block?: boolean;
} & Omit<ComponentProps<"a">, "href" | "className" | "children">;

type AdminEmptyStateProps = {
  title: string;
  message: string;
  className?: string;
};

type AdminErrorBannerProps = {
  message: string;
  onRetry?: () => void;
  className?: string;
};

export function AdminPageShell({ children, className }: AdminPageShellProps) {
  return (
    <div className="min-h-screen bg-[#ececec]">
      <main className={cn("mx-auto max-w-[1200px] px-4 pb-8 pt-24", className)}>
        {children}
      </main>
    </div>
  );
}

export function AdminPageHeader({ title, subtitle, actions, className }: AdminPageHeaderProps) {
  return (
    <header className={cn("mb-5 flex flex-wrap items-start justify-between gap-4", className)}>
      <div>
        <h1 className="text-4xl font-semibold tracking-tight text-[#1f1f1f]">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-[#4e4e4e]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function AdminSectionCard({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: AdminSectionCardProps) {
  return (
    <section className={cn("rounded-lg border border-[#c7c7c7] bg-[#d8d8d8] p-4", className)}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3 border-b border-[#b5b5b5] pb-2">
        <div>
          <h2 className="text-2xl font-semibold text-[#222]">{title}</h2>
          {description ? <p className="mt-1 text-sm text-[#4e4e4e]">{description}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      <div className={cn("space-y-3", bodyClassName)}>{children}</div>
    </section>
  );
}

export function AdminKpiTile({ label, value, helperText, className }: AdminKpiTileProps) {
  return (
    <article className={cn("rounded-lg border border-[#c7c7c7] bg-[#e3e3e3] px-4 py-3", className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-[#4f4f4f]">{label}</p>
      <p className="mt-1 text-3xl font-semibold leading-none text-[#1f1f1f]">{value}</p>
      {helperText ? <p className="mt-2 text-xs text-[#5a5a5a]">{helperText}</p> : null}
    </article>
  );
}

export function AdminActionLink({
  children,
  href,
  className,
  variant = "primary",
  block = false,
  ...props
}: AdminActionLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium no-underline transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        variant === "primary"
          ? "bg-[#1f6f5f] text-white hover:bg-[#18574b] focus-visible:ring-[#1f6f5f]"
          : "border border-[#1f6f5f] bg-[#f4fbf9] text-[#1f6f5f] hover:bg-[#e8f5f1] focus-visible:ring-[#1f6f5f]",
        block ? "w-full" : "w-fit",
        className
      )}
      {...props}
    >
      {children}
    </a>
  );
}

export function AdminEmptyState({ title, message, className }: AdminEmptyStateProps) {
  return (
    <div className={cn("rounded-md border border-dashed border-[#bcbcbc] bg-[#e6e6e6] px-4 py-3", className)}>
      <p className="text-sm font-semibold text-[#2d2d2d]">{title}</p>
      <p className="mt-1 text-sm text-[#555]">{message}</p>
    </div>
  );
}

export function AdminErrorBanner({ message, onRetry, className }: AdminErrorBannerProps) {
  return (
    <div
      role="alert"
      className={cn(
        "mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#c38f8f] bg-[#f6dfdf] px-4 py-3 text-[#6a2424]",
        className
      )}
    >
      <p className="text-sm font-medium">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-[#6a2424] px-3 py-1 text-sm font-medium text-[#6a2424] transition-colors hover:bg-[#f0d2d2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6a2424] focus-visible:ring-offset-2"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
