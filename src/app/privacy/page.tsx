import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Forest } from "@/components/Forest";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = { title: "Privacy policy · White Blazes" };

// Change this whenever the policy changes.
const UPDATED = "November 7, 2026";

// Written in plain language for a small personal project. It hasn't been
// reviewed by a lawyer; worth doing if White Blazes grows or ever charges.
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
          <p className="eyebrow">Last updated {UPDATED}</p>
          <h1>Privacy policy</h1>
        </div>
      </header>

      <main className="content content-inner narrow">
        <article className="card prose">
          <p>
            White Blazes is a personal project by Niki Fereidooni for tracking
            hikes on the Bruce Trail. This page explains what it stores about
            you, who can see it, and how to get it back or delete it.
          </p>

          <h2>What we store</h2>
          <ul>
            <li>
              <strong>Your email address</strong>, to sign you in. If you sign
              in with Google, we also get the name on your Google account, which
              becomes your display name until you change it.
            </li>
            <li>
              <strong>Your hikes</strong>: date, name, distance, which stretches
              of the trail they covered (as km ranges), and any details you add,
              such as notes, who you hiked with, hike leaders, start and end
              points, and links.
            </li>
            <li>
              <strong>Your profile</strong>: display name, goal, home clubs, gap
              setting and, if you add one, a profile photo.
            </li>
            <li>
              <strong>Whether you asked to hear about Strava sync.</strong> If
              you did, we&rsquo;ll email you once when it&rsquo;s ready. You can
              leave the list on the import page at any time.
            </li>
          </ul>

          <h2>What we don&rsquo;t store</h2>
          <ul>
            <li>
              <strong>GPS tracks.</strong> GPX files and Strava archives are
              read in your browser. Only the trail km they matched and a
              fingerprint (used to catch duplicates) are saved. The files and
              their GPS points never leave your device.
            </li>
            <li>
              <strong>Passwords.</strong> There aren&rsquo;t any. You sign in
              with Google or an emailed link.
            </li>
            <li>
              <strong>Tracking.</strong> No advertising, analytics or tracking
              of any kind.
            </li>
          </ul>

          <h2>Cookies</h2>
          <p>
            White Blazes only uses cookies that sign-in needs. There are no
            advertising, analytics or third-party cookies, so there&rsquo;s
            nothing to opt out of.
          </p>
          <ul>
            <li>
              <strong>Your session</strong> (named{" "}
              <code>sb-&hellip;-auth-token</code>) keeps you signed in.
              It&rsquo;s removed when you sign out.
            </li>
            <li>
              <strong>A one-time sign-in check</strong> (
              <code>sb-&hellip;-auth-token-code-verifier</code>) is set while
              you&rsquo;re signing in, so that when Google or an email link
              sends you back, the app can confirm it&rsquo;s the same browser
              that started.
            </li>
          </ul>

          <h2>Who can see it</h2>
          <p>
            Only you. The database checks every request against your login, so
            other people using White Blazes can&rsquo;t read your hikes.
          </p>
          <p>
            If you turn on your share link, anyone with the link can see your km
            per section and a map of the stretches you&rsquo;ve covered. They
            can&rsquo;t see your individual hikes, dates, notes or start points.
            Your photo and goal appear there only if you choose. Turning the
            link off hides the page.
          </p>

          <h2>Where it&rsquo;s kept, and who helps run it</h2>
          <ul>
            <li>
              <strong>Supabase</strong> stores your data and handles sign-in.
              The database is in Canada (Montréal).
            </li>
            <li>
              <strong>Vercel</strong> hosts the website. Your requests pass
              through its servers, which may be outside Canada.
            </li>
            <li>
              <strong>Google</strong>, if you choose to sign in with Google.
              Google tells us your name and email address.
            </li>
            <li>
              <strong>OpenFreeMap</strong> supplies the map background. Like any
              website, it sees your IP address and which part of the map
              you&rsquo;re looking at, but nothing about you or your hikes.
            </li>
          </ul>
          <p>
            These services only process data to run White Blazes. Nothing is
            sold or shared for any other purpose.
          </p>

          <h2>Getting your data, or deleting it</h2>
          <p>
            In <Link href="/settings">Settings</Link> you can download every
            hike as a spreadsheet, or delete your account. Deleting removes your
            login, hikes, photo and share link straight away, and it can&rsquo;t
            be undone.
          </p>

          <h2>Questions</h2>
          <p>
            Email <a href="mailto:codebyniki@gmail.com">codebyniki@gmail.com</a>
            . If this policy changes, the date at the top will change too.
          </p>
        </article>
      </main>
      <Footer />
    </div>
  );
}
