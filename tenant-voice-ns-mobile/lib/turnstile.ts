import type { CSSProperties } from "react";

// Shown when someone presses Submit before the Cloudflare security check
// has a result. That happens both while it is still working on its own
// and while it waits for a "Verify you are human" tick, so the wording
// covers both.
export const TURNSTILE_INCOMPLETE_MESSAGE =
  "Please complete the security check above (tick the box if you see one), then press Submit again.";

// Used with `size: "flexible"`, which makes the security check fill its
// container instead of a fixed 300px that stuck out of the page on
// 320px-wide phones. The widget library also gives the box a 300px minimum
// width; this removes it. Cloudflare documents its own 300px minimum for
// the flexible widget, so on the narrowest phones anything wider than the
// box is clipped on the right (Cloudflare's logo side; the checkbox is on
// the left) instead of making the whole page scroll sideways.
export const FLEXIBLE_TURNSTILE_STYLE: CSSProperties = {
  minWidth: 0,
  maxWidth: "100%",
  overflow: "hidden",
};
