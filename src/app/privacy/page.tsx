import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Forest } from "@/components/Forest";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = { title: "Privacy · White Blazes" };

// DRAFT. Placeholders in [brackets] need filling before launch, and this
// should be read over by someone who knows Canadian privacy law (PIPEDA).
export default function PrivacyPage() {
  return (
    <div className="page">
      <header className="hero hero-slim">
        <Forest variant="slim" />
        <div className="bar">
          <Link href="/" className="logo-link" aria-label="White Blazes home">
            <Logo />
          </Link>
        </div>
        <div className="hero-body hero-title">
          <p className="eyebrow">Last updated [date]</p>
          <h1>Privacy</h1>
        </div>
      </header>

      <main className="content content-inner narrow">
        <article className="card prose">
          <p>
            White Blazes is a personal project by Niki Fereidooni for tracking hikes on the Bruce Trail. This page explains
            what it stores about you, who can see it, and how to get it back or delete it.
          </p>

          <h2>What we store</h2>
          <ul>
            <li>
              <strong>Your email address</strong>, to send you sign-in links.
            </li>
            <li>
              <strong>Your hikes</strong>: date, name, distance, which stretches of the trail they covered (as km ranges),
              and any details you add, such as notes, who you hiked with, hike leaders, start and end points, and links.
            </li>
            <li>
              <strong>Your profile</strong>: display name, goal, home clubs, gap setting and, if you add one, a profile
              photo.
            </li>
          </ul>

          <h2>What we don&rsquo;t store</h2>
          <ul>
            <li>
              <strong>GPS tracks.</strong> GPX files and Strava archives are read in your browser. Only the trail km they
              matched and a fingerprint (used to catch duplicates) are saved. The files and their GPS points never leave
              your device.
            </li>
            <li>
              <strong>Passwords.</strong> There aren&rsquo;t any; you sign in with an emailed link.
            </li>
            <li>
              <strong>Tracking.</strong> No advertising, analytics or tracking cookies. The only cookies keep you signed in.
            </li>
          </ul>

          <h2>Who can see it</h2>
          <p>
            Only you. The database checks every request against your login, so other people using White Blazes can&rsquo;t
            read your hikes.
          </p>
          <p>
            If you turn on your share link, anyone with the link can see your km per section and a map of the stretches
            you&rsquo;ve covered. They can&rsquo;t see your individual hikes, dates, notes or start points. Your photo and goal
            appear there only if you choose. Turning the link off hides the page.
          </p>

          <h2>Where it&rsquo;s kept</h2>
          <p>
            Your data is stored with Supabase in [region]. The app is hosted on [host]. Sign-in emails are sent through
            [email provider]. These services process data only to run White Blazes.
          </p>

          <h2>Getting your data, or deleting it</h2>
          <p>
            In <Link href="/settings">Settings</Link> you can download every hike as a spreadsheet, or delete your account.
            Deleting removes your login, hikes, photo and share link straight away, and it can&rsquo;t be undone.
          </p>

          <h2>Questions</h2>
          <p>Email [contact email].</p>
        </article>
      </main>
      <Footer />
    </div>
  );
}
