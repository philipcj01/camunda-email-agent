"use client";
import { Amplify } from "aws-amplify";

let configured = false;

export function configureAmplify() {
  if (configured) return;
  configured = true;

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? "",
        userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "",
        loginWith: {
          oauth: {
            domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? "",
            scopes: ["openid", "email", "profile"],
            redirectSignIn: [process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"],
            redirectSignOut: [process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"],
            responseType: "code",
          },
        },
      },
    },
  });
}
