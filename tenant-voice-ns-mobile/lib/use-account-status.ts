"use client";

import { useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";
import { isModeratorEmail } from "@/lib/moderator";
import { supabase } from "@/lib/supabase";

export type AccountStatus = {
  signedIn: boolean;
  isModerator: boolean;
  // Reviews waiting for moderation; null unless the moderator is signed
  // in and the count has loaded.
  pendingCount: number | null;
};

const signedOut: AccountStatus = {
  signedIn: false,
  isModerator: false,
  pendingCount: null,
};

// One copy shared by every component that asks (the header and footer
// navigation both do), so there's one sign-in listener and one count
// request rather than one per copy.
let status: AccountStatus = signedOut;
let session: Session | null = null;
let started = false;
const listeners = new Set<() => void>();

function setStatus(next: AccountStatus) {
  status = next;
  listeners.forEach((listener) => listener());
}

async function loadPendingCount() {
  if (!session || !isModeratorEmail(session.user.email)) {
    return;
  }
  const { count, error } = await supabase
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) {
    console.error("Could not count pending reviews.", error.code);
    return;
  }
  if (session && isModeratorEmail(session.user.email)) {
    setStatus({ ...status, pendingCount: count ?? 0 });
  }
}

function applySession(next: Session | null) {
  session = next;
  if (!next) {
    setStatus(signedOut);
    return;
  }
  const isModerator = isModeratorEmail(next.user.email);
  setStatus({
    signedIn: true,
    isModerator,
    pendingCount: isModerator ? status.pendingCount : null,
  });
  void loadPendingCount();
}

function start() {
  if (started) {
    return;
  }
  started = true;
  void supabase.auth.getSession().then(({ data }) => applySession(data.session));
  supabase.auth.onAuthStateChange((event, next) => {
    // Token refreshes don't change who is signed in.
    if (event !== "TOKEN_REFRESHED") {
      applySession(next);
    }
  });
  // Coming back to the tab picks up reviews submitted in the meantime.
  window.addEventListener("focus", () => void loadPendingCount());
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Who is signed in, and for the moderator, how many reviews are waiting.
export function useAccountStatus() {
  return useSyncExternalStore(subscribe, () => status, () => signedOut);
}

// Call after approving or rejecting a review so the badge updates.
export function refreshPendingCount() {
  void loadPendingCount();
}
