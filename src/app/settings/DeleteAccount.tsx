"use client";

import { useActionState, useState } from "react";
import { deleteAccount, type DeleteState } from "./actions";

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [state, action, pending] = useActionState<DeleteState, FormData>(deleteAccount, {});

  if (!open) {
    return (
      <button type="button" className="danger" onClick={() => setOpen(true)}>
        Delete my account
      </button>
    );
  }

  return (
    <form action={action} className="delete-confirm">
      <p>
        This deletes your login, every hike, your photo and your share link. It can&rsquo;t be undone. Download your
        data first if you want a copy.
      </p>
      <label htmlFor="confirm">
        Type <strong>delete</strong> to confirm
      </label>
      <input id="confirm" name="confirm" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
      {state.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}
      <div className="actions">
        <button type="submit" className="danger" disabled={pending || typed.trim().toLowerCase() !== "delete"}>
          {pending ? "Deleting…" : "Delete everything"}
        </button>
        <button type="button" className="secondary" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
