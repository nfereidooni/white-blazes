import Link from "next/link";
import { Logo } from "./Logo";
import { Avatar } from "./Avatar";
import { Forest } from "./Forest";

export type Tab = "home" | "hikes" | "none";

const TABS: { key: Tab; label: string; href: string }[] = [
  { key: "home", label: "Home", href: "/" },
  { key: "hikes", label: "Hikes", href: "/hikes" },
];

/**
 * The dark forest header: logo, tabs and your avatar (which opens settings).
 * The hero content below the bar (big km number, page title) is passed in
 * as children, so every page shares one frame.
 */
export function SiteHeader({
  active,
  name,
  photo,
  variant = "slim",
  children,
}: {
  active: Tab;
  name: string;
  photo: string | null;
  variant?: "tall" | "slim";
  children?: React.ReactNode;
}) {
  return (
    <header className={`hero hero-${variant}`}>
      <Forest variant={variant} />
      <div className="bar">
        <Link href="/" className="logo-link" aria-label="White Blazes home">
          <Logo />
        </Link>
        <nav aria-label="Main" className="tabs">
          {TABS.map((t) => (
            <Link key={t.key} href={t.href} className="tab" aria-current={t.key === active ? "page" : undefined}>
              {t.label}
            </Link>
          ))}
        </nav>
        <Link href="/settings" className="avatar-link" aria-label={`Settings for ${name}`}>
          <Avatar url={photo} name={name} size={44} />
        </Link>
      </div>
      {children}
    </header>
  );
}

/** Title block for the slim header on inner pages. */
export function HeaderTitle({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div className="hero-body hero-title">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
    </div>
  );
}
