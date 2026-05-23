"use client";
import { useEffect, useState } from "react";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { configureAmplify } from "@/lib/amplify";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    configureAmplify();
    setReady(true);
  }, []);
  if (!ready) return null;
  return (
    <Authenticator hideSignUp={false}>
      {() => <>{children}</>}
    </Authenticator>
  );
}
