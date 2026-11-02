import { ImageResponse } from "next/og";

// The preview image shown when a link to the site is shared.
export const alt = "Tenant Voice NS: renters helping renters in Nova Scotia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#F6F6EE",
          color: "#294B3A",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
          <svg width="120" height="120" viewBox="0 0 64 64">
            <rect width="64" height="64" rx="14" fill="#08873A" />
            <g
              transform="translate(14 13.5) scale(1.5)"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
              <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </g>
          </svg>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 80, fontWeight: 700 }}>tenant voice</div>
            <div style={{ fontSize: 30, color: "#547160", letterSpacing: 2 }}>
              NOVA SCOTIA · RENTERS HELPING RENTERS
            </div>
          </div>
        </div>
        <div style={{ marginTop: 64, fontSize: 48, fontWeight: 700, maxWidth: 950 }}>
          Renting is personal. Your research should be, too.
        </div>
      </div>
    ),
    size
  );
}
