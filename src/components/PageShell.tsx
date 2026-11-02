import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import { SiteHeader, HeaderTitle, type Tab } from "./SiteHeader";
import { Footer } from "./Footer";

/**
 * The frame for inner pages: the slim forest header with the page title,
 * then the page's content in a card (or several, with `bare`).
 */
export async function PageShell({
  title,
  eyebrow,
  tab = "none",
  wide = false,
  bare = false,
  children,
}: {
  title: string;
  eyebrow?: string;
  tab?: Tab;
  wide?: boolean;
  /** Children bring their own cards. */
  bare?: boolean;
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const viewer = await getViewer(supabase, user);

  return (
    <div className="page">
      <SiteHeader active={tab} name={viewer.name} photo={viewer.photo}>
        <HeaderTitle eyebrow={eyebrow} title={title} />
      </SiteHeader>
      <main className={wide ? "content content-inner" : "content content-inner narrow"}>
        {bare ? children : <section className="card">{children}</section>}
      </main>
      <Footer />
    </div>
  );
}
