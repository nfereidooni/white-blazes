"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "./Avatar";

/**
 * Your avatar in the header. It opens a small menu with Settings and Sign
 * out. Closes on Escape, on a click outside, or after choosing.
 */
export function AccountMenu({ name, photo }: { name: string; photo: string | null }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="account-menu" ref={box}>
      <button
        ref={button}
        type="button"
        className="avatar-link"
        aria-label={`Account menu for ${name}`}
        aria-expanded={open}
        aria-controls="account-menu-list"
        onClick={() => setOpen((o) => !o)}
      >
        <Avatar url={photo} name={name} size={44} />
      </button>
      {open && (
        <div id="account-menu-list" className="account-list">
          <p className="account-who">{name}</p>
          <Link href="/settings" onClick={() => setOpen(false)}>
            Settings
          </Link>
          <form action="/auth/signout" method="post">
            <button type="submit">Sign out</button>
          </form>
        </div>
      )}
    </div>
  );
}
