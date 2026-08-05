import Link from "next/link";
import type { ReactNode } from "react";

const VARIANT_STYLES = {
  success: { border: "border-toxic", text: "text-toxic", icon: "✓" },
  pending: { border: "border-ash", text: "text-ash", icon: "…" },
  error: { border: "border-gore", text: "text-gore", icon: "✕" },
} as const;

export function StatusPage({
  variant,
  title,
  message,
  cta,
}: {
  variant: keyof typeof VARIANT_STYLES;
  title: string;
  message: string;
  cta?: ReactNode;
}) {
  const styles = VARIANT_STYLES[variant];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ink px-6 py-20 text-center">
      <div
        className={`mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 text-3xl ${styles.border} ${styles.text}`}
      >
        {styles.icon}
      </div>
      <h1 className="mb-3 font-display text-3xl text-bone">{title}</h1>
      <p className="mb-8 max-w-md text-[15px] text-ashLight">{message}</p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        {cta}
        <Link
          href="/"
          className="clip-notch-sm border-2 border-ash px-6 py-3 text-sm font-bold uppercase tracking-wide text-bone no-underline transition-colors hover:border-toxic hover:text-toxic"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
