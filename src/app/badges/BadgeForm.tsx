"use client";

import { useActionState } from "react";
import { markBadge, removeBadge, type BadgeState } from "./actions";

const monthYear = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-CA", { month: "long", year: "numeric" });

/**
 * The badge block on the Map tab's section panel: record that the club sent
 * you the badge, change the date, or take it back off.
 */
export function BadgeForm({
  sectionId,
  sectionName,
  complete,
  receivedOn,
  today,
}: {
  sectionId: number;
  sectionName: string;
  complete: boolean;
  receivedOn: string | null;
  today: string;
}) {
  const [state, action, pending] = useActionState<BadgeState, FormData>(markBadge, {});

  if (receivedOn) {
    return (
      <div className="badge-block wb-gold" id="badge">
        <p className="badge-block-title">{sectionName} end to end badge</p>
        <p>Received {monthYear(receivedOn)}. It shows in gold on your home page and share page.</p>
        <details className="badge-edit">
          <summary>Change the date or remove it</summary>
          <form action={action} className="badge-date">
            <input type="hidden" name="section_id" value={sectionId} />
            <label htmlFor="received_on">Received on</label>
            <input id="received_on" name="received_on" type="date" max={today} defaultValue={receivedOn} required />
            <button type="submit" className="secondary" disabled={pending}>
              Save date
            </button>
          </form>
          <form action={removeBadge}>
            <input type="hidden" name="section_id" value={sectionId} />
            <button type="submit" className="link-button">
              Remove the badge
            </button>
          </form>
        </details>
        {state.error && (
          <p className="error" role="alert">
            {state.error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={complete ? "badge-block badge-block-ready" : "badge-block"} id="badge">
      <p className="badge-block-title">{complete ? "Section complete. Apply for your badge" : "Already have this badge?"}</p>
      <p className="muted">
        {complete
          ? "Send your trail log to the club. When the badge arrives, record it here."
          : "If you earned it before using White Blazes, you can record it now."}
      </p>
      <form action={action} className="badge-date">
        <input type="hidden" name="section_id" value={sectionId} />
        <label htmlFor="received_on">Received on</label>
        <input id="received_on" name="received_on" type="date" max={today} defaultValue={today} required />
        <button type="submit" className={complete ? "primary" : "secondary"} disabled={pending}>
          {pending ? "Saving…" : "I've received it"}
        </button>
      </form>
      {state.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}
    </div>
  );
}
