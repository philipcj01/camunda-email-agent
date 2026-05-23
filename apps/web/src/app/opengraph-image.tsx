import { ImageResponse } from "next/og";

export const alt = "Sable — Email Agents for the Enterprise";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          backgroundColor: "#09090b",
          color: "white",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Hairline inset frame */}
        <div
          style={{
            position: "absolute",
            inset: 24,
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 28,
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 14,
              backgroundColor: "#fafafa",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#09090b"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m21 2-9.6 9.6" />
              <circle cx="7.5" cy="15.5" r="5.5" />
            </svg>
          </div>
          <span style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.3 }}>
            Sable
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 96,
              fontWeight: 600,
              letterSpacing: -4,
              lineHeight: 0.98,
              maxWidth: 1040,
            }}
          >
            Email Agents
          </div>
          <div
            style={{
              fontSize: 96,
              fontWeight: 600,
              letterSpacing: -4,
              lineHeight: 0.98,
              color: "#71717a",
              maxWidth: 1040,
            }}
          >
            for the Enterprise.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 18,
            color: "#a1a1aa",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span>Configure</span>
            <span style={{ color: "#27272a" }}>·</span>
            <span>Deploy</span>
            <span style={{ color: "#27272a" }}>·</span>
            <span>Reply</span>
          </div>
          <div style={{ color: "#52525b" }}>Multi-tenant by design</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
