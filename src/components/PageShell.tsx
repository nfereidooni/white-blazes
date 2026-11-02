import Link from "next/link";
import { Logo } from "./Logo";

/** A simple page frame for forms: dark bar with the logo, then a card. */
export function PageShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="page">
      <header className="hero hero-slim">
        <div className="bar">
          <Link href="/" className="logo-link" aria-label="White Blazes home">
            <Logo />
          </Link>
        </div>
      </header>
      <main className="content narrow">
        <section className="card">
          <h1 className="card-title">{title}</h1>
          {children}
        </section>
      </main>
    </div>
  );
}
