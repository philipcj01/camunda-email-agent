import { ImageResponse } from "next/og";

export const alt = "Camunda Email Agent — multi-tenant AI agents on Camunda 8 SaaS";
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
          backgroundColor: "#0a0a0f",
          backgroundImage:
            "radial-gradient(ellipse at top left, #1e1b4b 0%, #0a0a0f 60%)",
          color: "white",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 16,
              background: "linear-gradient(135deg, #5b6cf2 0%, #7c3aed 100%)",
            }}
          >
            <svg
              width="38"
              height="38"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m21 2-9.6 9.6" />
              <circle cx="7.5" cy="15.5" r="5.5" />
            </svg>
          </div>
          <span style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.5 }}>
            Camunda Email Agent
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 1.05,
              maxWidth: 980,
            }}
          >
            Configure AI email agents. Deploy to Camunda 8 SaaS.
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#a1a1aa",
              maxWidth: 900,
              lineHeight: 1.3,
            }}
          >
            Prompts, guardrails, tools, knowledge — all editable in a polished UI.
            One click ships your tenant&apos;s BPMN process.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 20,
            color: "#71717a",
          }}
        >
          <span>Next.js</span>
          <span style={{ color: "#3f3f46" }}>·</span>
          <span>AWS CDK</span>
          <span style={{ color: "#3f3f46" }}>·</span>
          <span>Cognito</span>
          <span style={{ color: "#3f3f46" }}>·</span>
          <span>DynamoDB</span>
          <span style={{ color: "#3f3f46" }}>·</span>
          <span>Bedrock</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
