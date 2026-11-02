import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase environment variables are missing.");
}

// A request that hangs (a dropped connection, a stalled network) would
// otherwise leave the page saying "Loading..." forever. Giving up after
// this long turns it into an ordinary error, which pages show with a
// "Try again" button.
const REQUEST_TIMEOUT_MS = 15_000;

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = init?.signal
    ? AbortSignal.any([init.signal, timeout])
    : timeout;
  try {
    return await fetch(input, { ...init, signal });
  } catch (error) {
    // Reported as an AbortError so supabase-js gives up straight away
    // rather than retrying a timed-out request three more times.
    if (timeout.aborted) {
      throw new DOMException("The request timed out.", "AbortError");
    }
    throw error;
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchWithTimeout },
});
