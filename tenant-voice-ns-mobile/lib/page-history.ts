// Remembers the in-app pages visited in this tab, so "Back to ..." links can
// name the previous page and return to it with its search or draft intact.
// Kept in sessionStorage so it survives a reload of the current tab.

export type HistoryEntry = {
  url: string;
  label: string;
};

const STORAGE_KEY = "tv:page-history";
const MAX_ENTRIES = 50;

// Labels pages have registered for themselves (e.g. a property's name),
// keyed by pathname.
const registeredLabels = new Map<string, string>();

// Set by a popstate (browser back/forward or a BackLink) until the tracker
// has handled the resulting page change.
let arrivedByHistory = false;

export function readHistory(): HistoryEntry[] {
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function writeHistory(entries: HistoryEntry[]) {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(entries.slice(-MAX_ENTRIES))
    );
  } catch {
    // Storage can be unavailable (private mode); back links fall back.
  }
}

export function markHistoryNavigation() {
  arrivedByHistory = true;
}

export function registerPageLabel(pathname: string, label: string) {
  registeredLabels.set(pathname, label);
  writeHistory(
    readHistory().map((entry) =>
      pathnameOf(entry.url) === pathname ? { ...entry, label } : entry
    )
  );
}

// Called on every page change with the new URL.
export function recordPage(url: string) {
  const entries = readHistory();
  const label = labelFor(url);
  const top = entries[entries.length - 1];

  if (arrivedByHistory) {
    arrivedByHistory = false;
    const index = entries.map((entry) => entry.url).lastIndexOf(url);
    if (index !== -1) {
      writeHistory(entries.slice(0, index + 1));
      return;
    }
  }

  if (top?.url === url) {
    return;
  }

  // Same page with a new query (typing in Discover search) replaces the
  // entry, matching the router.replace the page uses.
  if (top && pathnameOf(top.url) === pathnameOf(url) && pathnameOf(url) === "/") {
    entries[entries.length - 1] = { url, label };
  } else {
    entries.push({ url, label });
  }
  writeHistory(entries);
}

function labelFor(url: string) {
  const pathname = pathnameOf(url);
  const registered = registeredLabels.get(pathname);
  if (registered) {
    return registered;
  }
  if (pathname === "/") {
    return new URL(url, "http://local").searchParams.get("q")
      ? "search results"
      : "Discover";
  }
  if (pathname === "/submit-review") return "your review";
  if (pathname === "/policies") return "Policies";
  if (pathname === "/account") return "your account";
  if (pathname === "/admin") return "moderation";
  if (pathname.startsWith("/properties/")) return "property";
  return "previous page";
}

function pathnameOf(url: string) {
  return url.split(/[?#]/)[0];
}
