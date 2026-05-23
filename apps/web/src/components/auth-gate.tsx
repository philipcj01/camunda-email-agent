"use client";
import { useEffect, useState } from "react";
import { Authenticator, ThemeProvider, defaultDarkModeOverride } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import "@/styles/amplify-overrides.css";
import { configureAmplify } from "@/lib/amplify";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    configureAmplify();
    setReady(true);
  }, []);
  if (!ready) return null;

  return (
    <ThemeProvider
      colorMode="system"
      theme={{
        name: "sable",
        overrides: [defaultDarkModeOverride],
        tokens: {
          colors: {
            brand: {
              primary: { 10: { value: "#fafafa" }, 80: { value: "#18181b" }, 90: { value: "#09090b" }, 100: { value: "#000000" } },
            },
          },
          radii: {
            small: { value: "10px" },
            medium: { value: "14px" },
            large: { value: "18px" },
          },
        },
      }}
    >
      <Authenticator.Provider>
        <Authenticator
          hideSignUp={false}
          components={{
            Header: () => (
              <div className="flex flex-col items-center gap-1 pb-6 text-center">
                <div className="text-lg font-semibold tracking-tight">Sable</div>
                <div className="text-[12px] text-[var(--color-muted-foreground)]">
                  Sign in to manage your tenant
                </div>
              </div>
            ),
          }}
        >
          {() => <>{children}</>}
        </Authenticator>
      </Authenticator.Provider>
    </ThemeProvider>
  );
}
